import os
from typing import List, Optional, Dict, Any
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Student, Attendance, PerformanceRecord

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "frontend"))

router = APIRouter(tags=["Performance Analytics"])


def calculate_profile_readiness_score(student: Student, attendance_pct: float) -> float:
    """
    Calculate an academic & employability readiness score (0 to 100) combining:
    - CGPA (max 35 pts)
    - Attendance compliance (max 20 pts)
    - Projects (max 15 pts)
    - Certifications (max 10 pts)
    - Internship (max 10 pts)
    - GitHub & Portfolio presence (max 10 pts)
    Note: Purely a heuristic analytical indicator, not machine learning.
    """
    score = 0.0

    # 1. CGPA: 10 CGPA = 35 points
    score += min(35.0, (student.cgpa / 10.0) * 35.0)

    # 2. Attendance: 100% = 20 points
    score += min(20.0, (attendance_pct / 100.0) * 20.0)

    # 3. Projects: each project up to 4 projects = 3.75 pts (max 15)
    score += min(15.0, student.number_of_projects * 3.75)

    # 4. Certifications: each cert up to 3 certs = 3.33 pts (max 10)
    score += min(10.0, student.certifications * 3.33)

    # 5. Internship: active internship = 10 pts
    internship_str = (student.internship or "").lower()
    if "yes" in internship_str or "intern" in internship_str:
        score += 10.0

    # 6. Online Profiles: 5 pts for GitHub, 5 pts for Portfolio (max 10)
    if student.github_profile and student.github_profile.strip():
        score += 5.0
    if student.portfolio_profile and student.portfolio_profile.strip():
        score += 5.0

    # Backlog penalty: deduct 5 points per active backlog
    score -= min(15.0, student.backlogs * 5.0)

    return round(max(0.0, min(100.0, score)), 1)


