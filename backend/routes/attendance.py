import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Attendance, Student
from backend.schemas import AttendanceCreate, AttendanceUpdate, AttendanceResponse

router = APIRouter(tags=["Attendance"])

def sync_student_overall_attendance(student_id: int, db: Session):
    """Recalculate and update the student's overall attendance percentage based on all subject records."""
    records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return

    if not records:
        student.attendance_percentage = 0.0
    else:
        total_att = sum(r.classes_attended for r in records)
        total_cls = sum(r.total_classes for r in records)
        if total_cls > 0:
            student.attendance_percentage = round((total_att / total_cls) * 100, 1)
        else:
            student.attendance_percentage = 0.0

    db.commit()


def enrich_attendance_response(att: Attendance) -> AttendanceResponse:
    """Helper to convert Attendance model into AttendanceResponse with extra fields."""
    return AttendanceResponse(
        id=att.id,
        student_id=att.student_id,
        subject=att.subject,
        total_classes=att.total_classes,
        classes_attended=att.classes_attended,
        classes_missed=att.classes_missed,
        attendance_percentage=round(att.attendance_percentage, 2),
        date=att.date,
        risk_level=att.risk_level,
        classes_required_for_75=att.classes_required_for_75,
        student_name=att.student.name if att.student else None,
        student_roll=att.student.student_id if att.student else None
    )


# ----------------- 1. Add Attendance -----------------
@router.post("/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(att_in: AttendanceCreate, db: Session = Depends(get_db)):
    """Add attendance record with automatic percentage and missed classes calculation."""
    # Verify student exists
    student = db.query(Student).filter(Student.id == att_in.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {att_in.student_id} does not exist."
        )

    # Validation: attended cannot exceed total
    if att_in.classes_attended > att_in.total_classes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Classes attended cannot exceed total classes."
        )

    # Automatic Calculations:
    # classes_missed = total_classes - classes_attended
    # attendance_percentage = (classes_attended / total_classes) * 100
    classes_missed = att_in.total_classes - att_in.classes_attended
    percentage = round((att_in.classes_attended / att_in.total_classes) * 100, 2)

    att = Attendance(
        student_id=att_in.student_id,
        subject=att_in.subject.strip(),
        total_classes=att_in.total_classes,
        classes_attended=att_in.classes_attended,
        classes_missed=classes_missed,
        attendance_percentage=percentage,
        date=att_in.date.strip()
    )

    db.add(att)
    db.commit()
    db.refresh(att)

    sync_student_overall_attendance(att.student_id, db)
    return enrich_attendance_response(att)


import os
from fastapi import Request
from fastapi.responses import FileResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "frontend"))

# ----------------- 2. Retrieve All Attendance -----------------
@router.get("/attendance", response_model=List[AttendanceResponse])
def get_all_attendance(
    request: Request,
    student_id: Optional[int] = Query(None, description="Filter by student numeric ID"),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    risk_level: Optional[str] = Query(None, description="Filter by rule-based risk level (Low Risk, Medium Risk, High Risk)"),
    db: Session = Depends(get_db)
):
    """Retrieve attendance records with optional filtering."""
    query = db.query(Attendance)

    if student_id:
        query = query.filter(Attendance.student_id == student_id)

    if subject and subject != "All":
        query = query.filter(Attendance.subject.ilike(f"%{subject.strip()}%"))

    records = query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()

    if risk_level and risk_level != "All":
        records = [r for r in records if r.risk_level == risk_level]

    return [enrich_attendance_response(r) for r in records]


