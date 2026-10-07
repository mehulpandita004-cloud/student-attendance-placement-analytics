"""
Inference & Prediction Service for ML Models.
Loads trained joblib models, scalers, and metric reports.
Handles live predictions for Attendance Risk and Placement Readiness.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

from backend.ml.attendance_model import (
    train_and_evaluate_attendance_models,
    FEATURE_COLS as ATTENDANCE_FEATURES,
    ARTIFACTS_DIR
)
from backend.ml.placement_model import (
    train_and_evaluate_placement_models,
    FEATURE_COLS as PLACEMENT_FEATURES
)

# In-memory prediction tracking count for viva/dashboard demonstration
prediction_counter = {
    "attendance_risk": 0,
    "placement_readiness": 0
}

_models_loaded = False
_att_model = None
_att_scaler = None
_att_report = None

_place_model = None
_place_scaler = None
_place_report = None


def ensure_models_trained():
    """Ensure that both models are trained and artifacts exist."""
    global _models_loaded, _att_model, _att_scaler, _att_report, _place_model, _place_scaler, _place_report

    att_model_path = os.path.join(ARTIFACTS_DIR, "attendance_model.joblib")
    att_metrics_path = os.path.join(ARTIFACTS_DIR, "attendance_metrics.json")
    
    if not os.path.exists(att_model_path) or not os.path.exists(att_metrics_path):
        train_and_evaluate_attendance_models()

    place_model_path = os.path.join(ARTIFACTS_DIR, "placement_model.joblib")
    place_metrics_path = os.path.join(ARTIFACTS_DIR, "placement_metrics.json")
    
    if not os.path.exists(place_model_path) or not os.path.exists(place_metrics_path):
        train_and_evaluate_placement_models()

    _att_model = joblib.load(att_model_path)
    _att_scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "attendance_scaler.joblib"))
    with open(att_metrics_path, "r", encoding="utf-8") as f:
        _att_report = json.load(f)

    _place_model = joblib.load(place_model_path)
    _place_scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "placement_scaler.joblib"))
    with open(place_metrics_path, "r", encoding="utf-8") as f:
        _place_report = json.load(f)

    _models_loaded = True


def get_ml_metrics_summary():
    """Return metrics reports for both models for the ML Dashboard."""
    ensure_models_trained()
    return {
        "attendance": _att_report,
        "placement": _place_report,
        "prediction_counts": {
            "attendance_predictions": prediction_counter["attendance_risk"],
            "placement_predictions": prediction_counter["placement_readiness"],
            "total_predictions": prediction_counter["attendance_risk"] + prediction_counter["placement_readiness"]
        }
    }


def predict_attendance_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict attendance risk using the trained scikit-learn model.
    Expected features:
    - total_classes (int)
    - classes_attended (int)
    - previous_attendance (optional float)
    - recent_attendance (optional float)
    """
    ensure_models_trained()
    prediction_counter["attendance_risk"] += 1

    tc = int(data.get("total_classes", 60))
    ca = int(data.get("classes_attended", 45))
    cm = int(data.get("classes_missed", max(0, tc - ca)))
    att_pct = float(data.get("attendance_percentage", round((ca / tc) * 100.0, 1) if tc > 0 else 0.0))
    
    prev_att = float(data.get("previous_attendance", att_pct))
    recent_att = float(data.get("recent_attendance", att_pct))
    trend = round(recent_att - prev_att, 1)

    raw_row = [tc, ca, cm, att_pct, prev_att, recent_att, trend]
    raw_df = pd.DataFrame([raw_row], columns=ATTENDANCE_FEATURES)

    if _att_report.get("best_model_use_scaled", False):
        feat_array = _att_scaler.transform(raw_df)
        pred_class = _att_model.predict(feat_array)[0]
    else:
        pred_class = _att_model.predict(raw_df)[0]
        feat_array = raw_df

    probs = {}
    confidence = 1.0
    if hasattr(_att_model, "predict_proba"):
        raw_probs = _att_model.predict_proba(feat_array)[0]
        classes = _att_model.classes_
        for cls, p in zip(classes, raw_probs):
            probs[cls] = round(float(p), 3)
        confidence = round(float(max(raw_probs)), 3)

    # Viva Explanation Key Factors
    key_factors = []
    if att_pct < 75.0:
        key_factors.append(f"Cumulative attendance is below statutory 75% limit ({att_pct}%).")
    elif att_pct < 85.0:
        key_factors.append(f"Cumulative attendance is in borderline zone ({att_pct}%).")
    else:
        key_factors.append(f"Strong overall attendance standing ({att_pct}%).")

    if trend < -4.0:
        key_factors.append(f"Sharp downward attendance trend over past 4 weeks ({trend}%).")
    elif trend > 4.0:
        key_factors.append(f"Positive recovery trajectory (+{trend}%).")

    if cm > 15:
        key_factors.append(f"High absolute count of missed lectures ({cm} classes).")

    return {
        "predicted_risk": pred_class,
        "confidence": confidence,
        "class_probabilities": probs,
        "model_used": _att_report.get("best_model_name", "Random Forest Classifier"),
        "key_factors": key_factors,
        "important_input_values": {
            "total_classes": tc,
            "classes_attended": ca,
            "classes_missed": cm,
            "attendance_percentage": att_pct,
            "previous_attendance": prev_att,
            "recent_attendance": recent_att,
            "attendance_trend": trend
        }
    }


