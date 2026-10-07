import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from backend.database import init_db, SessionLocal, engine, get_db
from backend.services.seed_data import seed_initial_data
from backend.routes import students, analytics, placement, attendance, performance, ml_predictions, recommendations
from sqlalchemy.orm import Session
from sqlalchemy import text

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

    # 3. Warm up & verify ML predictive models
    from backend.ml.predictor import ensure_models_trained
    ensure_models_trained()
    
    yield

app = FastAPI(
    title="Student Attendance, Performance & Placement Analytics System",
    description="Backend API for student metrics, performance tracking, placement analysis, and ML predictive intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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

# Health Check Endpoints (GET /health and GET /api/health)
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Verify system and SQLite database connectivity status."""
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "connected" else "error",
        "database": db_status,
        "service": "Student Attendance, Performance & Placement Analytics API",
        "version": "1.0.0"
    }

# Convenient aliases for relative endpoints
@app.get("/placement-drives", tags=["Placement Drives & Eligibility Engine"])
def list_placement_drives_alias(db: Session = Depends(get_db)):
    from backend.routes.placement import get_placement_drives
    return get_placement_drives(db=db)

@app.get("/student-dashboard/{student_id}", tags=["Personalized Recommendations & Student Portal"])
def student_dashboard_alias(student_id: int, db: Session = Depends(get_db)):
    from backend.routes.recommendations import get_student_dashboard_endpoint
    return get_student_dashboard_endpoint(student_id=student_id, db=db)

@app.get("/recommendations/student/{student_id}", tags=["Personalized Recommendations & Student Portal"])
def student_recommendations_alias(student_id: int, db: Session = Depends(get_db)):
    from backend.routes.recommendations import get_student_recommendations_endpoint
    return get_student_recommendations_endpoint(student_id=student_id, db=db)

# Mount Frontend static files for seamless local serving
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

if os.path.exists(FRONTEND_DIR):
    # Mount css, js, and assets
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

    @app.get("/", tags=["Frontend"])
    @app.get("/index.html", tags=["Frontend"])
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        from fastapi import Response
        return Response(status_code=204)

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
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
