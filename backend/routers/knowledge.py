"""Knowledge & Search agent — RAG over SOPs / risk assessments + standards watch."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from azure_llm import NOT_CONFIGURED, chat
from rag import index_mode, retrieve
from services.data_loader import get_documents, get_standards

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class AskRequest(BaseModel):
    question: str
    k: int = 4


SYSTEM = """You are Sage, a safety knowledge assistant for Vedanta operations.
Answer the worker's question ONLY using the provided context from Standard
Operating Procedures and risk assessments. Give clear, plain-language guidance a
worker at the point of work can act on. Use short bullet points where helpful.
Always ground your answer in the context. If the context does not contain the
answer, say so plainly and advise contacting the Area HSE Officer. Cite the SOP
IDs you used at the end as: Sources: <ids>."""


@router.post("/ask")
def ask(req: AskRequest):
    hits = retrieve(req.question, k=req.k)
    if not hits:
        return {
            "answer": "No safety documents are indexed yet. Please generate the demo data.",
            "sources": [],
            "mode": index_mode(),
        }

    context = "\n\n".join(
        f"[{h['doc_id']} — {h['title']}]\n{h['text']}" for h in hits
    )
    prompt = f"Context:\n{context}\n\nWorker question: {req.question}"
    answer = chat(prompt, system=SYSTEM, temperature=0.1)

    if answer == NOT_CONFIGURED:
        # Graceful demo fallback: return retrieved snippets directly.
        snippet = hits[0]["text"][:600]
        answer = (
            "⚠️ Azure OpenAI is not configured, so here is the most relevant "
            f"procedure extract:\n\n{snippet}\n\n(Configure the .env file to enable "
            "AI-generated plain-language answers.)"
        )

    sources = [
        {
            "doc_id": h["doc_id"],
            "title": h["title"],
            "kind": h["kind"],
            "score": h["score"],
            "snippet": h["text"][:280],
        }
        for h in hits
    ]
    return {"answer": answer, "sources": sources, "mode": index_mode()}


@router.get("/sources")
def list_sources():
    docs = get_documents()
    return [
        {"id": d["id"], "title": d["title"], "kind": d["kind"]} for d in docs
    ]


@router.get("/standards-watch")
def standards_watch():
    """Flag SOPs that reference an outdated standard version."""
    standards = get_standards()
    rows = []
    for s in standards:
        for ref in s.get("referencing_sops", []):
            stale = str(ref["referenced_version"]) != str(s["current_version"])
            rows.append(
                {
                    "sop": ref["sop"],
                    "sop_title": ref["title"],
                    "standard": s["code"],
                    "standard_title": s["title"],
                    "authority": s["authority"],
                    "referenced_version": ref["referenced_version"],
                    "current_version": s["current_version"],
                    "status": "OUTDATED" if stale else "Current",
                }
            )
    rows.sort(key=lambda r: r["status"] != "OUTDATED")
    outdated = sum(1 for r in rows if r["status"] == "OUTDATED")
    return {"total": len(rows), "outdated": outdated, "items": rows}
