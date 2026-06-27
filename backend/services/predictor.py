"""Predictive maintenance model for the Predictive agent.

Trains a RandomForestClassifier at startup on the synthetic inspection
time-series to predict the probability that a unit fails within ~3 weeks.
Deterministic (fixed random_state).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from services.data_loader import get_inspections

log = logging.getLogger("sage.predictor")

FEATURES = [
    "vibration_mm_s",
    "bearing_temp_c",
    "oil_pressure_bar",
    "hours_since_service",
    "defects_flagged",
]


@dataclass
class _Model:
    clf: RandomForestClassifier | None = None
    trained: bool = False
    auc_note: str = ""


_MODEL = _Model()


def train() -> None:
    df = get_inspections()
    X = df[FEATURES]
    y = df["will_fail"]
    clf = RandomForestClassifier(
        n_estimators=200, max_depth=8, random_state=42, class_weight="balanced"
    )
    clf.fit(X, y)
    _MODEL.clf = clf
    _MODEL.trained = True
    log.info("Predictive model trained on %d rows (%d positive)", len(df), int(y.sum()))


def _band(prob: float) -> str:
    if prob >= 0.66:
        return "High"
    if prob >= 0.33:
        return "Medium"
    return "Low"


def score_equipment() -> list[dict]:
    """Score the latest reading for each equipment unit."""
    if not _MODEL.trained:
        train()
    df = get_inspections()
    latest = df.sort_values("date").groupby("equipment_id").tail(1).copy()
    probs = _MODEL.clf.predict_proba(latest[FEATURES])[:, 1]
    importances = dict(zip(FEATURES, _MODEL.clf.feature_importances_))

    results = []
    for (_, row), p in zip(latest.iterrows(), probs):
        results.append(
            {
                "equipment_id": row["equipment_id"],
                "equipment_name": row["equipment_name"],
                "site": row["site"],
                "area": row["area"],
                "failure_probability": round(float(p), 3),
                "risk_band": _band(float(p)),
                "vibration_mm_s": float(row["vibration_mm_s"]),
                "bearing_temp_c": float(row["bearing_temp_c"]),
                "oil_pressure_bar": float(row["oil_pressure_bar"]),
                "hours_since_service": int(row["hours_since_service"]),
                "defects_flagged": int(row["defects_flagged"]),
            }
        )
    results.sort(key=lambda r: r["failure_probability"], reverse=True)
    return results


def feature_importances() -> list[dict]:
    if not _MODEL.trained:
        train()
    imp = dict(zip(FEATURES, _MODEL.clf.feature_importances_))
    return [
        {"feature": k, "importance": round(float(v), 3)}
        for k, v in sorted(imp.items(), key=lambda x: x[1], reverse=True)
    ]


def equipment_trend(equipment_id: str) -> list[dict]:
    """Return the inspection time-series for one unit (for the trend chart)."""
    df = get_inspections()
    sub = df[df["equipment_id"] == equipment_id].sort_values("date")
    return [
        {
            "date": d.strftime("%Y-%m-%d"),
            "vibration_mm_s": float(v),
            "bearing_temp_c": float(t),
            "defects_flagged": int(df_),
        }
        for d, v, t, df_ in zip(
            sub["date"], sub["vibration_mm_s"], sub["bearing_temp_c"], sub["defects_flagged"]
        )
    ]
