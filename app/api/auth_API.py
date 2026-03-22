from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user

from . import api_bp
from ..extensions import db
from ..models import Users

def user_payload(user: Users):
  return{
    "id": user.id,
    "name": user.name,
    "email": user.email,
    "role": user.role
  }

@api_bp.post("/auth/register")
def api_register():
  data = request.get_json(silent=True) or {}

  name = (data.get("name") or "").strip()
  email = (data.get("email") or "").strip().lower()
  password = data.get("password") or ""
  role = (data.get("role") or "patient").strip().lower()
  admin_code = (data.get("admin_code") or "").strip()

  if not name or not email or not password:
    return jsonify({"success": False, "message": "name, email, password required!!"}), 400
  
  if role not in {"patient", "admin"}:
    return jsonify({"success": False, "message": "Invalid role selected."}), 400
  
  if Users.query.filter_by(email=email).first():
    return jsonify({"success": False, "message": "Email already registered!"}), 409
  
  if role == "admin":
    if not admin_code:
      return jsonify({"success": False, "message": "Admin code is required to register as an admin."}), 400
    
    if admin_code != current_app.config.get("ADMIN_CODE"):
      return jsonify({"success": False, "message": "Invalid admin code."}), 403
    
  user = Users(
    name = name,
    email = email,
    password_hash = generate_password_hash(password),
    role = role,
  )

  db.session.add(user)
  db.session.commit()

  return jsonify({"success": True, "message": "Registered", "data": user_payload(user)}), 201

@api_bp.post("/auth/login")
def api_login():
  data = request.get_json(silent=True) or {}

  email = (data.get("email") or "").strip().lower()
  password = data.get("password") or ""

  if not email or not password:
    return jsonify({"success": False, "message": "Email and password are required!!"}), 400
  
  user = Users.query.filter_by(email=email).first()
  if not user or not check_password_hash(user.password_hash, password):
    return jsonify({"success": False, "message": "Invalid email or password, please try again!"}), 401 
  
  login_user(user)
  return jsonify({"success": True, "message": "Successfully Logged in", "data": user_payload(user)}), 200

@api_bp.post("/auth/logout")
@login_required
def api_logout():
  logout_user()
  return jsonify({"success": True, "message": "Successfully Logged out!"}), 200

@api_bp.get("/auth/me")
@login_required
def api_me():
  return jsonify({"success": True, "data": user_payload(current_user)}), 200