# Kivu-Appointment-And-queue-Management-system

This is a Flask-based web application that patients will use to book appointments at hospitals and the admins (Doctors, Nurse and Receptionists) will use it to manage daily queue and update status of the patient's appointment.

## 1) Prerequisites

- **Git** (to clone the repository)
- **Python 3.10 and above**
- **pip** (Usually comes with Python)
- **MYSQL 8+**

---

## 2) Clone the repository from Github

```bash
git clone https://github.com/muvunyiduke03/Kivu-Appointment-And-queue-Management-system.git
cd Kivu-Appointment-And-queue_Management-system
```

---

## 3) Create and activate the virtual environment

### For macOS/Linux

```bash
python3 -m venve .venv
source .venv/bin/activate
```

### For Windows (Powershell)

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

---

## 4) Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 5) Configure environement variables

Create a `.env` file in the project root (Same level as `app.py`):

```env
SECRET_KEY="yourSecretKey"
DATABASE_URL="mysql+pymysql://USER:password@host:port/db_name"
ADMIN_CODE="youradminCode"
```

### Environment variable reference

- `SECRET_KEY`: Is for Flask session/security secret.
- `DATABASE_URL`: This is for the SQLAlchemy connection (Connection of the app and Database).
- `ADMIN_CODE`: This is required for registering an admin account. To avoid a patient registering as an admin.

## 7) Run database migrations

### For macOS/Linux

```bash
export FLASK_APP=app.py
flask db upgrade
```

### For Windows (PowerShell)

```powershell
$env:FLASK_APP="app.py"
flask db upgrade
```

---

## 8) Run the application

```bash
python app.py
```

After this the application will run locally at:

- http://127.0.0.1:5000
 you can do ctrl + click and open the link in your browser

---

## 10) Common issues and their fixes

### `ModuleNotFoundError` / package import errors

You have to make sure that your virtual environment is activated and dependencies are all installed. Refer to steps 3, 4 & 5.

### Database connection errors

- Confirm that your MySQL database is running.
- Verify that your database username, password, host, port and db_name if they match your `DATABASE_URL`.
- You also have to ensure that your database exists.

### Migration errors:

You will have to run:

```bash
flask db upgrade
```

After verifying `FLASK_APP` and `.env` values.

---

## Checklist for running the system - Reminder

1. Clone repository from Github.
2. Create and activate virtual environment
3. Install the app dependencies in requirement.txt.
4. Create the `.env` file.
5. Create the MySQL Database.
6. Run `flask db upgrade` for the migrations.
7. Run `python app.py` to run the application.
8. Open the link provided to open the app in your browser.

---

##  Tutorial on how to use KIVU-HAQMS

🔗 https://youtu.be/4BzwAvpUcDo

Copyright © MUVUNYI Duke 2026
