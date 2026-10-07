"""
Recommendation Engine for Student Analytics & Placement Intelligence.
Generates personalized, actionable improvement suggestions based on:
- Attendance records & subject-level defaulter analysis
- Attendance ML Risk Prediction (Scikit-Learn)
- Academic Performance (CGPA, Projects, Certifications, Backlogs)
- Technical Skills & Portfolio Assets (GitHub, Portfolio)
- Placement Readiness ML Prediction (Scikit-Learn)
- Placement Drive Eligibility Engine Results (Company-by-Company checks)
"""

from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.models import Student, Attendance, PlacementDrive
from backend.routes.placement import evaluate_student_eligibility
from backend.ml.predictor import predict_attendance_risk, predict_placement_readiness


def generate_student_recommendations(db: Session, student_id: int) -> Dict[str, Any]:
    """
    Generate comprehensive, personalized recommendations for a student.
    Returns:
    - profile: Student basic info
    - overall_attendance: Attendance summary & risk
    - attendance_recommendations: Specific subject-level classes to attend
    - readiness_recommendations: Project, skill, and certification advice based on ML tier
    - placement_drive_recommendations: Eligible & Ineligible drive specific advice
    - all_recommendations: Unified prioritized list of recommendations
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return {"error": f"Student with ID {student_id} not found"}

    all_recommendations: List[Dict[str, Any]] = []

    # -------------------------------------------------------------
    # 1. ATTENDANCE ANALYSIS & SUBJECT-WISE RECOVERY RECOMMENDATIONS
    # -------------------------------------------------------------
    att_records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    attendance_recs: List[Dict[str, Any]] = []

    if att_records:
        total_sched = sum(r.total_classes for r in att_records)
        total_att = sum(r.classes_attended for r in att_records)
        overall_pct = round((total_att / total_sched) * 100.0, 1) if total_sched > 0 else student.attendance_percentage
    else:
        total_sched = 60
        total_att = int(round((student.attendance_percentage / 100.0) * total_sched))
        overall_pct = student.attendance_percentage

    # ML Attendance Risk Prediction
    ml_att_pred = predict_attendance_risk({
        "total_classes": total_sched,
        "classes_attended": total_att,
        "previous_attendance": overall_pct,
        "recent_attendance": overall_pct
    })
    att_risk = ml_att_pred.get("predicted_risk", "Medium")

    # Analyze individual subjects
    critical_subjects = []
    for r in att_records:
        if r.attendance_percentage < 75.0:
            # Classes needed formula: 3*T - 4*A
            needed = r.classes_required_for_75
            critical_subjects.append({
                "subject": r.subject,
                "current_percentage": r.attendance_percentage,
                "classes_attended": r.classes_attended,
                "total_classes": r.total_classes,
                "classes_needed": needed
            })

            msg = (
                f"Your attendance in {r.subject} is below 75% ({r.attendance_percentage}%). "
                f"Attend the next {needed} classes to improve your attendance."
            )
            rec_item = {
                "category": "Attendance Recovery",
                "type": "alert",
                "subject": r.subject,
                "title": f"Attendance Alert: {r.subject}",
                "message": msg,
                "metric": f"{r.attendance_percentage}% (Required: ≥75%)",
                "action_cta": f"Attend next {needed} consecutive lectures",
                "priority": 1
            }
            attendance_recs.append(rec_item)
            all_recommendations.append(rec_item)

    # Overall attendance advice
    if overall_pct < 75.0:
        overall_needed = max(0, 3 * total_sched - 4 * total_att)
        all_recommendations.append({
            "category": "Attendance Recovery",
            "type": "alert",
            "title": "Overall Attendance Defaulter Warning",
            "message": (
                f"Your cumulative attendance is {overall_pct}%, which is in the statutory detention zone (<75%). "
                f"You need to attend at least {overall_needed} more scheduled sessions across all subjects without missing any to regain hall ticket clearance."
            ),
            "metric": f"{overall_pct}%",
            "action_cta": "Contact department proctor immediately",
            "priority": 1
        })
    elif 75.0 <= overall_pct < 80.0:
        all_recommendations.append({
            "category": "Attendance Recovery",
            "type": "warning",
            "title": "Borderline Attendance Notice",
            "message": (
                f"Your overall attendance is currently {overall_pct}%. Missing just 2 more classes could drop you into the defaulter list. Maintain strict regularity."
            ),
            "metric": f"{overall_pct}%",
            "action_cta": "Maintain attendance above 80%",
            "priority": 2
        })
    else:
        all_recommendations.append({
            "category": "Attendance Recovery",
            "type": "success",
            "title": "Excellent Attendance Standing",
            "message": f"Your overall attendance is {overall_pct}%, safely exceeding mandatory university regulations (75%). Keep it up!",
            "metric": f"{overall_pct}%",
            "action_cta": "Continue consistent attendance",
            "priority": 3
        })

    # -------------------------------------------------------------
    # 2. PLACEMENT READINESS ML & ACADEMIC ENHANCEMENT RECOMMENDATIONS
    # -------------------------------------------------------------
    skills_raw = student.technical_skills or ""
    skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]
    skills_count = len(skills_list)

    profiles_score = 0
    if student.github_profile and student.github_profile.strip():
        profiles_score += 1
    if student.portfolio_profile and student.portfolio_profile.strip():
        profiles_score += 1

    ml_place_pred = predict_placement_readiness({
        "attendance": overall_pct,
        "cgpa": student.cgpa,
        "number_of_projects": student.number_of_projects,
        "certifications": student.certifications,
        "internship": student.internship,
        "technical_skills_count": skills_count,
        "backlog_count": student.backlogs,
        "github_portfolio_availability": profiles_score
    })
    readiness_tier = ml_place_pred.get("readiness_category", "Medium Readiness")

    readiness_recs: List[Dict[str, Any]] = []

    # Project recommendations
    if "Medium" in readiness_tier:
        proj_msg = "Your placement readiness is Medium. Consider adding one more relevant project."
        rec_item = {
            "category": "Placement Readiness",
            "type": "warning",
            "title": "Expand Capstone Projects",
            "message": proj_msg,
            "metric": f"{student.number_of_projects} Projects Completed",
            "action_cta": "Develop 1 full-stack/domain project",
            "priority": 2
        }
        readiness_recs.append(rec_item)
        all_recommendations.append(rec_item)
    elif "Low" in readiness_tier:
        rec_item = {
            "category": "Placement Readiness",
            "type": "alert",
            "title": "Low Placement Readiness Intervention",
            "message": (
                "Your placement readiness is classified as Low. Focus on completing 2 robust technical projects and clearing any pending academic backlogs before campus drives initiate."
            ),
            "metric": f"{student.number_of_projects} Projects • {student.backlogs} Backlogs",
            "action_cta": "Schedule faculty mentor counseling",
            "priority": 1
        }
        readiness_recs.append(rec_item)
        all_recommendations.append(rec_item)
    else:
        rec_item = {
            "category": "Placement Readiness",
            "type": "success",
            "title": "High Placement Readiness",
            "message": "Your profile demonstrates High Placement Readiness! Focus on mock technical interviews, Data Structures & Algorithms, and system design rounds for premium Tier-1 companies.",
            "metric": f"CGPA: {student.cgpa} • {student.number_of_projects} Projects",
            "action_cta": "Practice advanced coding problems",
            "priority": 3
        }
        readiness_recs.append(rec_item)
        all_recommendations.append(rec_item)

    # Backlogs
    if student.backlogs > 0:
        all_recommendations.append({
            "category": "Academic Enhancement",
            "type": "alert",
            "title": "Active Backlogs Clearance Priority",
            "message": (
                f"You have {student.backlogs} active backlog(s). Over 85% of recruiting companies require 0 active backlogs. Focus on clearing these in the upcoming supplementary examination."
            ),
            "metric": f"{student.backlogs} Active Backlog(s)",
            "action_cta": "Register for remedial examination",
            "priority": 1
        })

    # Certifications & Internship
    if student.certifications == 0:
        all_recommendations.append({
            "category": "Academic Enhancement",
            "type": "warning",
            "title": "Earn Industry Certification",
            "message": "You currently have 0 industry certifications. Earning a credential from AWS, Google Cloud, Microsoft, or Oracle significantly strengthens resume shortlisting.",
            "metric": "0 Certifications",
            "action_cta": "Enroll in a verified certification track",
            "priority": 2
        })

    is_intern = (
        "yes" in student.internship.lower() or "intern" in student.internship.lower()
        if isinstance(student.internship, str) else False
    )
    if not is_intern:
        all_recommendations.append({
            "category": "Academic Enhancement",
            "type": "info",
            "title": "Industry Internship Opportunity",
            "message": "Having no prior internship on record reduces corporate exposure. Apply for summer internships or open-source fellowships to gain production experience.",
            "metric": "No Internship",
            "action_cta": "Browse placement cell internship portal",
            "priority": 2
        })

    # GitHub / Portfolio
    if profiles_score < 2:
        missing_profiles = []
        if not student.github_profile or not student.github_profile.strip():
            missing_profiles.append("GitHub Profile")
        if not student.portfolio_profile or not student.portfolio_profile.strip():
            missing_profiles.append("Live Portfolio Website")

        all_recommendations.append({
            "category": "Academic Enhancement",
            "type": "info",
            "title": "Publish Technical Portfolio",
            "message": f"Showcase your code by linking your {' and '.join(missing_profiles)}. Recruiters frequently inspect GitHub commits and project demos.",
            "metric": f"{profiles_score}/2 Profiles Active",
            "action_cta": "Update GitHub and portfolio links",
            "priority": 3
        })

    # -------------------------------------------------------------
    # 3. PLACEMENT DRIVES ELIGIBILITY EVALUATION & RECOMMENDATIONS
    # -------------------------------------------------------------
    active_drives = db.query(PlacementDrive).all()
    eligible_drives_list: List[Dict[str, Any]] = []
    not_eligible_drives_list: List[Dict[str, Any]] = []

    for drive in active_drives:
        eval_res = evaluate_student_eligibility(student, drive)
        drive_info = {
            "drive_id": drive.id,
            "company_name": drive.company_name,
            "job_role": drive.job_role,
            "package_lpa": drive.package_lpa,
            "drive_date": drive.drive_date,
            "status": drive.status,
            "is_eligible": eval_res["is_eligible"],
            "verdict_badge": eval_res["verdict_badge"],
            "reasons": eval_res["reasons"],
            "passed_criteria": eval_res["passed_criteria"],
            "failed_criteria": eval_res["failed_criteria"]
        }

        if eval_res["is_eligible"]:
            eligible_drives_list.append(drive_info)
            # Add recommendation matching prompt example:
            # "You are eligible for ABC Technologies based on the defined placement criteria."
            rec_item = {
                "category": "Placement Drives",
                "type": "success",
                "drive_id": drive.id,
                "company_name": drive.company_name,
                "title": f"Eligible for {drive.company_name}",
                "message": f"You are eligible for {drive.company_name} based on the defined placement criteria.",
                "metric": f"Role: {drive.job_role} • Package: {drive.package_lpa} LPA",
                "action_cta": f"Register for {drive.company_name} campus drive",
                "priority": 2
            }
            all_recommendations.append(rec_item)
        else:
            not_eligible_drives_list.append(drive_info)
            # Find primary failed reason for the message
            # e.g.: "You are not eligible for XYZ because your CGPA is below the required threshold."
            primary_reason = ""
            for fc in eval_res["failed_criteria"]:
                crit = fc["criterion"]
                if crit == "CGPA":
                    primary_reason = f"your CGPA ({fc['student_value']}) is below the required threshold ({fc['required_value']})"
                    break
                elif crit == "Attendance":
                    primary_reason = f"your attendance ({fc['student_value']}) is below the minimum threshold ({fc['required_value']})"
                    break
                elif crit == "Backlogs":
                    primary_reason = f"you have active backlogs ({fc['student_value']}), whereas maximum permitted is {fc['required_value']}"
                    break
                elif crit == "Required Skills":
                    primary_reason = f"you lack the required skill(s): {fc['required_value']}"
                    break
                elif crit == "Projects":
                    primary_reason = f"you have {fc['student_value']} project(s), but minimum {fc['required_value']} is required"
                    break

            if not primary_reason and eval_res["failed_criteria"]:
                primary_reason = eval_res["failed_criteria"][0]["message"]

            rec_item = {
                "category": "Placement Drives",
                "type": "alert",
                "drive_id": drive.id,
                "company_name": drive.company_name,
                "title": f"Ineligible for {drive.company_name}",
                "message": f"You are not eligible for {drive.company_name} because {primary_reason}.",
                "metric": f"Role: {drive.job_role} • Package: {drive.package_lpa} LPA",
                "action_cta": f"Review {drive.company_name} prerequisites",
                "priority": 1
            }
            all_recommendations.append(rec_item)

    # Sort recommendations by priority (1 = Urgent/Alert first, 2 = Warning, 3 = Info/Success)
    all_recommendations.sort(key=lambda x: x.get("priority", 2))

    return {
        "student_id": student.id,
        "student_name": student.name,
        "roll_number": student.student_id,
        "branch": student.branch,
        "cgpa": student.cgpa,
        "overall_attendance": overall_pct,
        "attendance_risk": att_risk,
        "placement_readiness": readiness_tier,
        "summary": {
            "total_recommendations": len(all_recommendations),
            "urgent_actions_count": sum(1 for r in all_recommendations if r["priority"] == 1),
            "critical_subjects_count": len(critical_subjects),
            "eligible_drives_count": len(eligible_drives_list),
            "ineligible_drives_count": len(not_eligible_drives_list)
        },
        "critical_subjects": critical_subjects,
        "eligible_drives": eligible_drives_list,
        "not_eligible_drives": not_eligible_drives_list,
        "recommendations": all_recommendations
    }