def predict_placement_readiness(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict student placement readiness using the trained scikit-learn model.
    Expected features:
    - attendance: float
    - cgpa: float
    - number_of_projects: int
    - certifications: int
    - internship: int (1 or 0) or str ('Yes'/'No')
    - technical_skills_count: int
    - backlog_count: int
    - github_portfolio_availability: int (0, 1, 2)
    """
    ensure_models_trained()
    prediction_counter["placement_readiness"] += 1

    att = float(data.get("attendance", 80.0))
    cgpa = float(data.get("cgpa", 7.5))
    proj = int(data.get("number_of_projects", 2))
    certs = int(data.get("certifications", 1))
    
    intern_val = data.get("internship", 0)
    if isinstance(intern_val, str):
        intern = 1 if "yes" in intern_val.lower() or "intern" in intern_val.lower() else 0
    else:
        intern = int(intern_val)

    skills = int(data.get("technical_skills_count", 4))
    backlogs = int(data.get("backlog_count", 0))
    profiles = int(data.get("github_portfolio_availability", 1))

    raw_row = [att, cgpa, proj, certs, intern, skills, backlogs, profiles]
    raw_df = pd.DataFrame([raw_row], columns=PLACEMENT_FEATURES)

    if _place_report.get("best_model_use_scaled", False):
        feat_array = _place_scaler.transform(raw_df)
        pred_class = _place_model.predict(feat_array)[0]
    else:
        pred_class = _place_model.predict(raw_df)[0]
        feat_array = raw_df

    probs = {}
    confidence = 1.0
    if hasattr(_place_model, "predict_proba"):
        raw_probs = _place_model.predict_proba(feat_array)[0]
        classes = _place_model.classes_
        for cls, p in zip(classes, raw_probs):
            probs[cls] = round(float(p), 3)
        confidence = round(float(max(raw_probs)), 3)

    # Key driving factors for viva presentation
    key_factors = []
    if cgpa >= 8.5:
        key_factors.append(f"Distinction Academic Record (CGPA: {cgpa:.2f}).")
    elif cgpa < 7.0:
        key_factors.append(f"Sub-optimal CGPA ({cgpa:.2f}) limits drive shortlisting.")

    if backlogs > 0:
        key_factors.append(f"Active Backlogs ({backlogs}) significantly reduces placement readiness.")
    else:
        key_factors.append("Clean academic record with 0 backlogs.")

    if intern == 1:
        key_factors.append("Prior industry internship gives strong corporate edge.")
    else:
        key_factors.append("No industry internship on record.")

    if proj >= 3:
        key_factors.append(f"Strong practical portfolio with {proj} completed projects.")
    elif proj < 2:
        key_factors.append("Limited project footprint (under 2 projects).")

    if profiles == 2:
        key_factors.append("Both GitHub & Live Portfolio verified.")
    elif profiles == 0:
        key_factors.append("No online repository or portfolio available.")

    return {
        "readiness_category": pred_class,
        "confidence": confidence,
        "class_probabilities": probs,
        "model_used": _place_report.get("best_model_name", "Random Forest Classifier"),
        "key_factors": key_factors,
        "input_features": {
            "attendance": att,
            "cgpa": cgpa,
            "number_of_projects": proj,
            "certifications": certs,
            "internship": "Yes" if intern == 1 else "No",
            "technical_skills_count": skills,
            "backlog_count": backlogs,
            "github_portfolio_availability": profiles
        }
    }
