"""Incident Intelligence agent — analytics, recurring patterns, lessons learned."""
from __future__ import annotations

from fastapi import APIRouter

from azure_llm import NOT_CONFIGURED, chat, extract_json
from services import analytics

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

# Simple in-process cache so repeated demo clicks are instant and cost nothing.
_LESSON_CACHE: dict[str, dict] = {}


@router.get("/stats")
def stats():
    return analytics.headline_stats()


@router.get("/breakdowns")
def breakdowns():
    return analytics.breakdowns()


@router.get("/trend")
def trend():
    return analytics.monthly_trend()


@router.get("/patterns")
def patterns():
    return analytics.recurring_patterns()


LESSON_SYSTEM = """You are a Vedanta HSE knowledge manager. Given a recurring
incident pattern, write a concise 'Lessons Learned' bulletin that operations
teams can act on. Return STRICT JSON:
{
  "title": "short headline",
  "what_is_happening": "1-2 sentences",
  "why_it_matters": "1-2 sentences on risk",
  "key_lessons": ["lesson", "..."],
  "required_actions": ["action", "..."],
  "audience": "who must read this"
}"""


@router.post("/lessons")
def lessons(pattern: dict):
    pid = pattern.get("pattern_id", "")
    if pid in _LESSON_CACHE:
        return _LESSON_CACHE[pid]

    prompt = (
        f"Recurring pattern: {pattern.get('type')} caused by "
        f"{pattern.get('root_cause')}. It has occurred {pattern.get('count')} times "
        f"across sites {pattern.get('sites')}, most often in {pattern.get('top_area')}. "
        f"Linked SOP: {pattern.get('linked_sop')}. Example: {pattern.get('sample')}. "
        f"Write the Lessons Learned bulletin."
    )
    raw = chat(prompt, system=LESSON_SYSTEM, temperature=0.3, json_mode=True, max_tokens=2000)

    if raw == NOT_CONFIGURED:
        result = {
            "title": f"{pattern.get('type')} — recurring",
            "what_is_happening": pattern.get("sample", ""),
            "why_it_matters": "Configure Azure OpenAI to auto-generate lessons.",
            "key_lessons": [],
            "required_actions": [],
            "audience": "Operations & HSE",
            "ai": False,
        }
    else:
        result = extract_json(raw)
        if "_raw" in result:
            result = {"title": "Lessons Learned", "what_is_happening": result["_raw"]}
        result["ai"] = True

    if pid:
        _LESSON_CACHE[pid] = result
    return result
