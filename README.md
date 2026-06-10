# GitGood

This project is a course comment system


## Structure

app.py Main Flask application responsible for routing, database initialization, and login management.

models.py – SQLAlchemy model definitions.
requirements.txt – Project dependencies.
templates/ – HTML template files.
static/ – CSS, JavaScript, and icon assets.
utils/ – Utility functions and filtering logic.



### 1. Navigate to the Project Folder

```powershell
cd c:\Users\88695\Documents\GitHub\gitgood
```

### 2. Create and Activate a Python Virtual Environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```


### 3. install

```powershell
pip install -r requirements.txt
```

### 4. admin account 



- `SECRET_KEY`：Flask Session 用的密鑰，預設為 `dev`
- `ADMIN_USERNAME`：管理員帳號 `admin`
- `ADMIN_EMAIL`：管理員信箱 `admin@example.com`
- `ADMIN_PASSWORD`：管理員密碼 `admin123`



### 5. run the app.py



```powershell
python app.py
```

or Flask CLI：

```powershell
$env:FLASK_APP = "app.py"
$env:FLASK_ENV = "development"
flask run --host=127.0.0.1 --port=5000
```

### 6. open web by

- `http://127.0.0.1:5000`

## db

- db is `12354.db`



