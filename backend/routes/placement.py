from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PlacementDrive, Student
from backend.schemas import (
    PlacementDriveCreate,
    PlacementDriveUpdate,
    PlacementDriveResponse,
    StudentResponse,
    CriterionCheckResult,
    EligibilityEvaluationResponse,
    StudentEligibilitySummary,
    DriveEligibleStudentsReport,
)

router = APIRouter(prefix="/api/placements", tags=["Placement Drives & Eligibility Engine"])

DISCLAIMER_TEXT = (
    "Notice: Eligibility confirms the student satisfies the minimum screening thresholds for this placement drive. "
    "Passing eligibility criteria qualifies the candidate for drive participation only and DOES NOT guarantee test shortlisting, "
    "interview qualification, or final selection/job offer by the company."
)


def _check_skill_match(req_skill: str, student_skills: List[str]) -> bool:
    """Check if a required skill is matched against student's acquired skills."""
    target = req_skill.strip().lower()
    if not target:
        return True
    for s in student_skills:
        cand = s.strip().lower()
        if target == cand or target in cand or cand in target:
            return True
    return False


def evaluate_student_eligibility(student: Student, drive: PlacementDrive) -> Dict[str, Any]:
    """
    Evaluate a student's profile against the 7 placement criteria:
    1. CGPA
    2. Attendance
    3. Required Skills
    4. Number of Projects
    5. Certifications
    6. Internship
    7. Backlogs
    """
    all_criteria: List[Dict[str, Any]] = []
    reasons: List[str] = []

    # 1. CGPA
    req_cgpa = float(drive.min_cgpa)
    stu_cgpa = float(student.cgpa)
    cgpa_pass = stu_cgpa >= req_cgpa
    cgpa_msg = f"CGPA: {stu_cgpa} {'✅' if cgpa_pass else f'(required {req_cgpa})'}"
    reasons.append(cgpa_msg)
    all_criteria.append({
        "criterion": "CGPA",
        "passed": cgpa_pass,
        "student_value": f"{stu_cgpa:.2f}",
        "required_value": f"≥ {req_cgpa:.2f}",
        "message": cgpa_msg,
        "icon": "✅" if cgpa_pass else "❌"
    })

    # 2. Attendance
    req_att = float(drive.min_attendance)
    stu_att = float(student.attendance_percentage)
    att_pass = stu_att >= req_att
    att_msg = f"Attendance: {stu_att}% {'✅' if att_pass else f'(required {req_att}%)'}"
    reasons.append(att_msg)
    all_criteria.append({
        "criterion": "Attendance",
        "passed": att_pass,
        "student_value": f"{stu_att:.1f}%",
        "required_value": f"≥ {req_att:.1f}%",
        "message": att_msg,
        "icon": "✅" if att_pass else "❌"
    })

    # 3. Required Skills
    drive_skills_raw = drive.required_skills or ""
    req_skills_list = [s.strip() for s in drive_skills_raw.split(",") if s.strip()]
    stu_skills_raw = student.technical_skills or ""
    stu_skills_list = [s.strip() for s in stu_skills_raw.split(",") if s.strip()]

    if not req_skills_list:
        skills_pass = True
        skills_summary = "Skills: No mandatory skill prerequisites ✅"
        skills_student_val = stu_skills_raw or "None"
        skills_req_val = "None specified"
    else:
        skill_status_parts = []
        missing_skills = []
        for req_skill in req_skills_list:
            if _check_skill_match(req_skill, stu_skills_list):
                skill_status_parts.append(f"{req_skill} ✅")
            else:
                skill_status_parts.append(f"{req_skill} ❌")
                missing_skills.append(req_skill)

        skills_pass = len(missing_skills) == 0
        if skills_pass:
            skills_summary = f"Skills: {', '.join(skill_status_parts)}"
        else:
            skills_summary = f"Skills: {', '.join(skill_status_parts)} (missing: {', '.join(missing_skills)})"

        skills_student_val = stu_skills_raw or "None"
        skills_req_val = ", ".join(req_skills_list)

    reasons.append(skills_summary)
    all_criteria.append({
        "criterion": "Required Skills",
        "passed": skills_pass,
        "student_value": skills_student_val,
        "required_value": skills_req_val,
        "message": skills_summary,
        "icon": "✅" if skills_pass else "❌"
    })

    # 4. Number of Projects
    req_proj = int(drive.min_projects or 0)
    stu_proj = int(student.number_of_projects or 0)
    proj_pass = stu_proj >= req_proj
    proj_msg = f"Projects: {stu_proj} {'✅' if proj_pass else f'(required {req_proj})'}"
    reasons.append(proj_msg)
    all_criteria.append({
        "criterion": "Projects",
        "passed": proj_pass,
        "student_value": str(stu_proj),
        "required_value": f"≥ {req_proj}",
        "message": proj_msg,
        "icon": "✅" if proj_pass else "❌"
    })

    # 5. Certifications
    req_certs = int(drive.min_certifications or 0)
    stu_certs = int(student.certifications or 0)
    certs_pass = stu_certs >= req_certs
    certs_msg = f"Certifications: {stu_certs} {'✅' if certs_pass else f'(required {req_certs})'}"
    reasons.append(certs_msg)
    all_criteria.append({
        "criterion": "Certifications",
        "passed": certs_pass,
        "student_value": str(stu_certs),
        "required_value": f"≥ {req_certs}",
        "message": certs_msg,
        "icon": "✅" if certs_pass else "❌"
    })

    # 6. Internship
    drive_intern_req = (drive.internship_required or "No").strip().lower()
    stu_intern_val = student.internship or "No"
    has_internship = bool("yes" in stu_intern_val.lower() or "intern" in stu_intern_val.lower())

    if drive_intern_req == "yes":
        intern_pass = has_internship
        intern_msg = f"Internship: {stu_intern_val} {'✅' if intern_pass else '(required Yes)'}"
        intern_req_disp = "Mandatory (Yes)"
    else:
        intern_pass = True
        intern_msg = f"Internship: {stu_intern_val} (Not mandatory) ✅"
        intern_req_disp = "Not Required"

    reasons.append(intern_msg)
    all_criteria.append({
        "criterion": "Internship",
        "passed": intern_pass,
        "student_value": stu_intern_val,
        "required_value": intern_req_disp,
        "message": intern_msg,
        "icon": "✅" if intern_pass else "❌"
    })

    # 7. Backlogs
    req_max_backlogs = int(drive.max_backlogs or 0)
    stu_backlogs = int(student.backlogs or 0)
    backlogs_pass = stu_backlogs <= req_max_backlogs
    backlogs_msg = f"Backlogs: {stu_backlogs} {'✅' if backlogs_pass else f'(required {req_max_backlogs})'}"
    reasons.append(backlogs_msg)
    all_criteria.append({
        "criterion": "Backlogs",
        "passed": backlogs_pass,
        "student_value": str(stu_backlogs),
        "required_value": f"≤ {req_max_backlogs}",
        "message": backlogs_msg,
        "icon": "✅" if backlogs_pass else "❌"
    })

    # Aggregate Evaluation
    passed_criteria = [c for c in all_criteria if c["passed"]]
    failed_criteria = [c for c in all_criteria if not c["passed"]]
    is_eligible = len(failed_criteria) == 0

    status_str = "ELIGIBLE" if is_eligible else "NOT ELIGIBLE"
    verdict_badge = "✅ Eligible based on placement criteria" if is_eligible else "❌ Not Eligible"

    return {
        "student_id": student.id,
        "student_roll": student.student_id,
        "student_name": student.name,
        "student_email": student.email,
        "student_branch": student.branch,
        "drive_id": drive.id,
        "company_name": drive.company_name,
        "job_role": drive.job_role,
        "package_lpa": drive.package_lpa,
        "status": status_str,
        "is_eligible": is_eligible,
        "verdict_badge": verdict_badge,
        "reasons": reasons,
        "passed_criteria": passed_criteria,
        "failed_criteria": failed_criteria,
        "all_criteria": all_criteria,
        "disclaimer": DISCLAIMER_TEXT
    }


