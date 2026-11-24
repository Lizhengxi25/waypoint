"""Local server for the Team P6/P7 app with the LLM assistant.

Serves the built app and forwards assistant questions to OpenRouter. The API key stays on
this machine (read from ../.env); the browser never sees it. Only the student's question and
the approved FAQ entries are sent to the model: no student records.

    python3 build.py && python3 server.py        # then open http://localhost:8000

Endpoints
    GET  /api/llm   -> {"available": bool, "model": str}
    POST /api/chat  {"question": str, "candidates": [{"id","topic","q","a","source"}]}
                    -> {"answer": str, "faq_ids": [str], "handoff": bool, "reason": str, "model": str}
Without a key the app still works: the assistant shows the approved text (retrieval only).
"""
import json, os, pathlib, sys, urllib.error, urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
APP = HERE / "dist" / "TeamP6P7.html"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "thinkingmachines/inkling-2-mini"


def load_env(path=HERE.parent / ".env"):
    """Read KEY=VALUE lines from .env into os.environ (values already in the environment win)."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


SYSTEM = """You are the friendly co-op assistant inside the IPP Coop Platform, a university classroom prototype.
Students ask you about internships, matching, preparing skills such as Jira, placements, their co-op log, or anything else. Be natural, warm and genuinely helpful, like a good student advisor in a chat.

- Answer every message. Greetings and small talk get a short friendly reply.
- The APPROVED ENTRIES below are the programme's official answers. When one is relevant, base your answer on it, rephrase it naturally, and list its ID in faq_ids.
- When no entry fits, still help from general knowledge (for example how to prepare for an interview, what Jira is, how to write a good log entry). Leave faq_ids empty.
- Do not invent university-specific rules such as pay, GPA, credits, visas or deadlines. For those, give general guidance if useful, say the co-op coordinator will confirm, and set needs_coordinator to true.
- Never approve placements or share information about other students.
- Keep replies short: 1 to 5 sentences, plain English, speaking to the student as "you"."""

SCHEMA = {
    "name": "assistant_reply",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "answer": {"type": "string"},
            "faq_ids": {"type": "array", "items": {"type": "string"}},
            "needs_coordinator": {"type": "boolean"},
            "reason": {"type": "string"},
        },
        "required": ["answer", "faq_ids", "needs_coordinator", "reason"],
    },
}


def build_messages(question, candidates):
    entries = "\n\n".join(
        f"[{c['id']}] Topic: {c.get('topic', '')}\nAnswers questions like: {c.get('q', '')}"
        + (f" / {c['alts']}" if c.get("alts") else "")
        + f"\nApproved answer: {c.get('a', '')}\nSource: {c.get('source', '')}"
        for c in candidates)
    return [{"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"APPROVED ENTRIES:\n{entries}\n\nSTUDENT QUESTION:\n{question}"}]


def validate_reply(raw, candidate_ids):
    """Keep the model's reply; drop citations of entries we did not send. Only an empty reply goes to a person."""
    try:
        r = json.loads(raw)
    except (TypeError, ValueError):
        return {"answer": "", "faq_ids": [], "needs_coordinator": True, "reason": "The model did not return a readable reply."}
    answer = str(r.get("answer", "")).strip()
    if not answer:
        return {"answer": "", "faq_ids": [], "needs_coordinator": True, "reason": str(r.get("reason", "")).strip()[:300] or "Empty reply."}
    ids = [i for i in r.get("faq_ids", []) if i in candidate_ids]
    return {"answer": answer[:1500], "faq_ids": ids, "needs_coordinator": bool(r.get("needs_coordinator")), "reason": str(r.get("reason", "")).strip()[:300]}


def ask_model(question, candidates, key, model, timeout=25):
    # Inkling 2 Mini reasons before it answers. Keep the reasoning short and leave room for the answer,
    # or the reasoning uses up every token and the reply comes back empty.
    body = {"model": model, "messages": build_messages(question, candidates), "temperature": 0.5, "max_tokens": 2500,
            "reasoning": {"effort": "low", "exclude": True},
            "response_format": {"type": "json_schema", "json_schema": SCHEMA}}
    req = urllib.request.Request(OPENROUTER_URL, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Title": "IPP co-op assistant (classroom prototype)"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read())
    raw = (data["choices"][0]["message"].get("content") or "").strip()
    if raw.startswith("```"):  # tolerate a fenced JSON block
        raw = raw.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0]
    return validate_reply(raw, {c["id"] for c in candidates})


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            b = APP.read_bytes()
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(b)))
            self.end_headers(); self.wfile.write(b); return
        if self.path == "/api/llm":
            return self._json(200, {"available": bool(os.environ.get("OPENROUTER_API_KEY")), "model": os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)})
        self.send_error(404)

    def do_POST(self):
        if self.path != "/api/chat":
            return self.send_error(404)
        key = os.environ.get("OPENROUTER_API_KEY")
        if not key:
            return self._json(503, {"error": "No OPENROUTER_API_KEY in .env"})
        try:
            req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            q = str(req["question"])[:500]
            cands = [{k: str(c.get(k, ""))[:2000] for k in ("id", "topic", "q", "alts", "a", "source")} for c in req["candidates"][:6]]
        except (ValueError, KeyError, TypeError):
            return self._json(400, {"error": "Bad request"})
        model = os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)
        try:
            out = ask_model(q, cands, key, model)
        except urllib.error.HTTPError as e:
            return self._json(502, {"error": f"OpenRouter returned {e.code}"})
        except Exception as e:  # network error, timeout, unexpected reply
            return self._json(502, {"error": f"Model call failed: {type(e).__name__}"})
        out["model"] = model
        return self._json(200, out)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


if __name__ == "__main__":
    load_env()
    if not APP.exists():
        sys.exit("Build the app first: python3 build.py")
    port = int(os.environ.get("PORT", "8000"))
    has_key = bool(os.environ.get("OPENROUTER_API_KEY"))
    print(f"Team P6/P7 app on http://localhost:{port}  (assistant: {os.environ.get('OPENROUTER_MODEL', DEFAULT_MODEL) if has_key else 'retrieval only, no key in .env'})")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
