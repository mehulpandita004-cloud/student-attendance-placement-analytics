import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import Student
from backend.schemas import StudentCreate, StudentUpdate, StudentResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "frontend"))

router = APIRouter(tags=["Students"])

@router.get("/students", response_model=List[StudentResponse])
def get_all_students(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name, student_id, skills, or email"),
    branch: Optional[str] = Query(None, description="Filter by branch / department"),
    year: Optional[int] = Query(None, description="Filter by academic year (1-4)"),
    placement_status: Optional[str] = Query(None, description="Filter by placement status"),
    db: Session = Depends(get_db)
):
    """Retrieve all students with optional search and filters."""
    query = db.query(Student)

    if branch and branch != "All":
        query = query.filter(Student.branch == branch)
    
    if year:
        query = query.filter(Student.year == year)

    if placement_status and placement_status != "All":
        query = query.filter(Student.placement_status == placement_status)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.name.ilike(search_pattern),
                Student.student_id.ilike(search_pattern),
                Student.email.ilike(search_pattern),
                Student.technical_skills.ilike(search_pattern),
                Student.branch.ilike(search_pattern),
            )
        )

    return query.order_by(Student.student_id).all()


@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student_in: StudentCreate, db: Session = Depends(get_db)):
    """Add a new student with validation checks."""
    # Check duplicate student_id
    existing_id = db.query(Student).filter(Student.student_id == student_in.student_id).first()
    if existing_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student ID '{student_in.student_id}' is already registered."
        )

    # Check duplicate email
    existing_email = db.query(Student).filter(Student.email == student_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{student_in.email}' is already in use."
        )

    student = Student(**student_in.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/students/{id}", response_model=StudentResponse)
def get_student_by_id(id: int, db: Session = Depends(get_db)):
    """Retrieve a single student by numeric ID."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {id} not found."
        )
    return student


@router.put("/students/{id}", response_model=StudentResponse)
def update_student(id: int, update_in: StudentUpdate, db: Session = Depends(get_db)):
    """Update student record fields with validation."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {id} not found."
        )

    update_data = update_in.model_dump(exclude_unset=True)

    # Check student_id collision if being changed
    if "student_id" in update_data and update_data["student_id"] != student.student_id:
        collision = db.query(Student).filter(
            Student.student_id == update_data["student_id"],
            Student.id != id
        ).first()
        if collision:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student ID '{update_data['student_id']}' is already registered to another student."
            )

    # Check email collision if being changed
    if "email" in update_data and update_data["email"] != student.email:
        collision = db.query(Student).filter(
            Student.email == update_data["email"],
            Student.id != id
        ).first()
        if collision:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{update_data['email']}' is already in use by another student."
            )

    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


@router.delete("/students/{id}")
def delete_student(id: int, db: Session = Depends(get_db)):
    """Delete a student record."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {id} not found."
        )
    
    student_name = student.name
    db.delete(student)
    db.commit()
    return {
        "message": f"Student '{student_name}' deleted successfully.",
        "id": id
    }