# ----------------- Drive CRUD Endpoints -----------------

@router.get("/drives", response_model=List[PlacementDriveResponse])
def get_placement_drives(db: Session = Depends(get_db)):
    """Retrieve all placement drives sorted by date descending."""
    return db.query(PlacementDrive).order_by(PlacementDrive.drive_date.desc()).all()


@router.post("/drives", response_model=PlacementDriveResponse, status_code=status.HTTP_201_CREATED)
def create_placement_drive(drive_in: PlacementDriveCreate, db: Session = Depends(get_db)):
    """Schedule a new placement drive with complete 7-point criteria thresholds."""
    drive = PlacementDrive(**drive_in.model_dump())
    db.add(drive)
    db.commit()
    db.refresh(drive)
    return drive


@router.get("/drives/{drive_id}", response_model=PlacementDriveResponse)
def get_placement_drive_by_id(drive_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single placement drive."""
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    return drive


@router.put("/drives/{drive_id}", response_model=PlacementDriveResponse)
def update_placement_drive(drive_id: int, drive_in: PlacementDriveUpdate, db: Session = Depends(get_db)):
    """Update criteria or metadata for a placement drive."""
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    update_data = drive_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(drive, field, val)

    db.commit()
    db.refresh(drive)
    return drive


@router.delete("/drives/{drive_id}")
def delete_placement_drive(drive_id: int, db: Session = Depends(get_db)):
    """Delete a placement drive."""
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    db.delete(drive)
    db.commit()
    return {"message": f"Placement drive '{drive.company_name}' deleted successfully"}


# ----------------- Placement Eligibility Engine Endpoints -----------------

@router.get("/evaluate", response_model=EligibilityEvaluationResponse)
def evaluate_single_student(
    student_id: int = Query(..., description="ID of student to evaluate"),
    drive_id: int = Query(..., description="ID of placement drive"),
    db: Session = Depends(get_db)
):
    """
    Compare a student's profile against a placement drive's 7 criteria.
    Returns ELIGIBLE or NOT ELIGIBLE, with exact passed/failed reasons and disclaimer.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")

    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail=f"Placement drive with ID {drive_id} not found")

    evaluation = evaluate_student_eligibility(student, drive)
    return evaluation


