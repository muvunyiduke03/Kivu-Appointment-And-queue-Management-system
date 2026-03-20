import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import date, timedelta
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import Users, Appointment

class testConfig:
  TESTING = True
  SECRET_KEY = "test-secret-key"
  SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  WTF_CSRF_ENABLED = False
  ADMIN_CODE = "admin123"

@pytest.fixture
def app():
  app = create_app(testConfig)

  with app.app_context():
    db.drop_all()
    db.create_all()
    yield app
    db.session.remove()
    db.drop_all()

@pytest.fixture
def client(app):
  return app.test_client()

@pytest.fixture
def patient_user(app):
  with app.app_context():
    user = Users(
      name="Test Patient",
      email="patient@gmail.com",
      password_hash=generate_password_hash("Patient123!"),
      role="patient"
    )
    db.session.add(user)
    db.session.commit()
    return user
  
@pytest.fixture
def admin_user(app):
  with app.app_context():
    user = Users(
      name="Hospital Admin",
      email="admin@hospital.com",
      password_hash=generate_password_hash("Hoadmin123$"),
      role="admin"
    )
    db.session.add(user)
    db.session.commit()
    return user

def login(client, email, password):
  return client.post(
    "/api/auth/login",
    json={
      "email": email,
      "password": password
    }
  )

def test_register_patient(client):
  response = client.post(
    "/api/auth/register",
    json={
      "name": "Kamanzi Junior",
      "email": "kamanzijunior@gmail.com",
      "password": "Kjunior123!"
    }
  )

  assert response.status_code == 201
  data = response.get_json()
  assert data["success"] is True
  assert data["data"]["email"] == "kamanzijunior@gmail.com"
  assert data["data"]["role"] == "patient"

def test_register_admin(client):
  response = client.post(
    "/api/auth/register",
    json={
      "name": "Admin",
      "email": "admin2@hospital.com",
      "password": "Admin123$",
      "admin_code": "admin123"
    }
  )

  assert response.status_code == 201
  data = response.get_json()
  assert data["success"] is True
  assert data["data"]["role"] == "admin"

def test_login_success(client, patient_user):
  response = login(client, "patient@gmail.com", "Patient123!")

  assert response.status_code == 200
  data = response.get_json()
  assert data["success"] is True
  assert data["data"]["email"] == "patient@gmail.com"

def test_login_fail_wrongPassword(client, patient_user):
  response = login(client, "patient@gmail.com", "wrongpass")
  assert response.status_code == 401
  data = response.get_json()
  assert data["success"] is False

def test_book_appointment(client, patient_user):
  login(client, "patient@gmail.com", "Patient123!")

  future_date = (date.today() + timedelta(days=1)).isoformat()

  response = client.post(
    "/api/appointments/book",
    json={
      "appointment_date": future_date,
      "reason": "General checkup"
    }
  )

  assert response.status_code == 201
  data = response.get_json()
  assert data["success"] is True
  assert data["data"]["appointment_date"] == future_date
  assert data["data"]["queue_number"] == 1
  assert data["data"]["status"] == "pending"

def test_view_my_appointments(client, patient_user):
  login(client, "patient@gmail.com", "Patient123!")
  future_date = (date.today() + timedelta(days=1)).isoformat()

  client.post(
    "/api/appointments/book",
    json={
      "appointment_date": future_date,
      "reason": "Headache"
    }
  )

  response = client.get("/api/appointments/my")

  assert response.status_code == 200
  data = response.get_json()
  assert data["success"] is True
  assert len(data["data"]) == 1
  assert data["data"][0]["reason"] == "Headache"

def test_cancel_appointment(client, patient_user, app):
  login(client, "patient@gmail.com", "Patient123!")

  future_date = (date.today() + timedelta(days=1)).isoformat()

  book_response = client.post(
    "/api/appointments/book",
    json={
      "appointment_date": future_date,
      "reason": "Fever"
    }
  )

  appointment_id = book_response.get_json()["data"]["id"]
  response = client.put(f"/api/appointments/{appointment_id}/cancel")

  assert response.status_code == 200
  data = response.get_json()
  assert data["success"] is True
  assert data["data"]["status"] == "cancelled"

def test_patient_not_access_admin_queue(client, patient_user):
  login(client, "patient@gmail.com", "Patient123!")
  response = client.get("/admin/appointments/queue")
  assert response.status_code == 403
  data = response.get_json()
  assert data["success"] is False

def test_admin_can_view_queue(client, admin_user, patient_user):
  login(client, "patient@gmail.com", "Patient123!")
  future_date = (date.today() + timedelta(days=1)).isoformat()

  client.post(
    "/api/appointments/book",
    json={
      "appointment_date": future_date,
      "reason": "Consultation"
    }
  )

  client.post("/api/auth/logout")

  login(client, "admin@hospital.com", "Hoadmin123$")

  response = client.get(f"/admin/appointments/queue?appointment_date={future_date}")

  assert response.status_code == 200
  data = response.get_json()
  assert data["success"] is True
  assert data["count"] >= 1

def test_admin_can_update_status(client, admin_user, patient_user):
  login(client, "patient@gmail.com", "Patient123!")

  future_date = (date.today() + timedelta(days=1)).isoformat()

  book_response = client.post(
    "/api/appointments/book",
    json={
      "appointment_date": future_date,
      "reason": "Back pain"
    }
  )

  appointment_id = book_response.get_json()["data"]["id"]

  client.post("/api/auth/logout")
  login(client, "admin@hospital.com", "Hoadmin123$")

  response = client.put(
    f"/admin/appointments/{appointment_id}/status",
    json={"status": "served"}
  )

  assert response.status_code == 200
  data = response.get_json()
  assert data["success"] is True
  assert data["data"]["status"] == "served"


def test_home_page_renders(client):
  response = client.get("/")

  assert response.status_code == 200
  assert b"KIVU Appointment & Queue Management" in response.data


def test_patient_dashboard_renders_for_logged_in_patient(client, patient_user):
  login(client, "patient@gmail.com", "Patient123!")

  response = client.get("/patient/dashboard")

  assert response.status_code == 200
  assert b"Patient Dashboard" in response.data
  assert b"/static/JS/patientDashboard.js" in response.data


def test_admin_dashboard_renders_for_logged_in_admin(client, admin_user):
  login(client, "admin@hospital.com", "Hoadmin123$")

  response = client.get("/admin/dashboard")

  assert response.status_code == 200
  assert b"Admin Queue Dashboard" in response.data
  assert b"/static/JS/adminDashboard.js" in response.data