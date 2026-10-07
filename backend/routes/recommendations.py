"""
Recommendations & Unified Student Dashboard Endpoints.
Exposes:
- GET /api/recommendations/student/{student_id}
- GET /api/student-dashboard/{student_id}
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Student, Attendance, PlacementDrive
from backend.services.recommendation_engine import generate_student_recommendations
from backend.ml.predictor import predict_attendance_risk, predict_placement_readiness

router = APIRouter(prefix="/api", tags=["Personalized Recommendations & Student Portal"])


@router.get("/recommendations/student/{student_id}")
def get_student_recommendations_endpoint(student_id: int, db: Session = Depends(get_db)):
    """
    Generate personalized recommendations for a student based on:
    - Attendance analysis & subject-level recovery needs
    - Attendance ML prediction
    - CGPA, projects, certifications, internship, backlogs
    - Placement readiness ML prediction
    - Placement eligibility across all active drives
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student ID {student_id} not found")

    return generate_student_recommendations(db, student_id)


@router.get("/student-dashboard/{student_id}")
def get_student_dashboard_endpoint(student_id: int, db: Session = Depends(get_db)):
    """
    Comprehensive single-payload endpoint powering the complete Student Dashboard:
    - Student Profile
    - Overall & Subject-wise Attendance + Attendance Risk
    - Academic Performance (CGPA, Projects, Certifications, Skills)
    - ML Predictions (Attendance Risk & Placement Readiness)
    - Placement Drives (Eligible & Ineligible with specific reasons)
    - Personalized Improvement Recommendations
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student ID {student_id} not found")

    # 1. Subject-wise attendance
    att_records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    subject_wise = []
    if att_records:
        total_sched = sum(r.total_classes for r in att_records)
        total_att = sum(r.classes_attended for r in att_records)
        overall_pct = round((total_att / total_sched) * 100.0, 1) if total_sched > 0 else student.attendance_percentage
        for r in att_records:
            subject_wise.append({
                "id": r.id,
                "subject": r.subject,
                "total_classes": r.total_classes,
                "classes_attended": r.classes_attended,
                "classes_missed": r.classes_missed,
                "attendance_percentage": r.attendance_percentage,
                "risk_level": r.risk_level,
                "classes_required_for_75": r.classes_required_for_75
            })
    else:
        total_sched = 60
        total_att = int(round((student.attendance_percentage / 100.0) * total_sched))
        overall_pct = student.attendance_percentage

    # 2. ML Attendance Risk
    ml_att = predict_attendance_risk({
        "total_classes": total_sched,
        "classes_attended": total_att,
        "previous_attendance": overall_pct,
        "recent_attendance": overall_pct
    })

    # 3. ML Placement Readiness
    skills_raw = student.technical_skills or ""
    skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]
    profiles_score = (1 if student.github_profile and student.github_profile.strip() else 0) + \
                     (1 if student.portfolio_profile and student.portfolio_profile.strip() else 0)

    ml_place = predict_placement_readiness({
        "attendance": overall_pct,
        "cgpa": student.cgpa,
        "number_of_projects": student.number_of_projects,
        "certifications": student.certifications,
        "internship": student.internship,
        "technical_skills_count": len(skills_list),
        "backlog_count": student.backlogs,
        "github_portfolio_availability": profiles_score
    })

    # 4. Recommendations & Drive Eligibility
    rec_data = generate_student_recommendations(db, student_id)

    return {
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "branch": student.branch,
            "year": student.year,
            "cgpa": student.cgpa,
            "attendance_percentage": overall_pct,
            "technical_skills": skills_list,
            "number_of_projects": student.number_of_projects,
            "certifications": student.certifications,
            "internship": student.internship,
            "backlogs": student.backlogs,
            "github_profile": student.github_profile or "",
            "portfolio_profile": student.portfolio_profile or "",
            "placement_status": student.placement_status
        },
        "attendance": {
            "overall_percentage": overall_pct,
            "total_classes": total_sched,
            "classes_attended": total_att,
            "classes_missed": max(0, total_sched - total_att),
            "status_label": "Good Standing" if overall_pct >= 85 else ("Borderline" if overall_pct >= 75 else "Defaulter (<75%)"),
            "risk_level": ml_att.get("predicted_risk", "Medium"),
            "subject_wise": subject_wise
        },
        "academic_performance": {
            "cgpa": student.cgpa,
            "grade_point_scale": 10.0,
            "performance_standing": "First Class with Distinction" if student.cgpa >= 8.5 else ("First Class" if student.cgpa >= 7.0 else "Pass Class"),
            "number_of_projects": student.number_of_projects,
            "certifications": student.certifications,
            "internship": student.internship,
            "backlogs": student.backlogs,
            "technical_skills_count": len(skills_list)
        },
        "ml_predictions": {
            "attendance_risk": ml_att,
            "placement_readiness": ml_place
        },
        "placement": {
            "eligible_drives": rec_data.get("eligible_drives", []),
            "not_eligible_drives": rec_data.get("not_eligible_drives", []),
            "total_eligible": rec_data.get("summary", {}).get("eligible_drives_count", 0),
            "total_ineligible": rec_data.get("summary", {}).get("ineligible_drives_count", 0)
        },
        "recommendations": {
            "summary": rec_data.get("summary", {}),
            "items": rec_data.get("recommendations", [])
        }
    }
