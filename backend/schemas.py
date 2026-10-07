from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field

# ----------------- Student Schemas -----------------
class StudentBase(BaseModel):
    student_id: str = Field(..., min_length=2, max_length=50, description="Unique Student ID (e.g., STU2023001)")
    name: str = Field(..., min_length=2, max_length=100, description="Full Name")
    email: str = Field(..., min_length=5, max_length=100, description="College Email")
    branch: str = Field(default="Computer Science", max_length=100, description="Department / Branch")
    year: int = Field(default=3, ge=1, le=4, description="Academic Year (1 to 4)")
    cgpa: float = Field(..., ge=0.0, le=10.0, description="CGPA (between 0.0 and 10.0)")
    attendance_percentage: float = Field(..., ge=0.0, le=100.0, description="Attendance (between 0.0 and 100.0)")
    technical_skills: str = Field(default="", max_length=255, description="Comma-separated technical skills")
    number_of_projects: int = Field(default=0, ge=0, description="Number of projects (>= 0)")
    certifications: int = Field(default=0, ge=0, description="Number of certifications (>= 0)")
    internship: str = Field(default="No", max_length=50, description="Internship status ('Yes', 'No', or details)")
    github_profile: Optional[str] = Field(default="", max_length=255, description="GitHub Profile URL")
    portfolio_profile: Optional[str] = Field(default="", max_length=255, description="Portfolio Profile URL")
    backlogs: int = Field(default=0, ge=0, description="Active backlogs (>= 0)")
    placement_status: Optional[str] = Field(default="Eligible", max_length=50, description="Placement status")

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    student_id: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    branch: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1, le=4)
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    attendance_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    technical_skills: Optional[str] = Field(None, max_length=255)
    number_of_projects: Optional[int] = Field(None, ge=0)
    certifications: Optional[int] = Field(None, ge=0)
    internship: Optional[str] = Field(None, max_length=50)
    github_profile: Optional[str] = Field(None, max_length=255)
    portfolio_profile: Optional[str] = Field(None, max_length=255)
    backlogs: Optional[int] = Field(None, ge=0)
    placement_status: Optional[str] = Field(None, max_length=50)

class StudentResponse(StudentBase):
    id: int
    created_at: Optional[datetime] = None

    # Backward compatibility properties for existing frontend/analytics callers
    @property
    def roll_number(self) -> str:
        return self.student_id

    @property
    def department(self) -> str:
        return self.branch

    model_config = ConfigDict(from_attributes=True)


# ----------------- Attendance Schemas -----------------
class AttendanceBase(BaseModel):
    student_id: int = Field(..., description="Numeric ID of the student")
    subject: str = Field(..., min_length=2, max_length=100, description="Subject name")
    total_classes: int = Field(..., ge=1, description="Total classes conducted")
    classes_attended: int = Field(..., ge=0, description="Classes attended")
    classes_missed: Optional[int] = Field(None, ge=0, description="Classes missed (auto-calculated if omitted)")
    attendance_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="Attendance percentage")
    date: str = Field(..., description="Date recorded (YYYY-MM-DD)")

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=2, max_length=100)
    total_classes: Optional[int] = Field(None, ge=1)
    classes_attended: Optional[int] = Field(None, ge=0)
    classes_missed: Optional[int] = Field(None, ge=0)
    date: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    subject: str
    total_classes: int
    classes_attended: int
    classes_missed: int
    attendance_percentage: float
    date: str
    risk_level: Optional[str] = "Low Risk"
    classes_required_for_75: Optional[int] = 0
    student_name: Optional[str] = None
    student_roll: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------- Performance Schemas -----------------
class PerformanceBase(BaseModel):
    student_id: int
    semester: int
    subject: str
    internal_marks: float
    external_marks: float
    total_marks: float
    grade: str

class PerformanceCreate(PerformanceBase):
    pass

