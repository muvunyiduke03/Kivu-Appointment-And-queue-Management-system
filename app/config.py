import os

class Config:
  SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret")
  SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
  SQLALCHEMNY_TRACK_MODIFICATIONS = False
  ADMIN_CODE = os.getenv("ADMIN_CODE", "")