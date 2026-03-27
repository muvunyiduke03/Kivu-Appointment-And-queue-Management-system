from flask_login import UserMixin
from datetime import datetime, time
from .extensions import db


class Users(UserMixin, db.Model):
  __tablename__ = "users"

  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(120), nullable=False)
  email = db.Column(db.String(120), unique=True, nullable=False)
  password_hash = db.Column(db.String(255), nullable=False)
  role = db.Column(db.Enum("patient", "admin"), default="patient", nullable=False)
  created_at = db.Column(db.DateTime, default=datetime.utcnow)

  appointments = db.relationship("Appointment", backref="patient", lazy=True)


class Appointment(db.Model):
  __tablename__ = "appointments"
  
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

  appointment_date = db.Column(db.Date, nullable=False)
  appointment_time = db.Column(db.Time, nullable=False, default=lambda: time(hour=8, minute=0))
  reason= db.Column(db.Text, nullable=True)

  queue_number = db.Column(db.Integer, nullable=False)
  status = db.Column(
    db.Enum("pending", "served", "cancelled"),
    default="pending",
    nullable=False
  )

  created_at = db.Column(db.DateTime, default=datetime.utcnow)

  audit_logs = db.relationship("AuditLog", backref="Appointment", lazy=True)

  __table_args__ = (
    db.UniqueConstraint("appointment_date", "queue_number", name="uq_queue_per_day"),
  )


class AdminAvailabilityDay(db.Model):
  __tablename__ = "admin_availability_days"

  id = db.Column(db.Integer, primary_key=True)
  weekday = db.Column(
    db.Enum("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"),
    nullable=False,
    unique=True,
  )
  is_enabled = db.Column(db.Boolean, nullable=False, default=False)
  updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(db.Model):
  __tablename__ = "audit_logs"

  id = db.Column(db.Integer, primary_key=True)

  apt_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), nullable=False)
  performed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

  action = db.Column(db.Enum("CREATE", "UPDATE_STATUS", "CANCEL"), nullable=False)
  old_status = db.Column(db.String(255), nullable=True)
  new_status = db.Column(db.String(255), nullable=True)

  performed_at = db.Column(db.DateTime, default=datetime.utcnow)
  ip_address = db.Column(db.String(45), nullable=True)
  notes = db.Column(db.Text, nullable=True)

  admin = db.relationship("Users", foreign_keys=[performed_by])