class PerformanceResponse(PerformanceBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ----------------- Placement Drive Schemas -----------------
class PlacementDriveBase(BaseModel):
    company_name: str
    job_role: str
    package_lpa: float
    min_cgpa: float = 6.5
    min_attendance: float = 75.0
    max_backlogs: int = 0
    required_skills: str = ""
    min_projects: int = 0
    min_certifications: int = 0
    internship_required: str = "No"  # "Yes" or "No"
    drive_date: str
    status: str = "Upcoming"

class PlacementDriveCreate(PlacementDriveBase):
    pass

class PlacementDriveUpdate(BaseModel):
    company_name: Optional[str] = None
    job_role: Optional[str] = None
    package_lpa: Optional[float] = None
    min_cgpa: Optional[float] = None
    min_attendance: Optional[float] = None
    max_backlogs: Optional[int] = None
    required_skills: Optional[str] = None
    min_projects: Optional[int] = None
    min_certifications: Optional[int] = None
    internship_required: Optional[str] = None
    drive_date: Optional[str] = None
    status: Optional[str] = None

class PlacementDriveResponse(PlacementDriveBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ----------------- Placement Eligibility Engine Schemas -----------------
class CriterionCheckResult(BaseModel):
    criterion: str
    passed: bool
    student_value: str
    required_value: str
    message: str
    icon: str

class EligibilityEvaluationResponse(BaseModel):
    student_id: int
    student_roll: str
    student_name: str
    student_email: str
    student_branch: str
    drive_id: int
    company_name: str
    job_role: str
    package_lpa: float
    status: str  # "ELIGIBLE" or "NOT ELIGIBLE"
    is_eligible: bool
    verdict_badge: str  # "✅ Eligible based on placement criteria" or "❌ Not Eligible"
    reasons: List[str]
    passed_criteria: List[CriterionCheckResult]
    failed_criteria: List[CriterionCheckResult]
    all_criteria: List[CriterionCheckResult]
    disclaimer: str

class StudentEligibilitySummary(BaseModel):
    id: int
    student_id: str
    name: str
    branch: str
    cgpa: float
    attendance_percentage: float
    technical_skills: str
    number_of_projects: int
    certifications: int
    internship: str
    backlogs: int
    is_eligible: bool
    status: str
    passed_count: int
    failed_count: int
    failed_reasons: List[str]

class DriveEligibleStudentsReport(BaseModel):
    drive: PlacementDriveResponse
    total_evaluated: int
    eligible_count: int
    ineligible_count: int
    eligibility_rate_percentage: float
    students: List[StudentEligibilitySummary]
    disclaimer: str


# ----------------- Dashboard Analytics Schema -----------------
class DashboardStats(BaseModel):
    total_students: int
    average_attendance: float
    students_below_75: int = 0
    average_cgpa: float
    placed_count: int
    eligible_count: int
    at_risk_count: int
    active_placement_drives: int
    readiness_distribution: Optional[dict] = None


# ----------------- Machine Learning Prediction Schemas -----------------
class AttendanceRiskPredictionRequest(BaseModel):
    total_classes: int = Field(default=60, ge=1, description="Total classes conducted")
    classes_attended: int = Field(default=45, ge=0, description="Classes attended by student")
    previous_attendance: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Historical attendance %")
    recent_attendance: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Last 4 weeks attendance %")

class AttendanceRiskPredictionResponse(BaseModel):
    predicted_risk: str  # "Low", "Medium", "High"
    confidence: float
    class_probabilities: dict
    model_used: str
    key_factors: List[str]
    important_input_values: dict

class PlacementReadinessPredictionRequest(BaseModel):
    student_id: Optional[int] = Field(default=None, description="Optional: Auto-populate from DB if provided")
    attendance: Optional[float] = Field(default=80.0, ge=0.0, le=100.0)
    cgpa: Optional[float] = Field(default=7.5, ge=0.0, le=10.0)
    number_of_projects: Optional[int] = Field(default=2, ge=0)
    certifications: Optional[int] = Field(default=1, ge=0)
    internship: Optional[Union[str, int]] = Field(default="No")
    technical_skills_count: Optional[int] = Field(default=4, ge=0)
    backlog_count: Optional[int] = Field(default=0, ge=0)
    github_portfolio_availability: Optional[int] = Field(default=1, ge=0, le=2)

class PlacementReadinessPredictionResponse(BaseModel):
    readiness_category: str  # "High Readiness", "Medium Readiness", "Low Readiness"
    confidence: float
    class_probabilities: dict
    model_used: str
    key_factors: List[str]
    input_features: dict
