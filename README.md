# Student Attendance, Performance & Placement Analytics System

A clean, modern, and practical college-level analytics and decision-support system. Designed to integrate student attendance compliance, semester GPA performance, and company placement eligibility in a unified portal.

---

## 🎯 Project Overview & Objective
In academic institutions, student attendance and academic consistency are directly correlated with placement readiness. This project addresses the gap by:
1. **Attendance Tracking & Defaulter Detection:** Automatically identifying students falling below the mandatory 75% attendance threshold.
2. **Academic Performance Monitoring:** Tracking CGPA across departments (CSE, IT, ECE, ME) and flagging active backlogs.
3. **Automated Placement Eligibility Screening:** Matching students dynamically with corporate drive criteria (Minimum CGPA, Minimum Attendance %, Max Backlogs).
4. **Viva-Ready ML Architecture:** Designed cleanly so machine learning algorithms (Random Forest / Logistic Regression) can be plugged in seamlessly for placement probability predictions.

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, Vanilla CSS3 (Custom Responsive Dark Theme), Vanilla JavaScript (ES6+ Fetch API)
- **Data Visualizations:** Chart.js (Doughnut charts, Grouped bar charts, Pie charts)
- **Backend:** Python 3 + FastAPI (Asynchronous REST API, CORS enabled, Swagger UI)
- **Database:** SQLite with SQLAlchemy ORM
- **Data & ML Stack:** Pandas, NumPy, Scikit-learn (Environment initialized)

---

## 📂 Project Directory Structure

```text
student attendance analyst/
│
├── frontend/
│   ├── index.html            # Landing / Overview page
│   ├── dashboard.html        # Main Analytics Dashboard (KPIs & Charts)
│   ├── students.html         # Student Directory, Search, Filters & Add Modal
│   ├── placement.html        # Placement Drives & Eligibility Screening Engine
│   ├── css/
│   │   └── style.css         # Modern, responsive UI stylesheet
│   └── js/
│       ├── api.js            # Unified FastAPI client & connectivity check
│       ├── dashboard.js      # KPI metrics, Chart.js graphs, at-risk table
│       ├── students.js       # Directory rendering, search, filters & CRUD
│       └── placement.js      # Drive cards & candidate eligibility checker
│
├── backend/
│   ├── main.py               # FastAPI entry point, CORS, and static file mount
│   ├── database.py           # SQLite connection and session management
│   ├── models.py             # SQLAlchemy models (Student, Drive, Attendance, Marks)
│   ├── schemas.py            # Pydantic schemas for request validation & serialization
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── students.py       # Student CRUD endpoints
│   │   ├── analytics.py      # KPI summaries & Chart.js dataset endpoints
│   │   └── placement.py      # Placement drives and candidate filtering
│   ├── services/
│   │   ├── __init__.py
│   │   └── seed_data.py      # Auto-populates realistic sample college records
│   ├── ml/
│   │   └── __init__.py       # ML predictive pipeline module (Phase 2)
│   └── data/
│       └── college_analytics.db  # SQLite database file (auto-generated)
│
├── requirements.txt          # Python dependencies
├── .gitignore                # Git ignore rules for Python, SQLite & IDEs
└── README.md                 # Project documentation & viva guide
```

---

## 🚀 How to Run the Project Locally

### 1. Prerequisites
Ensure you have **Python 3.10+** installed on your system.

### 2. Install Dependencies
Open your terminal in the project root directory and run:
```bash
pip install -r requirements.txt
```

### 3. Start the FastAPI Backend
Start the server using Python or Uvicorn:
```bash
# Option A: Run directly via Python
python backend/main.py

# Option B: Run via uvicorn
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 4. Access the Application
Once the server starts:
- **Web Dashboard:** Open [http://127.0.0.1:8000/dashboard](http://127.0.0.1:8000/dashboard) in your browser.
- **Landing Page:** Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive API Documentation (Swagger UI):** Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative (Direct Frontend):** You can also directly double-click and open any file inside `frontend/` (e.g. `frontend/dashboard.html`) in your browser; it will automatically connect to `http://127.0.0.1:8000/api`.

---

## 🧭 Dashboard Sidebar Modules
1. **Dashboard:** High-level metrics, attendance compliance doughnut chart, department comparisons, and placement distribution.
2. **Students:** Complete student directory with live search, department filters, and modal to add new student records.
3. **Attendance:** Visual tracking of attendance rates against the 75% threshold.
4. **Performance:** CGPA comparison across branches and backlog tracking.
5. **Placement Drives:** Active company recruitment drives with 1-click candidate eligibility screening.
6. **ML Predictions:** Architectural foundation for training scikit-learn models (Phase 2).
7. **Recommendations:** Automated remedial notices and training bootcamps.

---

## 🎓 Viva Questions & Practical Talking Points
- **Q: Why SQLite instead of MongoDB or MySQL?**
  * *Answer:* SQLite is serverless, zero-configuration, and stores data in a single file (`backend/data/college_analytics.db`). It is ideal for local college projects and self-contained demonstrations.
- **Q: Why FastAPI?**
  * *Answer:* FastAPI provides automatic interactive documentation (`/docs`), strict type validation with Pydantic, and fast async performance.
- **Q: How does the system handle students at risk?**
  * *Answer:* Students with `< 75%` attendance or `> 0` backlogs are automatically highlighted in the Academic Intervention table to alert mentors before exams and placement drives.
