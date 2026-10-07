from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    branch = Column(String(100), nullable=False, default="Computer Science")
    year = Column(Integer, nullable=False, default=3)
    cgpa = Column(Float, nullable=False, default=0.0)
    attendance_percentage = Column(Float, nullable=False, default=0.0)
    technical_skills = Column(String(255), nullable=False, default="")
    number_of_projects = Column(Integer, nullable=False, default=0)
    certifications = Column(Integer, nullable=False, default=0)
    internship = Column(String(50), nullable=False, default="No")  # "Yes", "No", or details
    github_profile = Column(String(255), nullable=True, default="")
    portfolio_profile = Column(String(255), nullable=True, default="")
    backlogs = Column(Integer, nullable=False, default=0)
    
    # Extra field for placement tracking & dashboard analytics
    placement_status = Column(String(50), nullable=False, default="Eligible")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Synonyms for branch / student_id for backward compatibility with analytics
    @property
    def department(self):
        return self.branch

    @department.setter
    def department(self, val):
        self.branch = val

    @property
    def roll_number(self):
        return self.student_id

    @roll_number.setter
    def roll_number(self, val):
        self.student_id = val

    # Relationships
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    performance_records = relationship("PerformanceRecord", back_populates="student", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False, index=True)
    total_classes = Column(Integer, nullable=False, default=0)
    classes_attended = Column(Integer, nullable=False, default=0)
    classes_missed = Column(Integer, nullable=False, default=0)
    attendance_percentage = Column(Float, nullable=False, default=0.0)
    date = Column(String(20), nullable=False)

    student = relationship("Student", back_populates="attendance_records")

    @property
    def risk_level(self):
        """Rule-based risk classification: >=85% Low Risk, 75-84.9% Medium Risk, <75% High Risk."""
        if self.attendance_percentage >= 85.0:
            return "Low Risk"
        elif self.attendance_percentage >= 75.0:
            return "Medium Risk"
        else:
            return "High Risk"

    @property
    def classes_required_for_75(self):
        """Calculate minimum additional consecutive classes needed to reach 75% attendance."""
        if self.attendance_percentage >= 75.0:
            return 0
        needed = 3 * self.total_classes - 4 * self.classes_attended
        return max(0, needed)

# Alias for backward compatibility
AttendanceRecord = Attendance


class PerformanceRecord(Base):
    __tablename__ = "performance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    subject = Column(String(100), nullable=False)
    internal_marks = Column(Float, nullable=False, default=0.0)
    external_marks = Column(Float, nullable=False, default=0.0)
    total_marks = Column(Float, nullable=False, default=0.0)
    grade = Column(String(10), nullable=False, default="A")

    student = relationship("Student", back_populates="performance_records")


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(100), nullable=False)
    job_role = Column(String(100), nullable=False)
    package_lpa = Column(Float, nullable=False)
    min_cgpa = Column(Float, nullable=False, default=6.5)
    min_attendance = Column(Float, nullable=False, default=75.0)
    max_backlogs = Column(Integer, nullable=False, default=0)
    required_skills = Column(String(255), nullable=False, default="")
    min_projects = Column(Integer, nullable=False, default=0)
    min_certifications = Column(Integer, nullable=False, default=0)
    internship_required = Column(String(50), nullable=False, default="No")
    drive_date = Column(String(20), nullable=False)
    status = Column(String(50), nullable=False, default="Upcoming")  # Upcoming, Ongoing, Completed
