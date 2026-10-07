from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Student, PlacementDrive
from backend.schemas import DashboardStats
from backend.routes.placement import evaluate_student_eligibility
from backend.ml.predictor import predict_placement_readiness

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Admin Intelligence"])


def _calculate_ml_readiness_distribution(students: List[Student]) -> Dict[str, int]:
    """Calculate High, Medium, Low Placement Readiness counts using the trained Scikit-learn model."""
    counts = {"High Readiness": 0, "Medium Readiness": 0, "Low Readiness": 0}
    for s in students:
        skills_raw = s.technical_skills or ""
        skills_count = len([x for x in skills_raw.split(",") if x.strip()])
        profiles_score = (1 if s.github_profile and s.github_profile.strip() else 0) + \
                         (1 if s.portfolio_profile and s.portfolio_profile.strip() else 0)
        
        pred = predict_placement_readiness({
            "attendance": s.attendance_percentage,
            "cgpa": s.cgpa,
            "number_of_projects": s.number_of_projects,
            "certifications": s.certifications,
            "internship": s.internship,
            "technical_skills_count": skills_count,
            "backlog_count": s.backlogs,
            "github_portfolio_availability": profiles_score
        })
        category = pred.get("readiness_category", "Medium Readiness")
        if category in counts:
            counts[category] += 1
        else:
            counts["Medium Readiness"] += 1
    return counts


@router.get("/overview", response_model=DashboardStats)
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Admin Dashboard KPI Summary:
    - Total students
    - Average attendance
    - Students below 75%
    - Average CGPA
    - Placement drives
    - Eligible students
    - High/Medium/Low readiness distribution
    """
    students = db.query(Student).all()
    total = len(students)
    if total == 0:
        return DashboardStats(
            total_students=0,
            average_attendance=0.0,
            students_below_75=0,
            average_cgpa=0.0,
            placed_count=0,
            eligible_count=0,
            at_risk_count=0,
            active_placement_drives=0,
            readiness_distribution={"High Readiness": 0, "Medium Readiness": 0, "Low Readiness": 0}
        )

    avg_att = sum(s.attendance_percentage for s in students) / total
    avg_cgpa = sum(s.cgpa for s in students) / total
    students_below_75 = sum(1 for s in students if s.attendance_percentage < 75.0)

    placed = sum(1 for s in students if s.placement_status == "Placed")
    
    # Students eligible for at least 1 active drive
    active_drives = db.query(PlacementDrive).filter(
        PlacementDrive.status.in_(["Upcoming", "Ongoing"])
    ).all()

    eligible_student_ids = set()
    for drive in active_drives:
        for s in students:
            eval_res = evaluate_student_eligibility(s, drive)
            if eval_res["is_eligible"]:
                eligible_student_ids.add(s.id)

    eligible_count = len(eligible_student_ids) if eligible_student_ids else sum(1 for s in students if s.placement_status == "Eligible")

    # At risk = Attendance < 75% or Backlogs > 0
    at_risk = sum(1 for s in students if s.attendance_percentage < 75.0 or s.backlogs > 0)

    # ML Readiness distribution
    readiness_dist = _calculate_ml_readiness_distribution(students)

    return DashboardStats(
        total_students=total,
        average_attendance=round(avg_att, 1),
        students_below_75=students_below_75,
        average_cgpa=round(avg_cgpa, 2),
        placed_count=placed,
        eligible_count=eligible_count,
        at_risk_count=at_risk,
        active_placement_drives=len(active_drives),
        readiness_distribution=readiness_dist
    )


@router.get("/charts")
def get_charts_data(db: Session = Depends(get_db)):
    """Chart.js dataset feeds for the Admin Dashboard."""
    students = db.query(Student).all()
    
    # 1. Attendance Distribution
    critical_att = sum(1 for s in students if s.attendance_percentage < 75.0)
    moderate_att = sum(1 for s in students if 75.0 <= s.attendance_percentage < 85.0)
    high_att = sum(1 for s in students if s.attendance_percentage >= 85.0)

    # 2. ML Placement Readiness Distribution
    readiness_dist = _calculate_ml_readiness_distribution(students)

    # 3. Department Comparison
    dept_map = {}
    for s in students:
        dept = s.branch
        if dept not in dept_map:
            dept_map[dept] = {"cgpa_sum": 0.0, "att_sum": 0.0, "count": 0}
        dept_map[dept]["cgpa_sum"] += s.cgpa
        dept_map[dept]["att_sum"] += s.attendance_percentage
        dept_map[dept]["count"] += 1

    dept_labels = list(dept_map.keys())
    dept_cgpa = [
        round(dept_map[d]["cgpa_sum"] / dept_map[d]["count"], 2) if dept_map[d]["count"] else 0
        for d in dept_labels
    ]
    dept_att = [
        round(dept_map[d]["att_sum"] / dept_map[d]["count"], 1) if dept_map[d]["count"] else 0
        for d in dept_labels
    ]

    # 4. Placement Drives Candidate Eligibility Breakdown
    active_drives = db.query(PlacementDrive).all()
    drive_names = []
    drive_eligible_counts = []
    drive_ineligible_counts = []

    for d in active_drives:
        drive_names.append(f"{d.company_name} ({d.job_role[:12]}..)" if len(d.job_role) > 12 else f"{d.company_name} ({d.job_role})")
        elig_cnt = 0
        inelig_cnt = 0
        for s in students:
            eval_res = evaluate_student_eligibility(s, d)
            if eval_res["is_eligible"]:
                elig_cnt += 1
            else:
                inelig_cnt += 1
        drive_eligible_counts.append(elig_cnt)
        drive_ineligible_counts.append(inelig_cnt)

    return {
        "attendance_distribution": {
            "labels": ["Below 75% (Critical)", "75% - 85% (Moderate)", "Above 85% (Good)"],
            "data": [critical_att, moderate_att, high_att]
        },
        "readiness_distribution": {
            "labels": ["High Readiness", "Medium Readiness", "Low Readiness"],
            "data": [
                readiness_dist.get("High Readiness", 0),
                readiness_dist.get("Medium Readiness", 0),
                readiness_dist.get("Low Readiness", 0)
            ]
        },
        "department_analysis": {
            "labels": dept_labels,
            "avg_cgpa": dept_cgpa,
            "avg_attendance": dept_att
        },
        "drive_eligibility_breakdown": {
            "labels": drive_names,
            "eligible": drive_eligible_counts,
            "ineligible": drive_ineligible_counts
        }
    }


@router.get("/at-risk")
def get_at_risk_students(db: Session = Depends(get_db)):
    """Return students with attendance < 75% or backlogs > 0 for urgent intervention."""
    at_risk = db.query(Student).filter(
        (Student.attendance_percentage < 75.0) | (Student.backlogs > 0)
    ).all()
    
    return [
        {
            "id": s.id,
            "roll_number": s.student_id,
            "name": s.name,
            "department": s.branch,
            "attendance_percentage": s.attendance_percentage,
            "cgpa": s.cgpa,
            "backlogs": s.backlogs,
            "reason": (
                "Low Attendance & Backlogs" if s.attendance_percentage < 75.0 and s.backlogs > 0
                else ("Low Attendance (<75%)" if s.attendance_percentage < 75.0 else f"{s.backlogs} Active Backlog(s)")
            )
        }
        for s in at_risk
    ]
