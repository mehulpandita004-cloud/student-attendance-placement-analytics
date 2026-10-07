import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from backend.database import init_db, SessionLocal
from backend.services.seed_data import seed_initial_data
from backend.routes import students, analytics, placement, attendance, performance, ml_predictions, recommendations

# Lifespan event to create tables, migrate columns, and seed sample data
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB tables & migrations
    init_db()
    
    # 2. Seed initial mock data if empty
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    
    yield

app = FastAPI(
    title="Student Attendance, Performance & Placement Analytics System",
    description="Backend API for student metrics, performance tracking, placement analysis, and ML predictive intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers (canonical /students and /attendance in Swagger docs, /api fallback preserved)
app.include_router(students.router)
app.include_router(students.router, prefix="/api", include_in_schema=False)
app.include_router(attendance.router)
app.include_router(attendance.router, prefix="/api", include_in_schema=False)
app.include_router(performance.router)
app.include_router(performance.router, prefix="/api", include_in_schema=False)
app.include_router(analytics.router)
app.include_router(placement.router)
app.include_router(ml_predictions.router)
app.include_router(ml_predictions.router, prefix="/api", include_in_schema=False)
app.include_router(recommendations.router)


# Health Check Endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Student Attendance, Performance & Placement Analytics API",
        "version": "1.0.0",
        "database": "SQLite (connected)"
    }

# Mount Frontend static files for seamless local serving
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

if os.path.exists(FRONTEND_DIR):
    # Mount css, js, and assets
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

    @app.get("/", tags=["Frontend"])
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/dashboard", tags=["Frontend"])
    @app.get("/dashboard.html", tags=["Frontend"])
    def serve_dashboard():
        return FileResponse(os.path.join(FRONTEND_DIR, "dashboard.html"))

    @app.get("/students.html", tags=["Frontend"])
    def serve_students_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "students.html"))

    @app.get("/attendance.html", tags=["Frontend"])
    def serve_attendance_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "attendance.html"))

    @app.get("/performance.html", tags=["Frontend"])
    def serve_performance_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "performance.html"))

    @app.get("/profile.html", tags=["Frontend"])
    @app.get("/profile", tags=["Frontend"])
    def serve_profile_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "profile.html"))

    @app.get("/placement", tags=["Frontend"])
    @app.get("/placement.html", tags=["Frontend"])
    def serve_placement():
        return FileResponse(os.path.join(FRONTEND_DIR, "placement.html"))

    @app.get("/eligibility", tags=["Frontend"])
    @app.get("/eligibility.html", tags=["Frontend"])
    def serve_eligibility_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "eligibility.html"))

    @app.get("/drive-candidates", tags=["Frontend"])
    @app.get("/drive-candidates.html", tags=["Frontend"])
    def serve_drive_candidates_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "drive-candidates.html"))

    @app.get("/ml-dashboard", tags=["Frontend"])
    @app.get("/ml-dashboard.html", tags=["Frontend"])
    def serve_ml_dashboard_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "ml-dashboard.html"))

    @app.get("/student-dashboard", tags=["Frontend"])
    @app.get("/student-dashboard.html", tags=["Frontend"])
    def serve_student_dashboard_html():
        return FileResponse(os.path.join(FRONTEND_DIR, "student-dashboard.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
