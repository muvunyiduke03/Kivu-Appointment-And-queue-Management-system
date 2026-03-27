from flask import request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, date, time, timedelta
from . import api_bp
from ..extensions import db
from ..models import Appointment, AuditLog, AdminAvailabilityDay


DEFAULT_START_TIME = time(hour=8, minute=0)
SLOT_DURATION_MINUTES = 30
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def get_enabled_days_set():
  configured_days = AdminAvailabilityDay.query.filter_by(is_enabled=True).all()
  if not configured_days:
    return set(WEEKDAYS)
  return {day.weekday for day in configured_days}


def get_appointment_time_for_queue(queue_number: int):
  start_at = datetime.combine(date.today(), DEFAULT_START_TIME)
  slot = start_at + timedelta(minutes=(queue_number - 1) * SLOT_DURATION_MINUTES)
  return slot.time().replace(second=0, microsecond=0)


def appointment_payload(appointment: Appointment):
  return {
    "id": appointment.id,
    "user_id": appointment.user_id,
    "appointment_date": appointment.appointment_date.isoformat(),
    "appointment_time": appointment.appointment_time.strftime("%H:%M") if appointment.appointment_time else None,
    "reason": appointment.reason,
    "queue_number": appointment.queue_number,
    "status": appointment.status,
  }


@api_bp.post("/appointments/book")
@login_required
def book_appointment():
  if current_user.role != "patient":
    return jsonify({
      "success": False,
      "message": "Only patients can book appointments."
    }), 403
  
  data = request.get_json(silent=True) or {}

  appointment_date_raw = (data.get("appointment_date") or "").strip()
  reason = (data.get("reason") or "").strip()

  if not appointment_date_raw:
    return jsonify({
      "success": False,
      "message": "appointment date is required."
    }), 400
  
  try:
    appointment_date = datetime.strptime(appointment_date_raw, "%Y-%m-%d").date()
  except ValueError:
    return jsonify({
      "success": False,
      "message": "Invalid date format. use YYYY-MM-DD"
    }), 400
  
  if appointment_date < date.today():
    return jsonify({
      "success": False,
      "message": "Appointment date cannot be in the past."
    }), 400
  
  enabled_days = get_enabled_days_set()
  day_name = appointment_date.strftime("%A").lower()
  if day_name not in enabled_days:
    allowed_days = ", ".join(day.capitalize() for day in sorted(enabled_days, key=WEEKDAYS.index))
    return jsonify({
      "success": False,
      "message": f"Appointments are not available on {day_name.capitalize()}.allwed days: {allowed_days}."
    }), 400
  
  last = Appointment.query.filter_by(
    appointment_date=appointment_date
  ).order_by(Appointment.queue_number.desc()).first()

  next_queue = 1 if not last else last.queue_number + 1
  appointment_time = get_appointment_time_for_queue(next_queue)

  appointment = Appointment(
    user_id=current_user.id,
    appointment_date=appointment_date,
    appointment_time=appointment_time,
    reason=reason,
    queue_number=next_queue
  )

  db.session.add(appointment)
  db.session.flush()

  audit = AuditLog(
    apt_id=appointment.id,
    performed_by=current_user.id,
    action="CREATE",
    new_status="pending",
    notes=f"Appointment booked for {appointment_date.isoformat()} at {appointment_time.strftime('%H:%M')}"
  )

  db.session.add(audit)
  db.session.commit()

  return jsonify({
    "success": True,
    "message": "Appointment booked successfully.",
    "data": appointment_payload(appointment)
  }), 201


@api_bp.get("/appointments/my")
@login_required
def my_appointments():
  appointments = Appointment.query.filter_by(
    user_id=current_user.id
  ).order_by(Appointment.appointment_date.asc(), Appointment.queue_number.asc()).all()

  return jsonify({
    "success": True,
    "data": [appointment_payload(appointment) for appointment in appointments]
  }), 200


@api_bp.put("/appointments/<int:appointment_id>/cancel")
@login_required
def cancel_appointment(appointment_id):
  appointment = Appointment.query.get(appointment_id)

  if not appointment:
    return jsonify({
      "success": False,
      "message": "Appointment not found."
    }), 404
  
  if appointment.user_id != current_user.id and current_user.role != "admin":
    return jsonify({
      "success": False,
      "message": "You are not allowed to cancel this appointment."
    }), 403
  
  if appointment.status == "cancelled":
    return jsonify({
      "success": False,
      "message": "Appointment is already cancelled."
    }), 400
  
  old_status = appointment.status
  appointment.status = "cancelled"

  audit = AuditLog(
    apt_id=appointment_id,
    performed_by=current_user.id,
    action="CANCEL",
    old_status=old_status,
    new_status="cancelled"
  )

  db.session.add(audit)
  db.session.commit()

  return jsonify({
    "success": True,
    "message": "Appointment cancelled successfully.",
    "data": appointment_payload(appointment)
  }), 200