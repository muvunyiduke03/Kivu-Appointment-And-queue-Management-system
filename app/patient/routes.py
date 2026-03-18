from flask import render_template, redirect, url_for
from flask_login import login_required, current_user

from . import patient_bp

@patient_bp.get("dashboard")
@login_required
def patient_dashboard():
  if current_user.role != "patient":
    if current_user.role == "admin":
      return redirect(url_for("admin.admin_dashboard"))
    return redirect(url_for("auth.login"))
  
  return render_template("patient/patient_dashboard.html")