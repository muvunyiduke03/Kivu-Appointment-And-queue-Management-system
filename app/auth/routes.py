from flask import render_template, request, redirect, url_for, flash, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user

from . import auth_bp
from ..extensions import db
from ..models import Users

@auth_bp.route("/register", methods=["GET", "POST"])
def register():

  if current_user.is_authenticated:
    if current_user.role == "admin":
      return redirect(url_for("admin.admin_dashboard"))
    return redirect(url_for("patient.patient_dashboard"))
  
  if request.method == "POST":
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    role = request.form.get("role", "patient").strip().lower()
    admin_code = request.form.get("adminCode", "").strip()

    if not name or not email or not password:
      flash("All fields are required.", "error")
      return redirect(url_for("auth.register"))
    
    if role not in {"patient", "admin"}:
      flash("Invalid account role selected.", "error")
      return redirect(url_for("auth.register"))
    
    existing = Users.query.filter_by(email=email).first()
    if existing:
      flash("Email already registered. Please log in.", "error")
      return redirect(url_for("auth.login"))
    
    if role == "admin":
      if not admin_code:
        flash("Admin code is required to register as an admin.", "error")
        return redirect(url_for("auth.register"))
      
      if admin_code != current_app.config.get("ADMIN_CODE"):
        flash("Invalid admin code.", "error")
        return redirect(url_for("auth.register"))
      
    user = Users(
      name = name,
      email = email,
      password_hash=generate_password_hash(password),
      role=role
    )
    db.session.add(user)
    db.session.commit()

    flash("Account created successfully. Please log in.", "success")
    return redirect(url_for("auth.login"))
  
  return render_template("auth/register.html")

@auth_bp.route("/login", methods=["GET", "POST"])
def login():

  if current_user.is_authenticated:
    if current_user.role == "admin":
      return redirect(url_for("admin.admin_dashboard"))
    return redirect(url_for("patient.patient_dashboard"))
  
  if request.method =="POST":
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")

    user = Users.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
      flash("Invalid email or password.", "error")
      return redirect(url_for("auth.login"))
    
    login_user(user)
    flash("Logged in successfully.", "success")
    if user.role == "admin":
      return redirect(url_for("admin.admin_dashboard"))
    return redirect(url_for("patient.patient_dashboard"))
  
  return render_template("auth/login.html")

@auth_bp.route("/logout")
@login_required
def logout():
  logout_user()
  flash("Logged out successfully.", "success")
  return redirect(url_for("auth.login"))