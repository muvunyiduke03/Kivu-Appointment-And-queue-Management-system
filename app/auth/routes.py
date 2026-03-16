from flask import render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required

from . import auth_bp
from ..extensions import db
from ..models import Users

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
  if request.method == "POST":
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")

    if not name or not email or not password:
      flash("All fields are required.", "error")
      return redirect(url_for("auth.register"))
    
    existing = Users.query.filter_by(email=email).first()
    if existing:
      flash("Email already registered. Please log in.", "error")
      return redirect(url_for("auth.login"))
    
    user = Users(
      name = name,
      email = email,
      password_hash=generate_password_hash(password),
      role="patient"
    )
    db.session.add(user)
    db.session.commit()

    flash("Account created successfully. Please log in.", "success")
    return redirect(url_for("auth.login"))
  
  return render_template("auth/register.html")

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
  if request.method =="POST":
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")

    user = Users.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
      flash("Invalid email or password.", "error")
      return redirect(url_for("auth.login"))
    
    login_user(user)
    flash("Logged in successfully.", "success")
    return redirect(url_for("home"))
  return render_template("auth/login.html")

@auth_bp.route("/logout")
@login_required
def logout():
  logout_user()
  flash("Logged out successfully.", "success")
  return redirect(url_for("auth.login"))