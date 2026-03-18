from flask import Flask
from dotenv import load_dotenv
import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path, override=False)

from .config import Config
from .extensions import db, login_manager, migrate

def create_app():

  app = Flask(__name__)
  app.config.from_object(Config)

  db.init_app(app)
  login_manager.init_app(app)
  migrate.init_app(app, db)

  login_manager.login_view = "auth.login"
  
  @login_manager.unauthorized_handler
  def unauthorized():
    return {"success": False, "message": "Authentication required!"}, 401
  

  from . import models
  from .models import Users
  
  # User loader for Flask-login
  @login_manager.user_loader
  def load_user(user_id):
    return Users.query.get(int(user_id))
  
  # Register blueprints
  from .auth import auth_bp
  app.register_blueprint(auth_bp, url_prefix="/auth")
  
  from .api import api_bp
  app.register_blueprint(api_bp)

  from .admin import admin_bp
  app.register_blueprint(admin_bp)

  from .patient import patient_bp
  app.register_blueprint(patient_bp)
  
  @app.get("/")
  def home():
    return {"message": "Kivu up and running...✅"}
  
  return app