# ----------------- 3. Get Attendance by Student -----------------
@router.get("/attendance/student/{student_id}", response_model=List[AttendanceResponse])
def get_attendance_by_student(student_id: int, db: Session = Depends(get_db)):
    """Retrieve all subject attendance records for a specific student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    return [enrich_attendance_response(r) for r in records]


# ----------------- 4. Get Subject-wise Attendance -----------------
@router.get("/attendance/subject/{subject_name}")
def get_subject_attendance(subject_name: str, db: Session = Depends(get_db)):
    """Retrieve subject aggregate stats and student breakdown."""
    records = db.query(Attendance).filter(Attendance.subject.ilike(subject_name.strip())).all()
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No attendance records found for subject '{subject_name}'."
        )

    total_cls = sum(r.total_classes for r in records)
    total_att = sum(r.classes_attended for r in records)
    avg_pct = round((total_att / total_cls) * 100, 2) if total_cls > 0 else 0.0

    return {
        "subject": subject_name,
        "total_records": len(records),
        "total_classes_conducted": total_cls,
        "total_classes_attended": total_att,
        "average_attendance_percentage": avg_pct,
        "records": [enrich_attendance_response(r) for r in records]
    }


# ----------------- 5. Get Attendance Record by ID -----------------
@router.get("/attendance/{id}", response_model=AttendanceResponse)
def get_attendance_by_id(id: int, db: Session = Depends(get_db)):
    """Retrieve an attendance record by numeric ID."""
    att = db.query(Attendance).filter(Attendance.id == id).first()
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {id} not found."
        )
    return enrich_attendance_response(att)


# ----------------- 6. Update Attendance -----------------
@router.put("/attendance/{id}", response_model=AttendanceResponse)
def update_attendance(id: int, att_update: AttendanceUpdate, db: Session = Depends(get_db)):
    """Update an existing attendance record with automatic recalculation."""
    att = db.query(Attendance).filter(Attendance.id == id).first()
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {id} not found."
        )

    update_dict = att_update.model_dump(exclude_unset=True)

    # Determine final total and attended values
    total_classes = update_dict.get("total_classes", att.total_classes)
    classes_attended = update_dict.get("classes_attended", att.classes_attended)

    if classes_attended > total_classes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Classes attended cannot exceed total classes."
        )

    # Update basic fields
    if "subject" in update_dict:
        att.subject = update_dict["subject"].strip()
    if "date" in update_dict:
        att.date = update_dict["date"].strip()

    # Automatic recalculation
    att.total_classes = total_classes
    att.classes_attended = classes_attended
    att.classes_missed = total_classes - classes_attended
    att.attendance_percentage = round((classes_attended / total_classes) * 100, 2) if total_classes > 0 else 0.0

    db.commit()
    db.refresh(att)

    sync_student_overall_attendance(att.student_id, db)
    return enrich_attendance_response(att)


# ----------------- 6. Delete Attendance -----------------
@router.delete("/attendance/{id}")
def delete_attendance(id: int, db: Session = Depends(get_db)):
    """Delete an attendance record."""
    att = db.query(Attendance).filter(Attendance.id == id).first()
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {id} not found."
        )

    student_id = att.student_id
    db.delete(att)
    db.commit()

    sync_student_overall_attendance(student_id, db)
    return {
        "message": f"Attendance record #{id} deleted successfully.",
        "id": id
    }


# ----------------- 7. Attendance Analytics & Dashboard Data -----------------
@router.get("/attendance/analytics")
def get_attendance_analytics(
    student_id: Optional[int] = Query(None, description="Optional: specific student ID for individual analytics"),
    db: Session = Depends(get_db)
):
    """
    Returns analytics required for the Attendance Dashboard:
    1. Overall attendance percentage
    2. Subject-wise attendance
    3. Attendance distribution (Rule-based: Low Risk, Medium Risk, High Risk)
    4. Attendance trend over time
    5. Subjects below 75%
    6. Classes required to reach 75%
    """
    query = db.query(Attendance)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)

    records = query.all()
    if not records:
        return {
            "overall_attendance_percentage": 0.0,
            "total_classes": 0,
            "classes_attended": 0,
            "classes_missed": 0,
            "overall_risk_level": "High Risk",
            "classes_required_for_75": 0,
            "subject_wise": [],
            "distribution": {"Low Risk": 0, "Medium Risk": 0, "High Risk": 0},
            "trend": {"labels": [], "percentages": []},
            "below_75_subjects": []
        }

    # 1. Overall Calculations
    total_classes = sum(r.total_classes for r in records)
    total_attended = sum(r.classes_attended for r in records)
    total_missed = sum(r.classes_missed for r in records)
    overall_pct = round((total_attended / total_classes) * 100, 2) if total_classes > 0 else 0.0

    # Rule-based Overall Risk
    if overall_pct >= 85.0:
        overall_risk = "Low Risk"
    elif overall_pct >= 75.0:
        overall_risk = "Medium Risk"
    else:
        overall_risk = "High Risk"

    # Overall classes required to reach 75%
    overall_needed_for_75 = max(0, 3 * total_classes - 4 * total_attended) if overall_pct < 75.0 else 0

    # 2. Subject-wise Grouping
    subject_map: Dict[str, Dict[str, Any]] = {}
    for r in records:
        if r.subject not in subject_map:
            subject_map[r.subject] = {
                "subject": r.subject,
                "total_classes": 0,
                "classes_attended": 0,
                "classes_missed": 0,
            }
        subject_map[r.subject]["total_classes"] += r.total_classes
        subject_map[r.subject]["classes_attended"] += r.classes_attended
        subject_map[r.subject]["classes_missed"] += r.classes_missed

    subject_wise = []
    below_75_subjects = []
    for s_name, data in subject_map.items():
        t = data["total_classes"]
        a = data["classes_attended"]
        pct = round((a / t) * 100, 2) if t > 0 else 0.0
        
        # Rule-based indicator
        if pct >= 85.0:
            risk = "Low Risk"
        elif pct >= 75.0:
            risk = "Medium Risk"
        else:
            risk = "High Risk"

        # Formula: 3*T - 4*A
        req_classes = max(0, 3 * t - 4 * a) if pct < 75.0 else 0

        item = {
            "subject": s_name,
            "total_classes": t,
            "classes_attended": a,
            "classes_missed": data["classes_missed"],
            "attendance_percentage": pct,
            "risk_level": risk,
            "classes_required_for_75": req_classes
        }
        subject_wise.append(item)

    # 3. Attendance Risk Distribution (Rule-based: across all evaluated records)
    low_risk = sum(1 for r in records if r.attendance_percentage >= 85.0)
    medium_risk = sum(1 for r in records if 75.0 <= r.attendance_percentage < 85.0)
    high_risk = sum(1 for r in records if r.attendance_percentage < 75.0)

    # 5 & 6. Subjects Below 75% & Classes Required to Reach 75%
    below_75_subjects = []
    if student_id:
        for item in subject_wise:
            if item["attendance_percentage"] < 75.0:
                below_75_subjects.append(item)
    else:
        for r in records:
            if r.attendance_percentage < 75.0:
                below_75_subjects.append({
                    "subject": r.subject,
                    "student_name": r.student.name if r.student else f"Student #{r.student_id}",
                    "student_roll": r.student.student_id if r.student else "",
                    "total_classes": r.total_classes,
                    "classes_attended": r.classes_attended,
                    "classes_missed": r.classes_missed,
                    "attendance_percentage": round(r.attendance_percentage, 2),
                    "risk_level": "High Risk",
                    "classes_required_for_75": r.classes_required_for_75
                })

    # 4. Chronological Trend Over Time
    sorted_by_date = sorted(records, key=lambda x: x.date)
    # Group by date
    date_map: Dict[str, Dict[str, int]] = {}
    for r in sorted_by_date:
        if r.date not in date_map:
            date_map[r.date] = {"att": 0, "tot": 0}
        date_map[r.date]["att"] += r.classes_attended
        date_map[r.date]["tot"] += r.total_classes

    trend_labels = list(date_map.keys())
    trend_percentages = [
        round((date_map[d]["att"] / date_map[d]["tot"]) * 100, 1) if date_map[d]["tot"] > 0 else 0.0
        for d in trend_labels
    ]

    return {
        "overall_attendance_percentage": overall_pct,
        "total_classes": total_classes,
        "classes_attended": total_attended,
        "classes_missed": total_missed,
        "overall_risk_level": overall_risk,
        "classes_required_for_75": overall_needed_for_75,
        "subject_wise": subject_wise,
        "distribution": {
            "Low Risk (>=85%)": low_risk,
            "Medium Risk (75-84%)": medium_risk,
            "High Risk (<75%)": high_risk
        },
        "trend": {
            "labels": trend_labels,
            "percentages": trend_percentages
        },
        "below_75_subjects": below_75_subjects
    }
