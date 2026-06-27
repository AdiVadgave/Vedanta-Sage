"""Predictive Maintenance agent — equipment risk scoring + early-warning alerts."""
from __future__ import annotations

from fastapi import APIRouter

from azure_llm import NOT_CONFIGURED, chat
from services import predictor

router = APIRouter(prefix="/api/predict", tags=["predictive"])

_ACTION_CACHE: dict[str, str] = {}

ACTION_SYSTEM = """You are a reliability engineer at Vedanta. Given an equipment
unit's sensor readings and failure probability, write ONE concise recommended
maintenance action (1-2 sentences) an early-warning alert can display. Be
specific about what to inspect or do."""


@router.get("/equipment")
def equipment():
    return predictor.score_equipment()


@router.get("/importances")
def importances():
    return predictor.feature_importances()


@router.get("/trend/{equipment_id}")
def trend(equipment_id: str):
    return predictor.equipment_trend(equipment_id)


@router.get("/alerts")
def alerts(threshold: float = 0.33):
    """Equipment over the risk threshold, each with an AI recommended action."""
    scored = predictor.score_equipment()
    out = []
    for eq in scored:
        if eq["failure_probability"] < threshold:
            continue
        eid = eq["equipment_id"]
        if eid in _ACTION_CACHE:
            action = _ACTION_CACHE[eid]
        else:
            prompt = (
                f"{eq['equipment_name']} ({eid}) at {eq['site']} - {eq['area']}. "
                f"Failure probability {eq['failure_probability']:.0%}, risk {eq['risk_band']}. "
                f"Vibration {eq['vibration_mm_s']} mm/s, bearing temp {eq['bearing_temp_c']} C, "
                f"oil pressure {eq['oil_pressure_bar']} bar, {eq['defects_flagged']} defects flagged, "
                f"{eq['hours_since_service']} hours since service. Recommend the action."
            )
            action = chat(prompt, system=ACTION_SYSTEM, temperature=0.2, max_tokens=120)
            if action == NOT_CONFIGURED:
                action = (
                    "Schedule inspection: vibration and bearing temperature trending "
                    "above baseline. Verify lubrication and bearing condition."
                )
            _ACTION_CACHE[eid] = action
        out.append({**eq, "recommended_action": action})
    return {"threshold": threshold, "count": len(out), "alerts": out}
