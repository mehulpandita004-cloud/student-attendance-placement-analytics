"""
Dataset Generator for ML Training.
Generates realistic historical datasets for Attendance Risk and Placement Readiness models.
"""

import numpy as np
import pandas as pd


def generate_attendance_dataset(n_samples: int = 600, random_state: int = 42) -> pd.DataFrame:
    """
    Generate realistic attendance training data.
    Features:
    - total_classes: 40 to 90
    - classes_attended: 15 to 90
    - classes_missed: total_classes - classes_attended
    - attendance_percentage: (classes_attended / total_classes) * 100
    - previous_attendance: historical % from prior semester (50 to 98)
    - recent_attendance: % in past 4 weeks (40 to 100)
    - attendance_trend: recent_attendance - previous_attendance
    Target:
    - attendance_risk: 'Low', 'Medium', 'High'
    """
    rng = np.random.RandomState(random_state)

    total_classes = rng.randint(40, 90, size=n_samples)
    
    # 3 latent tiers of student attendance habits
    tiers = rng.choice(['consistent', 'borderline', 'irregular'], size=n_samples, p=[0.45, 0.30, 0.25])
    
    classes_attended = []
    prev_att = []
    recent_att = []
    
    for i, tier in enumerate(tiers):
        tc = total_classes[i]
        if tier == 'consistent':
            att_pct = rng.uniform(85.0, 98.0)
            p = rng.uniform(82.0, 96.0)
            r = np.clip(att_pct + rng.normal(1.0, 3.0), 75.0, 100.0)
        elif tier == 'borderline':
            att_pct = rng.uniform(73.0, 85.0)
            p = rng.uniform(70.0, 84.0)
            r = np.clip(att_pct + rng.normal(-2.0, 4.0), 60.0, 90.0)
        else: # irregular
            att_pct = rng.uniform(45.0, 74.0)
            p = rng.uniform(50.0, 72.0)
            r = np.clip(att_pct + rng.normal(-4.0, 5.0), 30.0, 75.0)
            
        ca = int(round((att_pct / 100.0) * tc))
        ca = max(5, min(tc, ca))
        classes_attended.append(ca)
        prev_att.append(round(p, 1))
        recent_att.append(round(r, 1))

    classes_attended = np.array(classes_attended)
    classes_missed = total_classes - classes_attended
    attendance_pct = np.round((classes_attended / total_classes) * 100.0, 1)
    prev_att = np.array(prev_att)
    recent_att = np.array(recent_att)
    trend = np.round(recent_att - prev_att, 1)

    # Ground truth risk classification with natural college criteria:
    targets = []
    for i in range(n_samples):
        pct = attendance_pct[i]
        rec = recent_att[i]
        tr = trend[i]

        # Composite score
        risk_score = 0
        if pct < 75.0:
            risk_score += 3
        elif pct < 85.0:
            risk_score += 1

        if rec < 70.0:
            risk_score += 2
        elif rec < 80.0:
            risk_score += 1

        if tr < -5.0:
            risk_score += 1
        elif tr > 5.0:
            risk_score -= 1

        # Classify
        if risk_score >= 3:
            targets.append('High')
        elif risk_score >= 1:
            targets.append('Medium')
        else:
            targets.append('Low')

    df = pd.DataFrame({
        'total_classes': total_classes,
        'classes_attended': classes_attended,
        'classes_missed': classes_missed,
        'attendance_percentage': attendance_pct,
        'previous_attendance': prev_att,
        'recent_attendance': recent_att,
        'attendance_trend': trend,
        'attendance_risk': targets
    })
    return df


def generate_placement_dataset(n_samples: int = 700, random_state: int = 42) -> pd.DataFrame:
    """
    Generate realistic placement readiness training data.
    Features:
    - attendance: 50.0 to 100.0
    - cgpa: 5.0 to 9.8
    - number_of_projects: 0 to 6
    - certifications: 0 to 5
    - internship: 1 (Yes) or 0 (No)
    - technical_skills_count: 1 to 10
    - backlog_count: 0 to 4
    - github_portfolio_availability: 0 (None), 1 (One), 2 (Both)
    Target:
    - placement_readiness: 'High Readiness', 'Medium Readiness', 'Low Readiness'
    """
    rng = np.random.RandomState(random_state)

    # Latent profile types
    types = rng.choice(['star', 'solid', 'struggling'], size=n_samples, p=[0.32, 0.43, 0.25])

    records = []
    for t in types:
        if t == 'star':
            cgpa = np.clip(rng.normal(8.7, 0.5), 8.0, 9.9)
            att = np.clip(rng.normal(89.0, 5.0), 80.0, 99.0)
            proj = rng.randint(3, 7)
            certs = rng.randint(2, 6)
            intern = 1 if rng.rand() < 0.85 else 0
            skills = rng.randint(5, 11)
            backlogs = 0
            profiles = rng.choice([1, 2], p=[0.25, 0.75])
        elif t == 'solid':
            cgpa = np.clip(rng.normal(7.6, 0.45), 7.0, 8.4)
            att = np.clip(rng.normal(80.0, 5.5), 72.0, 92.0)
            proj = rng.randint(1, 4)
            certs = rng.randint(1, 4)
            intern = 1 if rng.rand() < 0.45 else 0
            skills = rng.randint(3, 7)
            backlogs = rng.choice([0, 1], p=[0.85, 0.15])
            profiles = rng.choice([0, 1, 2], p=[0.25, 0.50, 0.25])
        else: # struggling
            cgpa = np.clip(rng.normal(6.3, 0.6), 5.0, 7.1)
            att = np.clip(rng.normal(68.0, 6.5), 50.0, 76.0)
            proj = rng.randint(0, 2)
            certs = rng.randint(0, 2)
            intern = 1 if rng.rand() < 0.10 else 0
            skills = rng.randint(1, 4)
            backlogs = rng.choice([1, 2, 3, 4], p=[0.40, 0.35, 0.15, 0.10])
            profiles = rng.choice([0, 1], p=[0.75, 0.25])

        # Composite readiness index
        score = (
            (cgpa / 10.0) * 35.0 +
            (att / 100.0) * 20.0 +
            min(15.0, proj * 3.5) +
            min(10.0, certs * 2.5) +
            (intern * 10.0) +
            min(10.0, skills * 1.5) +
            (profiles * 4.0) -
            (backlogs * 8.0)
        )

        if score >= 68.0 and backlogs == 0:
            target = 'High Readiness'
        elif score >= 50.0 and backlogs <= 1:
            target = 'Medium Readiness'
        else:
            target = 'Low Readiness'

        records.append({
            'attendance': round(float(att), 1),
            'cgpa': round(float(cgpa), 2),
            'number_of_projects': int(proj),
            'certifications': int(certs),
            'internship': int(intern),
            'technical_skills_count': int(skills),
            'backlog_count': int(backlogs),
            'github_portfolio_availability': int(profiles),
            'placement_readiness': target
        })

    return pd.DataFrame(records)