# ----------------- 1. Performance Dashboard Analytics -----------------
@router.get("/performance/analytics")
def get_performance_analytics(
    request: Request,
    branch: Optional[str] = Query(None, description="Filter by branch"),
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db)
):
    """
    Aggregated performance analytics:
    - CGPA analysis and tiers
    - Number of projects statistics
    - Certifications earned
    - Technical skills frequency and popularity
    - Internship status
    - GitHub & portfolio presence
    - Backlogs clearance rate
    - Branch-wise comparison
    - Top student leaderboard
    """
    query = db.query(Student)
    if branch and branch != "All":
        query = query.filter(Student.branch == branch)
    if year:
        query = query.filter(Student.year == year)

    students = query.all()
    total_students = len(students)

    if total_students == 0:
        return {
            "total_students": 0,
            "cgpa_stats": {"average": 0.0, "max": 0.0, "min": 0.0, "brackets": {}},
            "projects_stats": {"total": 0, "average": 0.0, "distribution": {}},
            "certifications_stats": {"total": 0, "average": 0.0},
            "skills_stats": {"top_skills": [], "total_unique_skills": 0},
            "internship_stats": {"with_internship": 0, "without_internship": 0, "rate_percentage": 0.0},
            "profiles_stats": {"with_github": 0, "with_portfolio": 0, "github_percentage": 0.0, "portfolio_percentage": 0.0},
            "backlogs_stats": {"zero_backlogs": 0, "active_backlogs": 0, "clear_rate_percentage": 0.0},
            "branch_performance": [],
            "leaderboard": []
        }

    # 1. CGPA Analytics
    cgpas = [s.cgpa for s in students]
    avg_cgpa = round(sum(cgpas) / total_students, 2)
    max_cgpa = round(max(cgpas), 2)
    min_cgpa = round(min(cgpas), 2)

    cgpa_brackets = {
        "Elite (≥ 9.0)": sum(1 for c in cgpas if c >= 9.0),
        "Good (8.0 - 8.9)": sum(1 for c in cgpas if 8.0 <= c < 9.0),
        "Average (7.0 - 7.9)": sum(1 for c in cgpas if 7.0 <= c < 8.0),
        "Needs Attention (< 7.0)": sum(1 for c in cgpas if c < 7.0)
    }

    # 2. Number of Projects Analytics
    projects_list = [s.number_of_projects for s in students]
    total_projects = sum(projects_list)
    avg_projects = round(total_projects / total_students, 1)
    projects_dist = {
        "0 Projects": sum(1 for p in projects_list if p == 0),
        "1 - 2 Projects": sum(1 for p in projects_list if 1 <= p <= 2),
        "3 - 4 Projects": sum(1 for p in projects_list if 3 <= p <= 4),
        "5+ Projects": sum(1 for p in projects_list if p >= 5),
    }

    # 3. Certifications Analytics
    certs_list = [s.certifications for s in students]
    total_certs = sum(certs_list)
    avg_certs = round(total_certs / total_students, 1)

    # 4. Technical Skills Frequency
    all_skills = []
    for s in students:
        if s.technical_skills:
            parts = [p.strip() for p in s.technical_skills.split(",") if p.strip()]
            all_skills.extend(parts)

    skill_counts = Counter(all_skills)
    top_skills = [{"skill": skill, "count": count} for skill, count in skill_counts.most_common(10)]

    # 5. Internship Status
    with_internship = sum(1 for s in students if "yes" in (s.internship or "").lower() or "intern" in (s.internship or "").lower())
    without_internship = total_students - with_internship
    internship_rate = round((with_internship / total_students) * 100, 1)

    # 6. GitHub / Portfolio Availability
    with_github = sum(1 for s in students if bool(s.github_profile and s.github_profile.strip()))
    with_portfolio = sum(1 for s in students if bool(s.portfolio_profile and s.portfolio_profile.strip()))
    github_rate = round((with_github / total_students) * 100, 1)
    portfolio_rate = round((with_portfolio / total_students) * 100, 1)

    # 7. Backlog Status
    zero_backlogs = sum(1 for s in students if s.backlogs == 0)
    with_backlogs = total_students - zero_backlogs
    clear_rate = round((zero_backlogs / total_students) * 100, 1)

    # 8. Branch Performance Comparison
    branch_map: Dict[str, Dict[str, Any]] = {}
    for s in students:
        b = s.branch
        if b not in branch_map:
            branch_map[b] = {
                "branch": b,
                "count": 0,
                "cgpa_sum": 0.0,
                "proj_sum": 0,
                "cert_sum": 0,
                "intern_count": 0
            }
        branch_map[b]["count"] += 1
        branch_map[b]["cgpa_sum"] += s.cgpa
        branch_map[b]["proj_sum"] += s.number_of_projects
        branch_map[b]["cert_sum"] += s.certifications
        if "yes" in (s.internship or "").lower() or "intern" in (s.internship or "").lower():
            branch_map[b]["intern_count"] += 1

    branch_performance = []
    for b_name, d in branch_map.items():
        cnt = d["count"]
        branch_performance.append({
            "branch": b_name,
            "student_count": cnt,
            "avg_cgpa": round(d["cgpa_sum"] / cnt, 2) if cnt else 0.0,
            "avg_projects": round(d["proj_sum"] / cnt, 1) if cnt else 0.0,
            "avg_certifications": round(d["cert_sum"] / cnt, 1) if cnt else 0.0,
            "internship_rate": round((d["intern_count"] / cnt) * 100, 1) if cnt else 0.0
        })

    # 9. Top Leaderboard Students
    leaderboard = []
    for s in students:
        readiness = calculate_profile_readiness_score(s, s.attendance_percentage)
        leaderboard.append({
            "id": s.id,
            "student_id": s.student_id,
            "name": s.name,
            "branch": s.branch,
            "cgpa": s.cgpa,
            "attendance_percentage": s.attendance_percentage,
            "number_of_projects": s.number_of_projects,
            "certifications": s.certifications,
            "internship": s.internship,
            "backlogs": s.backlogs,
            "has_github": bool(s.github_profile and s.github_profile.strip()),
            "has_portfolio": bool(s.portfolio_profile and s.portfolio_profile.strip()),
            "readiness_score": readiness,
            "placement_status": s.placement_status
        })

    leaderboard.sort(key=lambda x: x["readiness_score"], reverse=True)

    return {
        "total_students": total_students,
        "cgpa_stats": {
            "average": avg_cgpa,
            "max": max_cgpa,
            "min": min_cgpa,
            "brackets": cgpa_brackets
        },
        "projects_stats": {
            "total": total_projects,
            "average": avg_projects,
            "distribution": projects_dist
        },
        "certifications_stats": {
            "total": total_certs,
            "average": avg_certs
        },
        "skills_stats": {
            "top_skills": top_skills,
            "total_unique_skills": len(skill_counts)
        },
        "internship_stats": {
            "with_internship": with_internship,
            "without_internship": without_internship,
            "rate_percentage": internship_rate
        },
        "profiles_stats": {
            "with_github": with_github,
            "with_portfolio": with_portfolio,
            "github_percentage": github_rate,
            "portfolio_percentage": portfolio_rate
        },
        "backlogs_stats": {
            "zero_backlogs": zero_backlogs,
            "active_backlogs": with_backlogs,
            "clear_rate_percentage": clear_rate
        },
        "branch_performance": branch_performance,
        "leaderboard": leaderboard
    }