@router.get("/drives/{drive_id}/eligible-report", response_model=DriveEligibleStudentsReport)
def get_drive_eligibility_report(drive_id: int, db: Session = Depends(get_db)):
    """
    Generate an eligibility roster for all students for a selected placement drive.
    Returns drive details, candidate summaries, pass/fail counts, and reasons.
    """
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail=f"Placement drive with ID {drive_id} not found")

    students = db.query(Student).order_by(Student.student_id).all()
    summaries: List[StudentEligibilitySummary] = []
    eligible_count = 0

    for s in students:
        eval_result = evaluate_student_eligibility(s, drive)
        is_elig = eval_result["is_eligible"]
        if is_elig:
            eligible_count += 1

        failed_reasons = [c["message"] for c in eval_result["failed_criteria"]]

        summaries.append(StudentEligibilitySummary(
            id=s.id,
            student_id=s.student_id,
            name=s.name,
            branch=s.branch,
            cgpa=s.cgpa,
            attendance_percentage=s.attendance_percentage,
            technical_skills=s.technical_skills or "",
            number_of_projects=s.number_of_projects,
            certifications=s.certifications,
            internship=s.internship or "No",
            backlogs=s.backlogs,
            is_eligible=is_elig,
            status="ELIGIBLE" if is_elig else "NOT ELIGIBLE",
            passed_count=len(eval_result["passed_criteria"]),
            failed_count=len(eval_result["failed_criteria"]),
            failed_reasons=failed_reasons
        ))

    total = len(students)
    rate = round((eligible_count / total * 100), 1) if total > 0 else 0.0

    return DriveEligibleStudentsReport(
        drive=PlacementDriveResponse.model_validate(drive),
        total_evaluated=total,
        eligible_count=eligible_count,
        ineligible_count=total - eligible_count,
        eligibility_rate_percentage=rate,
        students=summaries,
        disclaimer=DISCLAIMER_TEXT
    )


@router.get("/drives/{drive_id}/eligible", response_model=List[StudentResponse])
def get_eligible_students_for_drive(drive_id: int, db: Session = Depends(get_db)):
    """
    Backward-compatible endpoint returning student objects that meet all 7 drive criteria.
    """
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    students = db.query(Student).all()
    eligible_students = []
    for s in students:
        eval_res = evaluate_student_eligibility(s, drive)
        if eval_res["is_eligible"]:
            eligible_students.append(s)

    return eligible_students


@router.get("/students/{student_id}/drives-evaluation")
def evaluate_student_against_all_drives(student_id: int, db: Session = Depends(get_db)):
    """Evaluate one student across all active/upcoming placement drives."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")

    drives = db.query(PlacementDrive).order_by(PlacementDrive.drive_date.desc()).all()
    results = [evaluate_student_eligibility(student, d) for d in drives]
    return {
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "cgpa": student.cgpa,
            "attendance": student.attendance_percentage,
            "skills": student.technical_skills,
            "projects": student.number_of_projects,
            "certs": student.certifications,
            "internship": student.internship,
            "backlogs": student.backlogs
        },
        "total_drives": len(drives),
        "eligible_drives_count": sum(1 for r in results if r["is_eligible"]),
        "evaluations": results,
        "disclaimer": DISCLAIMER_TEXT
    }
