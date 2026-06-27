"""Documentation Assistant — shift handover + pre-task docs, auto-fill, scoring."""
from __future__ import annotations

import json
import random

from fastapi import APIRouter
from pydantic import BaseModel

from azure_llm import NOT_CONFIGURED, chat, extract_json
from services.data_loader import get_incidents

router = APIRouter(prefix="/api/docs", tags=["documentation"])


# ── Auto-fill: pull "operational data" to pre-populate forms ──────────────────
@router.get("/autofill/handover")
def autofill_handover():
    inc = get_incidents()
    recent = inc.sort_values("date", ascending=False).head(3)
    return {
        "shift": random.choice(["A (06:00-14:00)", "B (14:00-22:00)", "C (22:00-06:00)"]),
        "site": random.choice(inc["site"].unique().tolist()),
        "area": random.choice(inc["area"].unique().tolist()),
        "outgoing_supervisor": random.choice(["R. Mishra", "S. Nayak", "A. Gupta", "P. Singh"]),
        "incoming_supervisor": random.choice(["K. Rao", "M. Das", "V. Sharma", "T. Patel"]),
        "open_permits": random.randint(1, 5),
        "equipment_status": random.choice(
            ["All running normal", "Conveyor BC-7 under maintenance", "Crane #2 isolated for repair"]
        ),
        "recent_events": [r.narrative for r in recent.itertuples()],
        "pending_actions": [
            "Verify LOTO on Pump P-12 before next shift start",
            "Replace frayed sling flagged on EOT Crane #2",
        ],
    }


@router.get("/autofill/pretask")
def autofill_pretask():
    inc = get_incidents()
    return {
        "task": random.choice(
            ["Conveyor belt replacement", "Furnace tap-hole cleaning", "Panel maintenance", "Crane sling change"]
        ),
        "site": random.choice(inc["site"].unique().tolist()),
        "area": random.choice(inc["area"].unique().tolist()),
        "crew_size": random.randint(2, 6),
        "permits_required": random.sample(
            ["Work at Height", "Confined Space", "Hot Work", "LOTO", "Electrical PTW"], 2
        ),
        "identified_hazards": random.sample(
            ["Stored energy", "Falling objects", "Hot surfaces", "Pinch points", "Slips/trips"], 3
        ),
    }


# ── AI generation of the document narrative ───────────────────────────────────
class GenerateRequest(BaseModel):
    doc_type: str  # "handover" | "pretask"
    fields: dict


HANDOVER_SYSTEM = """You are a shift supervisor at Vedanta writing a clear,
professional shift handover note from the structured fields provided. Be concise
and operationally useful. Cover: shift summary, equipment status, open permits,
safety-critical items the next shift must verify, and pending actions."""

PRETASK_SYSTEM = """You are a Vedanta supervisor preparing a pre-task safety brief
(toolbox talk) from the structured fields. Output: task overview, key hazards,
required permits, critical controls to verify before start, and PPE."""


@router.post("/generate")
def generate(req: GenerateRequest):
    system = HANDOVER_SYSTEM if req.doc_type == "handover" else PRETASK_SYSTEM
    prompt = f"Fields:\n{json.dumps(req.fields, indent=2)}\n\nWrite the document."
    text = chat(prompt, system=system, temperature=0.3, max_tokens=1500)
    if text == NOT_CONFIGURED:
        text = (
            "⚠️ Azure OpenAI not configured. Structured fields captured:\n\n"
            + json.dumps(req.fields, indent=2)
        )
    return {"document": text}


# ── AI completeness / quality scoring ─────────────────────────────────────────
class ScoreRequest(BaseModel):
    doc_type: str
    text: str


SCORE_SYSTEM = """You are an HSE documentation auditor at Vedanta. Score the
safety document for completeness and quality. Return STRICT JSON:
{
  "score": 0-100,
  "rating": "Poor|Fair|Good|Excellent",
  "strengths": ["..."],
  "gaps": ["specific missing or weak items"],
  "suggestions": ["concrete improvement", "..."]
}"""


@router.post("/score")
def score(req: ScoreRequest):
    prompt = f"Document type: {req.doc_type}\n\nDocument:\n{req.text}\n\nScore it."
    raw = chat(prompt, system=SCORE_SYSTEM, temperature=0.1, json_mode=True, max_tokens=2000)
    if raw == NOT_CONFIGURED:
        return {
            "score": 0,
            "rating": "N/A",
            "strengths": [],
            "gaps": ["Azure OpenAI not configured."],
            "suggestions": [],
            "ai": False,
        }
    data = extract_json(raw)
    if "_raw" in data:
        return {"score": 0, "rating": "N/A", "gaps": [data["_raw"]], "ai": True}
    data["ai"] = True
    return data
