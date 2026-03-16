from flask import Blueprint

api_bp = Blueprint("api", __name__, url_prefix="/api")

from . import auth_API
from . import appointment_API
