from sqlalchemy.orm import Session
from backend.models import Student, Attendance, PerformanceRecord, PlacementDrive

def seed_initial_data(db: Session):
    """Seed sample realistic college records if the database is empty."""
    if db.query(Student).count() > 0:
        return

    sample_students = [
        Student(
            student_id="STU2023001",
            name="Aarav Sharma",
            email="aarav.sharma@college.edu",
            branch="Computer Science",
            year=3,
            cgpa=8.9,
            attendance_percentage=91.5,
            technical_skills="Python, React, MySQL, Docker, Scikit-learn",
            number_of_projects=4,
            certifications=3,
            internship="Yes (Amazon SDE Intern)",
            github_profile="https://github.com/aarav-sharma",
            portfolio_profile="https://aarav.dev",
            backlogs=0,
            placement_status="Placed"
        ),
        Student(
            student_id="STU2023002",
            name="Diya Patel",
            email="diya.patel@college.edu",
            branch="Computer Science",
            year=3,
            cgpa=9.2,
            attendance_percentage=95.0,
            technical_skills="Java, Spring Boot, AWS, Kubernetes, Postgres",
            number_of_projects=5,
            certifications=4,
            internship="Yes (Microsoft Intern)",
            github_profile="https://github.com/diya-patel",
            portfolio_profile="https://diya.io",
            backlogs=0,
            placement_status="Placed"
        ),
        Student(
            student_id="STU2023003",
            name="Rohan Verma",
            email="rohan.verma@college.edu",
            branch="Computer Science",
            year=3,
            cgpa=7.4,
            attendance_percentage=78.2,
            technical_skills="C++, Python, Data Structures, Flask",
            number_of_projects=2,
            certifications=1,
            internship="No",
            github_profile="https://github.com/rohan-v",
            portfolio_profile="",
            backlogs=0,
            placement_status="Eligible"
        ),
        Student(
            student_id="STU2023004",
            name="Ananya Iyer",
            email="ananya.iyer@college.edu",
            branch="Computer Science",
            year=3,
            cgpa=8.1,
            attendance_percentage=84.0,
            technical_skills="Python, Machine Learning, TensorFlow, SQL, Tableau",
            number_of_projects=4,
            certifications=3,
            internship="Yes (Google Summer of Code)",
            github_profile="https://github.com/ananya-iyer",
            portfolio_profile="https://ananya.tech",
            backlogs=0,
            placement_status="Eligible"
        ),
        Student(
            student_id="STU2023005",
            name="Kabir Singh",
            email="kabir.singh@college.edu",
            branch="Computer Science",
            year=3,
            cgpa=6.2,
            attendance_percentage=68.5,
            technical_skills="HTML, CSS, JavaScript, Basic Python",
            number_of_projects=1,
            certifications=0,
            internship="No",
            github_profile="https://github.com/kabir-s",
            portfolio_profile="",
            backlogs=2,
            placement_status="Not Eligible"
        ),
        Student(
            student_id="STU2023006",
            name="Meera Nair",
            email="meera.nair@college.edu",
            branch="Information Technology",
            year=3,
            cgpa=8.7,
            attendance_percentage=89.0,
            technical_skills="Python, Django, PostgreSQL, Git, Redis",
            number_of_projects=3,
            certifications=2,
            internship="Yes (Infosys Tech Intern)",
            github_profile="https://github.com/meera-nair",
            portfolio_profile="https://meeranair.me",
            backlogs=0,
            placement_status="Placed"
        ),
        Student(
            student_id="STU2023007",
            name="Karthik Reddy",
            email="karthik.reddy@college.edu",
            branch="Information Technology",
            year=3,
            cgpa=7.8,
            attendance_percentage=81.0,
            technical_skills="Node.js, Express, MongoDB, Vue.js",
            number_of_projects=3,
            certifications=2,
            internship="No",
            github_profile="https://github.com/karthik-reddy",
            portfolio_profile="",
            backlogs=0,
            placement_status="Eligible"
        ),
        Student(
            student_id="STU2023008",
            name="Sneha Kulkarni",
            email="sneha.kulkarni@college.edu",
            branch="Information Technology",
            year=3,
            cgpa=6.9,
            attendance_percentage=72.0,
            technical_skills="Java, SQL, Linux, Git",
            number_of_projects=2,
            certifications=1,
            internship="No",
            github_profile="https://github.com/sneha-k",
            portfolio_profile="",
            backlogs=1,
            placement_status="Not Eligible"
        ),
        Student(
            student_id="STU2023009",
            name="Aditya Gupta",
            email="aditya.gupta@college.edu",
            branch="Electronics & Comm.",
            year=3,
            cgpa=8.3,
            attendance_percentage=87.5,
            technical_skills="Embedded C, IoT, Python, Raspberry Pi, PCB Design",
            number_of_projects=3,
            certifications=2,
            internship="Yes (Intel IoT Intern)",
            github_profile="https://github.com/aditya-g",
            portfolio_profile="https://adityagupta.dev",
            backlogs=0,
            placement_status="Eligible"
        ),
        Student(
            student_id="STU2023010",
            name="Pooja Sen",
            email="pooja.sen@college.edu",
            branch="Electronics & Comm.",
            year=3,
            cgpa=7.1,
            attendance_percentage=76.0,
            technical_skills="MATLAB, C++, Verilog, Arduino",
            number_of_projects=2,
            certifications=1,
            internship="No",
            github_profile="",
            portfolio_profile="",
            backlogs=0,
            placement_status="Eligible"
        ),
        Student(
            student_id="STU2023011",
            name="Vikram Rao",
            email="vikram.rao@college.edu",
            branch="Electronics & Comm.",
            year=3,
            cgpa=5.8,
            attendance_percentage=64.0,
            technical_skills="Basic C, Digital Circuits",
            number_of_projects=1,
            certifications=0,
            internship="No",
            github_profile="",
            portfolio_profile="",
            backlogs=3,
            placement_status="Not Eligible"
        ),
        Student(
            student_id="STU2023012",
            name="Tanvi Deshmukh",
            email="tanvi.deshmukh@college.edu",
            branch="Mechanical Eng.",
            year=3,
            cgpa=8.0,
            attendance_percentage=86.0,
            technical_skills="Python, Data Analytics, PowerBI, AutoCAD, MATLAB",
            number_of_projects=3,
            certifications=2,
            internship="Yes (Tata Motors R&D)",
            github_profile="https://github.com/tanvi-d",
            portfolio_profile="https://tanvideshmukh.me",
            backlogs=0,
            placement_status="Eligible"
        ),
    ]

    db.add_all(sample_students)
    db.commit()

    # Seed Subject-wise Attendance Records
    # Format: (student_idx, subject, total, attended, date)
    attendance_data = [
        # Student 1: Aarav Sharma (High Attendance > 90%)
        (0, "Machine Learning", 40, 37, "2026-10-04"),       # 92.5% - Low Risk
        (0, "Database Systems", 36, 33, "2026-10-05"),       # 91.7% - Low Risk
        (0, "Computer Networks", 38, 35, "2026-10-02"),      # 92.1% - Low Risk
        (0, "Operating Systems", 35, 31, "2026-09-28"),      # 88.6% - Low Risk
        (0, "Web Technologies", 32, 29, "2026-09-21"),       # 90.6% - Low Risk

        # Student 2: Diya Patel (Very High Attendance ~95%)
        (1, "Machine Learning", 40, 38, "2026-10-04"),       # 95.0% - Low Risk
        (1, "Database Systems", 36, 35, "2026-10-05"),       # 97.2% - Low Risk
        (1, "Computer Networks", 38, 36, "2026-10-02"),      # 94.7% - Low Risk
        (1, "Operating Systems", 35, 33, "2026-09-28"),      # 94.3% - Low Risk

        # Student 3: Rohan Verma (Medium Attendance ~78%)
        (2, "Machine Learning", 40, 32, "2026-10-04"),       # 80.0% - Medium Risk
        (2, "Database Systems", 36, 28, "2026-10-05"),       # 77.8% - Medium Risk
        (2, "Computer Networks", 38, 29, "2026-10-02"),      # 76.3% - Medium Risk
        (2, "Operating Systems", 35, 27, "2026-09-28"),      # 77.1% - Medium Risk

        # Student 4: Ananya Iyer (Good Attendance ~84%)
        (3, "Machine Learning", 40, 35, "2026-10-04"),       # 87.5% - Low Risk
        (3, "Database Systems", 36, 30, "2026-10-05"),       # 83.3% - Medium Risk
        (3, "Computer Networks", 38, 32, "2026-10-02"),      # 84.2% - Medium Risk
        (3, "Operating Systems", 35, 28, "2026-09-28"),      # 80.0% - Medium Risk

        # Student 5: Kabir Singh (Critical Attendance < 70% - High Risk!)
        (4, "Machine Learning", 40, 26, "2026-10-04"),       # 65.0% - High Risk (Below 75%)
        (4, "Database Systems", 36, 24, "2026-10-05"),       # 66.7% - High Risk (Below 75%)
        (4, "Computer Networks", 38, 27, "2026-10-02"),      # 71.1% - High Risk (Below 75%)
        (4, "Operating Systems", 35, 25, "2026-09-28"),      # 71.4% - High Risk (Below 75%)

        # Student 6: Meera Nair (IT - High Attendance)
        (5, "Cloud Computing", 38, 34, "2026-10-04"),        # 89.5% - Low Risk
        (5, "Database Systems", 36, 32, "2026-10-05"),       # 88.9% - Low Risk
        (5, "Software Engineering", 34, 30, "2026-10-01"),   # 88.2% - Low Risk

        # Student 7: Karthik Reddy (IT - Medium Attendance)
        (6, "Cloud Computing", 38, 31, "2026-10-04"),        # 81.6% - Medium Risk
        (6, "Database Systems", 36, 29, "2026-10-05"),       # 80.6% - Medium Risk
        (6, "Software Engineering", 34, 27, "2026-10-01"),   # 79.4% - Medium Risk

        # Student 8: Sneha Kulkarni (IT - High Risk <75%)
        (7, "Cloud Computing", 38, 27, "2026-10-04"),        # 71.1% - High Risk (Below 75%)
        (7, "Database Systems", 36, 26, "2026-10-05"),       # 72.2% - High Risk (Below 75%)
        (7, "Software Engineering", 34, 25, "2026-10-01"),   # 73.5% - High Risk (Below 75%)

        # Student 9: Aditya Gupta (ECE - High Attendance)
        (8, "Embedded Systems", 40, 35, "2026-10-04"),       # 87.5% - Low Risk
        (8, "Digital Signal Processing", 38, 33, "2026-10-02"),# 86.8% - Low Risk
        (8, "VLSI Design", 36, 32, "2026-09-30"),            # 88.9% - Low Risk

        # Student 10: Pooja Sen (ECE - Medium Attendance)
        (9, "Embedded Systems", 40, 31, "2026-10-04"),       # 77.5% - Medium Risk
        (9, "Digital Signal Processing", 38, 29, "2026-10-02"),# 76.3% - Medium Risk
        (9, "VLSI Design", 36, 27, "2026-09-30"),            # 75.0% - Medium Risk

        # Student 11: Vikram Rao (ECE - High Risk <65%)
        (10, "Embedded Systems", 40, 25, "2026-10-04"),      # 62.5% - High Risk (Below 75%)
        (10, "Digital Signal Processing", 38, 24, "2026-10-02"),# 63.2% - High Risk (Below 75%)
        (10, "VLSI Design", 36, 24, "2026-09-30"),           # 66.7% - High Risk (Below 75%)

        # Student 12: Tanvi Deshmukh (ME - High Attendance)
        (11, "Thermodynamics", 38, 33, "2026-10-04"),        # 86.8% - Low Risk
        (11, "Machine Design", 36, 31, "2026-10-02"),        # 86.1% - Low Risk
        (11, "Fluid Mechanics", 35, 30, "2026-09-29"),       # 85.7% - Low Risk
    ]

    attendance_records = []
    for s_idx, subj, tot, att_cls, d_str in attendance_data:
        student = sample_students[s_idx]
        missed = tot - att_cls
        pct = round((att_cls / tot) * 100, 2)
        attendance_records.append(
            Attendance(
                student_id=student.id,
                subject=subj,
                total_classes=tot,
                classes_attended=att_cls,
                classes_missed=missed,
                attendance_percentage=pct,
                date=d_str
            )
        )

    db.add_all(attendance_records)
    db.commit()

    # Sample Placement Drives
    sample_drives = [
        PlacementDrive(
            company_name="Google Cloud",
            job_role="Cloud Associate Engineer",
            package_lpa=14.5,
            min_cgpa=8.0,
            min_attendance=80.0,
            max_backlogs=0,
            required_skills="Python, Docker",
            min_projects=3,
            min_certifications=2,
            internship_required="Yes",
            drive_date="2026-10-25",
            status="Upcoming"
        ),
        PlacementDrive(
            company_name="TCS Digital",
            job_role="Systems Engineer",
            package_lpa=7.2,
            min_cgpa=7.0,
            min_attendance=75.0,
            max_backlogs=0,
            required_skills="Python, SQL",
            min_projects=2,
            min_certifications=1,
            internship_required="No",
            drive_date="2026-10-18",
            status="Upcoming"
        ),
        PlacementDrive(
            company_name="Infosys Ltd",
            job_role="Specialist Programmer",
            package_lpa=9.5,
            min_cgpa=7.5,
            min_attendance=75.0,
            max_backlogs=0,
            required_skills="Java, Spring Boot",
            min_projects=2,
            min_certifications=1,
            internship_required="No",
            drive_date="2026-10-12",
            status="Ongoing"
        ),
        PlacementDrive(
            company_name="Accenture",
            job_role="Associate Software Engineer",
            package_lpa=5.5,
            min_cgpa=6.5,
            min_attendance=70.0,
            max_backlogs=1,
            required_skills="Python, C++",
            min_projects=1,
            min_certifications=0,
            internship_required="No",
            drive_date="2026-09-28",
            status="Completed"
        ),
    ]
    db.add_all(sample_drives)
    db.commit()

    # Sample performance records for the first few students
    for student in sample_students[:4]:
        records = [
            PerformanceRecord(
                student_id=student.id,
                semester=5,
                subject="Machine Learning",
                internal_marks=28.0,
                external_marks=62.0,
                total_marks=90.0,
                grade="A+"
            ),
            PerformanceRecord(
                student_id=student.id,
                semester=5,
                subject="Database Management Systems",
                internal_marks=25.0,
                external_marks=58.0,
                total_marks=83.0,
                grade="A"
            ),
            PerformanceRecord(
                student_id=student.id,
                semester=5,
                subject="Computer Networks",
                internal_marks=26.0,
                external_marks=60.0,
                total_marks=86.0,
                grade="A"
            )
        ]
        db.add_all(records)

    db.commit()
