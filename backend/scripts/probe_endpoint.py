"""List deployments and test the Anthropic messages route with x-api-key."""
import json
import os
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

KEY = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip().rstrip("/")
DEPLOY = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "").strip()

print("=" * 70)
print("FULL DEPLOYMENT LIST")
print("=" * 70)
r = httpx.get(
    f"{ENDPOINT}/openai/deployments?api-version=2023-03-15-preview",
    headers={"api-key": KEY},
    timeout=30,
)
deployments = r.json().get("data", [])
for d in deployments:
    print(f"  id={d.get('id'):35s} model={d.get('model'):30s} status={d.get('status')}")

print("\n" + "=" * 70)
print("ANTHROPIC /anthropic/v1/messages with x-api-key header")
print("=" * 70)
body = {
    "model": DEPLOY,
    "max_tokens": 20,
    "messages": [{"role": "user", "content": "Reply with the single word: OK"}],
}
for hdr_name in ["x-api-key", "api-key", "Authorization"]:
    val = f"Bearer {KEY}" if hdr_name == "Authorization" else KEY
    for ver in ["2023-06-01", None]:
        headers = {hdr_name: val, "Content-Type": "application/json"}
        if ver:
            headers["anthropic-version"] = ver
        for url in [
            f"{ENDPOINT}/anthropic/v1/messages",
            f"{ENDPOINT}/anthropic/v1/messages?api-version=2024-05-01-preview",
        ]:
            try:
                rr = httpx.post(url, json=body, headers=headers, timeout=40)
                tag = "OK 200" if rr.status_code == 200 else str(rr.status_code)
                qs = "?api-version" if "api-version" in url else ""
                print(f"[{tag}] hdr={hdr_name} av={ver} {qs} | {rr.text[:130]}")
                if rr.status_code == 200:
                    print("\n>>> WORKING:", url, "| header:", hdr_name, "| anthropic-version:", ver)
                    raise SystemExit(0)
            except httpx.HTTPError as e:
                print(f"[ERR] {hdr_name} {ver} | {e}")
print("\nNo 200 yet.")
