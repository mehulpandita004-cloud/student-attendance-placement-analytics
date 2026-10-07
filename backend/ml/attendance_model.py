"""
Attendance Risk ML Model Training and Evaluation Pipeline.
Compares Logistic Regression, Decision Tree, and Random Forest.
Selects best model, calculates true performance metrics, and saves model with joblib.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report

from backend.ml.dataset_generator import generate_attendance_dataset

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

FEATURE_COLS = [
    'total_classes',
    'classes_attended',
    'classes_missed',
    'attendance_percentage',
    'previous_attendance',
    'recent_attendance',
    'attendance_trend'
]

CLASS_LABELS = ['High', 'Medium', 'Low']


def train_and_evaluate_attendance_models(random_state: int = 42):
    """
    1. Loads generated dataset.
    2. Splits into 80% train and 20% test.
    3. Fits StandardScaler.
    4. Trains Logistic Regression, Decision Tree, and Random Forest.
    5. Computes real Accuracy, Precision, Recall, F1-score, and Confusion Matrix.
    6. Selects and saves the best model.
    """
    df = generate_attendance_dataset(n_samples=600, random_state=random_state)
    
    X = df[FEATURE_COLS]
    y = df['attendance_risk']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Models to compare
    models = {
        "Logistic Regression": {
            "model": LogisticRegression(max_iter=1000, random_state=random_state),
            "use_scaled": True
        },
        "Decision Tree": {
            "model": DecisionTreeClassifier(max_depth=5, min_samples_split=4, random_state=random_state),
            "use_scaled": False
        },
        "Random Forest": {
            "model": RandomForestClassifier(n_estimators=100, max_depth=6, min_samples_split=4, random_state=random_state),
            "use_scaled": False
        }
    }

    comparison_results = []
    trained_models = {}

    for name, item in models.items():
        clf = item["model"]
        use_scaled = item["use_scaled"]
        
        train_data = X_train_scaled if use_scaled else X_train
        test_data = X_test_scaled if use_scaled else X_test

        clf.fit(train_data, y_train)
        y_pred = clf.predict(test_data)

        acc = float(accuracy_score(y_test, y_pred))
        p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro', zero_division=0)
        p_weight, r_weight, f1_weight, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
        
        cm = confusion_matrix(y_test, y_pred, labels=CLASS_LABELS)

        metrics = {
            "model_name": name,
            "accuracy": round(acc * 100, 2),
            "precision_macro": round(float(p_macro) * 100, 2),
            "recall_macro": round(float(r_macro) * 100, 2),
            "f1_macro": round(float(f1_macro) * 100, 2),
            "precision_weighted": round(float(p_weight) * 100, 2),
            "recall_weighted": round(float(r_weight) * 100, 2),
            "f1_weighted": round(float(f1_weight) * 100, 2),
            "confusion_matrix": cm.tolist(),
            "classes": CLASS_LABELS,
            "classification_report": classification_report(y_test, y_pred, labels=CLASS_LABELS, output_dict=True, zero_division=0)
        }

        comparison_results.append(metrics)
        trained_models[name] = {
            "model": clf,
            "use_scaled": use_scaled,
            "metrics": metrics
        }

    # Best model by highest macro F1-score
    best_item = max(comparison_results, key=lambda m: m["f1_macro"])
    best_name = best_item["model_name"]
    best_clf_info = trained_models[best_name]

    # Save artifacts
    model_path = os.path.join(ARTIFACTS_DIR, "attendance_model.joblib")
    scaler_path = os.path.join(ARTIFACTS_DIR, "attendance_scaler.joblib")
    metrics_path = os.path.join(ARTIFACTS_DIR, "attendance_metrics.json")

    joblib.dump(best_clf_info["model"], model_path)
    joblib.dump(scaler, scaler_path)

    report_payload = {
        "best_model_name": best_name,
        "best_model_use_scaled": best_clf_info["use_scaled"],
        "feature_names": FEATURE_COLS,
        "classes": CLASS_LABELS,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "total_dataset_size": len(df),
        "models_comparison": comparison_results,
        "best_model_metrics": best_item
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    return report_payload


if __name__ == "__main__":
    results = train_and_evaluate_attendance_models()
    print(f"Attendance Model Training Complete!")
    print(f"Best Model: {results['best_model_name']} with F1: {results['best_model_metrics']['f1_macro']}% (Accuracy: {results['best_model_metrics']['accuracy']}%)")
