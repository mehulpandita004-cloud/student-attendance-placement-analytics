from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Student, Attendance
from backend.schemas import (
    AttendanceRiskPredictionRequest,
    AttendanceRiskPredictionResponse,
    PlacementReadinessPredictionRequest,
    PlacementReadinessPredictionResponse,
)
from backend.ml.predictor import (
    predict_attendance_risk,
    predict_placement_readiness,
    get_ml_metrics_summary,
    prediction_counter
)

router = APIRouter(tags=["Machine Learning Predictive Intelligence"])


@router.post("/predict/attendance-risk", response_model=AttendanceRiskPredictionResponse)
def api_predict_attendance_risk(req: AttendanceRiskPredictionRequest):
    """
    Predict attendance defaulter risk ('Low', 'Medium', 'High') using Scikit-Learn.
    Features: total_classes, classes_attended, classes_missed, attendance_percentage,
    previous_attendance, recent_attendance, attendance_trend.
    """
    input_dict = req.model_dump()
    result = predict_attendance_risk(input_dict)
    return result


@router.post("/predict/placement-readiness", response_model=PlacementReadinessPredictionResponse)
def api_predict_placement_readiness(req: PlacementReadinessPredictionRequest, db: Session = Depends(get_db)):
    """
    Predict student's placement readiness category ('High Readiness', 'Medium Readiness', 'Low Readiness') using Scikit-Learn.
    If student_id is provided, auto-populates features from the SQLite database.
    """
    input_dict = req.model_dump()

    # If student_id is passed, pull real features from database
    if req.student_id:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student ID {req.student_id} not found")

        # Parse skills count
        skills_raw = student.technical_skills or ""
        skills_count = len([s for s in skills_raw.split(",") if s.strip()])

        # Parse online profiles availability
        profiles_score = 0
        if student.github_profile and student.github_profile.strip():
            profiles_score += 1
        if student.portfolio_profile and student.portfolio_profile.strip():
            profiles_score += 1

        input_dict["attendance"] = student.attendance_percentage
        input_dict["cgpa"] = student.cgpa
        input_dict["number_of_projects"] = student.number_of_projects
        input_dict["certifications"] = student.certifications
        input_dict["internship"] = student.internship
        input_dict["technical_skills_count"] = skills_count
        input_dict["backlog_count"] = student.backlogs
        input_dict["github_portfolio_availability"] = profiles_score

    result = predict_placement_readiness(input_dict)
    return result


@router.get("/ml/metrics")
def get_ml_metrics():
    """
    Return comprehensive ML evaluation reports for both Attendance and Placement models:
    - Model Accuracy, Precision, Recall, F1-Score (Macro and Weighted)
    - True 3x3 Confusion Matrix
    - Models Comparison Table (Logistic Regression, Decision Tree, Random Forest)
    - Number of live predictions made
    """
    summary = get_ml_metrics_summary()
    return summary


@router.post("/predict/student/{student_id}")
def predict_student_comprehensive(student_id: int, db: Session = Depends(get_db)):
    """
    Run both ML models simultaneously on a single registered student from database.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student ID {student_id} not found")

    # Attendance features from records or overall percentage
    att_records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    if att_records:
        tc = sum(r.total_classes for r in att_records)
        ca = sum(r.classes_attended for r in att_records)
    else:
        tc = 60
        ca = int(round((student.attendance_percentage / 100.0) * tc))

    att_result = predict_attendance_risk({
        "total_classes": tc,
        "classes_attended": ca,
        "previous_attendance": student.attendance_percentage,
        "recent_attendance": student.attendance_percentage
    })

    # Placement features
    skills_raw = student.technical_skills or ""
    skills_count = len([s for s in skills_raw.split(",") if s.strip()])
    profiles_score = 0
    if student.github_profile and student.github_profile.strip():
        profiles_score += 1
    if student.portfolio_profile and student.portfolio_profile.strip():
        profiles_score += 1

    place_result = predict_placement_readiness({
        "attendance": student.attendance_percentage,
        "cgpa": student.cgpa,
        "number_of_projects": student.number_of_projects,
        "certifications": student.certifications,
        "internship": student.internship,
        "technical_skills_count": skills_count,
        "backlog_count": student.backlogs,
        "github_portfolio_availability": profiles_score
    })

    return {
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "cgpa": student.cgpa,
            "attendance": student.attendance_percentage
        },
        "attendance_risk_prediction": att_result,
        "placement_readiness_prediction": place_result
    }
