"""Incident Investigation Assistant — structured, SOP-aligned root-cause analysis."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from azure_llm import NOT_CONFIGURED, chat, extract_json
from rag import retrieve

router = APIRouter(prefix="/api/investigation", tags=["investigation"])


class InvestigateRequest(BaseModel):
    title: str
    description: str
    site: str | None = None
    area: str | None = None
    severity: str | None = None


SYSTEM = """You are an expert HSE incident investigator at Vedanta. Given an
incident description and relevant SOP context, produce a structured root-cause
analysis. Be specific and reference the relevant SOP controls that failed.

Return STRICT JSON with this exact shape:
{
  "summary": "one-paragraph factual summary",
  "immediate_cause": "the direct cause",
  "five_whys": ["why 1", "why 2", "why 3", "why 4", "why 5"],
  "root_cause": "the underlying systemic root cause",
  "contributing_factors": ["factor", "..."],
  "failed_controls": ["which critical control(s) failed, referencing SOP ids"],
  "corrective_actions": [
     {"action": "...", "owner": "role", "priority": "High|Medium|Low", "timeline": "e.g. 7 days"}
  ],
  "preventive_recommendations": ["..."]
}"""


def _fallback(req: InvestigateRequest) -> dict:
    return {
        "summary": f"{req.title}: {req.description[:160]}",
        "immediate_cause": "Configure Azure OpenAI (.env) to generate AI analysis.",
        "five_whys": ["AI not configured"],
        "root_cause": "AI not configured — showing template only.",
        "contributing_factors": [],
        "failed_controls": [],
        "corrective_actions": [],
        "preventive_recommendations": [],
        "ai": False,
    }


@router.post("/analyze")
def analyze(req: InvestigateRequest):
    # Pull relevant SOP context to align the investigation to procedures.
    query = f"{req.title} {req.description}"
    hits = retrieve(query, k=3)
    context = "\n\n".join(f"[{h['doc_id']}]\n{h['text']}" for h in hits)

    meta = f"Site: {req.site or 'N/A'} | Area: {req.area or 'N/A'} | Severity: {req.severity or 'N/A'}"
    prompt = (
        f"Incident title: {req.title}\n{meta}\n\nDescription:\n{req.description}\n\n"
        f"Relevant SOP context:\n{context}\n\nProduce the structured JSON analysis."
    )
    raw = chat(prompt, system=SYSTEM, temperature=0.2, json_mode=True, max_tokens=4000)

    if raw == NOT_CONFIGURED:
        return _fallback(req)

    data = extract_json(raw)
    refs = [h["doc_id"] for h in hits]
    if "_raw" in data:
        return {"summary": data["_raw"], "ai": True, "referenced_sops": refs}
    data["ai"] = True
    data["referenced_sops"] = refs
    return data
