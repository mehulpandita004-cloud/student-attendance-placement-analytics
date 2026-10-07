"""
ML Package for Student Attendance, Performance & Placement Analytics System.
Exposes attendance risk prediction, placement readiness prediction, and metrics.
"""

from backend.ml.predictor import (
    predict_attendance_risk,
    predict_placement_readiness,
    get_ml_metrics_summary,
    ensure_models_trained
)

__all__ = [
    "predict_attendance_risk",
    "predict_placement_readiness",
    "get_ml_metrics_summary",
    "ensure_models_trained"
]
