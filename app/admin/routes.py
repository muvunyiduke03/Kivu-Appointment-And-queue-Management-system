from datetime import datetime, date
from flask import request, jsonify
from flask_login import login_required, current_user

from . import admin_bp
from ..extensions import db
from ..models import Appointment, AuditLog


def appointment_payload(appointment: Appointment):
  return {
    "id": appointment.id,
    "user_id": appointment.user_id,
    "patient_name": appointment.patient.name if appointment.patient else None,
    "patient_email": appointment.patient.email if appointment.patient else None,
    "appointment_date": appointment.appointment_date.isoformat(),
    "reason": appointment.reason,
    "queue_number": appointment.queue_number,
    "status": appointment.status,
    "created_at": appointment.created_at.isoformat() if appointment.created_at else None
  }

def admin_required():
  if not current_user.is_authenticated:
    return jsonify({
      "success": False,
      "message": "Authentication required."
    }), 401
  
  if current_user.role != "admin":
    return jsonify({
      "success": False,
      "message": "Only admins can access this resource."
    }), 403
  
  return None

@admin_bp.get("/appointments/queue")
@login_required
def view_daily_queue():
  auth_error = admin_required()
  if auth_error:
    return auth_error
  
  appointment_date_raw = (request.args.get("appointment_date") or "").strip()

  if appointment_date_raw:
    try:
      appointment_date = datetime.strptime(appointment_date_raw, "%Y-%m-%d").date()
    except ValueError:
      return jsonify({
        "success": False,
        "message": "Invalid date format. Use YYYY-MM-DD"
      }), 400
  else:
    appointment_date = date.today()
  
  appointments = Appointment.query.filter_by(
    appointment_date=appointment_date
  ).order_by(Appointment.queue_number.asc()).all()

  return jsonify({
    "success": True,
    "date": appointment_date.isoformat(),
    "count": len(appointments),
    "appointments": [appointment_payload(appointment) for appointment in appointments]
  }), 200

@admin_bp.put("/appointments/<int:appointment_id>/status")
@login_required
def update_appointment_status(appointment_id):
  auth_error = admin_required()
  if auth_error:
    return auth_error
  
  appointment = Appointment.query.get(appointment_id)
  if not appointment:
    return jsonify({
      "success": False,
      "message": "Appointment not found."
    }), 404
  
  data = request.get_json(silent=True) or {}
  new_status = (data.get("status") or "").strip().lower()

  allowed_statuses = {"pending", "served", "cancelled"}
  if new_status not in allowed_statuses:
    return jsonify({
      "success": False,
      "message": "Invalid status. Use 'pending', 'served' or 'cancelled'."
    }), 400
  
  old_status = appointment.status

  if old_status == new_status:
    return jsonify({
      "success": False,
      "message": f"Appointment is already {new_status}."
    }), 400
  
  appointment.status = new_status

  audit = AuditLog(
    apt_id=appointment.id,
    performed_by=current_user.id,
    action="CANCEL" if new_status == "cancelled" else "UPDATE_STATUS",
    old_status=old_status,
    new_status=new_status,
    notes=f"Admin changes appointment status from {old_status} to {new_status}."
  )

  db.session.add(audit)
  db.session.commit()

  return jsonify({
    "success": True,
    "message": "Appointment status updated successfully.",
    "data": appointment_payload(appointment)
  }), 200

@admin_bp.get("/dashboard-summary")
@login_required
def dashboard_summary():
  auth_error = admin_required()
  if auth_error:
    return auth_error
  
  today = date.today()

  total = Appointment.query.filter_by(appointment_date=today).count()
  pending = Appointment.query.filter_by(appointment_date=today, status="pending").count()
  served = Appointment.query.filter_by(appointment_date=today, status="served").count()
  cancelled = Appointment.query.filter_by(appointment_date=today, status="cancelled").count()

  next_pending = Appointment.query.filter_by(
    appointment_date=today,
    status="pending"
  ).order_by(Appointment.queue_number.asc()).first()

  return jsonify({
    "success": True,
    "data": {
      "date": today.isoformat(),
      "total_appointments": total,
      "pending_appointments": pending,
      "served_appointments": served,
      "cancelled_appointments": cancelled,
      "next_queue_number": next_pending.queue_number if next_pending else None,
      "next_patient_name": next_pending.patient.name if next_pending and next_pending.patient else None
    }
  }), 200

@admin_bp.put("/appointments/serve-next")
@login_required
def serve_next_patient():
  auth_error = admin_required()
  if auth_error:
    return auth_error
  
  today = date.today()

  next_appointment = Appointment.query.filter_by(
    appointment_date=today,
    status="pending"
  ).order_by(Appointment.queue_number.asc()).first()

  if not next_appointment:
    return jsonify({
      "success": False,
      "message": "No pending appointments in today's queue"
    }), 404
  
  old_status = next_appointment.status
  next_appointment.status = "served"

  audit = AuditLog(
    apt_id=next_appointment.id,
    performed_by=current_user.id,
    action="UPDATE_STATUS",
    old_status=old_status,
    new_status="served",
    notes="Admin served the next patient in the queue."
  )

  db.session.add(audit)
  db.session.commit()

  return jsonify({
    "success": True,
    "message": "Next patient served successfully.",
    "data": appointment_payload(next_appointment)
  }), 200


@admin_bp.get("/appointments/<int:appointment_id>")
@login_required
def get_appointment_details(appointment_id):
  auth_error = admin_required()
  if auth_error:
    return auth_error
  
  appointment = Appointment.query.get(appointment_id)
  if not appointment:
    return jsonify({
      "success": False,
      "message": "Appointment not found."
    }), 404
  
  return jsonify({
    "success": True,
    "data": appointment_payload(appointment)
  }), 200


@admin_bp.get("/audit-logs")
@login_required
def view_audit_logs():
  auth_error = admin_required()
  if auth_error:
    return auth_error
  
  logs = AuditLog.query.order_by(AuditLog.performed_at.desc()).all()

  data = []
  for log in logs:
    data.append({
      "id": log.id,
      "appointment_id": log.apt_id,
      "performed_by": log.performed_by,
      "admin_name": log.admin.name if log.admin else None,
      "action": log.action,
      "old_status": log.old_status,
      "new_status": log.new_status,
      "performed_at": log.performed_at.isoformat() if log.performed_at else None,
      "ip_address": log.ip_address,
      "notes": log.notes
    })

  return jsonify({
    "success": True,
    "count": len(data),
    "data": data
  }), 200