# ----------------- 2. Student 360° Comprehensive Profile -----------------
@router.get("/performance/student/{student_id}")
def get_student_full_profile(
    student_id: int,
    db: Session = Depends(get_db)
):
    """
    Combined 360-degree student profile report:
    - Student Information
    - Attendance (Overall % + Subject-wise breakdown + Risk Level)
    - Academic Performance (CGPA, Backlogs, Semester records)
    - Technical Skills
    - Projects
    - Certifications
    - Internship
    - Portfolio & GitHub
    - Profile Readiness Score (Rule-based composite)
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    # 1. Attendance Records & Stats
    att_records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    total_classes = sum(r.total_classes for r in att_records)
    total_attended = sum(r.classes_attended for r in att_records)
    total_missed = sum(r.classes_missed for r in att_records)
    overall_att = round((total_attended / total_classes) * 100, 2) if total_classes > 0 else student.attendance_percentage

    if overall_att >= 85.0:
        att_risk = "Low Risk"
    elif overall_att >= 75.0:
        att_risk = "Medium Risk"
    else:
        att_risk = "High Risk"

    att_subjects = []
    classes_needed_sum = 0
    below_75_count = 0
    for r in att_records:
        if r.attendance_percentage < 75.0:
            below_75_count += 1
            classes_needed_sum += r.classes_required_for_75
        att_subjects.append({
            "subject": r.subject,
            "total_classes": r.total_classes,
            "classes_attended": r.classes_attended,
            "classes_missed": r.classes_missed,
            "attendance_percentage": round(r.attendance_percentage, 1),
            "risk_level": r.risk_level,
            "classes_required_for_75": r.classes_required_for_75
        })

    # 2. Performance Records (Semester Marks)
    perf_records = db.query(PerformanceRecord).filter(PerformanceRecord.student_id == student_id).all()
    marks_list = []
    for p in perf_records:
        marks_list.append({
            "semester": p.semester,
            "subject": p.subject,
            "internal_marks": p.internal_marks,
            "external_marks": p.external_marks,
            "total_marks": p.total_marks,
            "grade": p.grade
        })

    # 3. CGPA Tier
    if student.cgpa >= 9.0:
        cgpa_tier = "Elite (Distinction)"
    elif student.cgpa >= 8.0:
        cgpa_tier = "First Class with Distinction"
    elif student.cgpa >= 7.0:
        cgpa_tier = "First Class"
    else:
        cgpa_tier = "Needs Academic Improvement"

    # 4. Skills Parsing
    skills_list = [s.strip() for s in (student.technical_skills or "").split(",") if s.strip()]

    # 5. Readiness Score & Strengths
    readiness_score = calculate_profile_readiness_score(student, overall_att)

    strengths = []
    if student.cgpa >= 8.5:
        strengths.append("High Academic Distinction (CGPA ≥ 8.5)")
    if overall_att >= 85.0:
        strengths.append("Excellent Attendance Discipline (≥ 85%)")
    if student.number_of_projects >= 3:
        strengths.append(f"Strong Project Portfolio ({student.number_of_projects} Projects Built)")
    if student.certifications >= 2:
        strengths.append(f"Industry Certified ({student.certifications} Certifications)")
    if "yes" in (student.internship or "").lower() or "intern" in (student.internship or "").lower():
        strengths.append(f"Professional Internship Experience ({student.internship})")
    if student.github_profile and student.portfolio_profile:
        strengths.append("Complete Online Technical Footprint (GitHub & Portfolio Live)")
    if student.backlogs == 0:
        strengths.append("Zero Backlog Record (Clean Academic Slate)")

    recommendations = []
    if overall_att < 75.0:
        recommendations.append(f"Attend next {classes_needed_sum} consecutive lectures to recover 75% attendance threshold.")
    if student.backlogs > 0:
        recommendations.append(f"Enroll in remedial faculty tutorials to clear {student.backlogs} pending backlog(s).")
    if student.number_of_projects < 2:
        recommendations.append("Build and deploy at least 1-2 practical capstone projects to strengthen portfolio.")
    if not (student.github_profile and student.github_profile.strip()):
        recommendations.append("Create and link a GitHub profile to showcase code repositories to placement recruiters.")
    if not (student.portfolio_profile and student.portfolio_profile.strip()):
        recommendations.append("Deploy a personal portfolio site highlighting resume, projects, and certifications.")
    if student.certifications == 0:
        recommendations.append("Target industry-standard certifications (e.g. AWS Cloud Practitioner, Google Cloud, Oracle).")

    return {
        "student_info": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "branch": student.branch,
            "year": student.year,
            "semester": getattr(student, "semester", student.year * 2),
            "placement_status": student.placement_status
        },
        "academic_performance": {
            "cgpa": student.cgpa,
            "cgpa_tier": cgpa_tier,
            "backlogs": student.backlogs,
            "backlog_status": "Clear" if student.backlogs == 0 else f"{student.backlogs} Active Backlog(s)",
            "semester_records": marks_list
        },
        "attendance": {
            "overall_percentage": overall_att,
            "risk_level": att_risk,
            "total_classes": total_classes,
            "classes_attended": total_attended,
            "classes_missed": total_missed,
            "subjects_below_75_count": below_75_count,
            "classes_required_for_75": classes_needed_sum,
            "subject_breakdown": att_subjects
        },
        "technical_skills": {
            "skills_raw": student.technical_skills,
            "skills_list": skills_list,
            "count": len(skills_list)
        },
        "projects": {
            "number_of_projects": student.number_of_projects,
            "tier": "Advanced" if student.number_of_projects >= 4 else ("Moderate" if student.number_of_projects >= 2 else "Beginner")
        },
        "certifications": {
            "count": student.certifications,
            "tier": "Certified Performer" if student.certifications >= 2 else "Basic"
        },
        "internship": {
            "details": student.internship or "No",
            "has_internship": bool("yes" in (student.internship or "").lower() or "intern" in (student.internship or "").lower())
        },
        "online_profiles": {
            "github_profile": student.github_profile or "",
            "portfolio_profile": student.portfolio_profile or "",
            "has_github": bool(student.github_profile and student.github_profile.strip()),
            "has_portfolio": bool(student.portfolio_profile and student.portfolio_profile.strip())
        },
        "readiness_analysis": {
            "score": readiness_score,
            "verdict": (
                "Placement Ready (High Tier)" if readiness_score >= 80.0
                else ("Moderately Prepared" if readiness_score >= 65.0 else "Needs Skill & Attendance Ramp-up")
            ),
            "strengths": strengths,
            "recommendations": recommendations
        }
    }
