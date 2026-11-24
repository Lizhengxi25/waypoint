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


SYSTEM = """You are the co-op assistant inside the IPP Coop Platform, a university classroom prototype.
You help students with questions about internship matching, skill preparation (P06), placements and co-op learning progress (P07).

How to answer
- Use the APPROVED ENTRIES below as your only source of facts. Each entry has an ID, the question it answers and the approved answer.
- Be helpful. The student will rarely use the same words as an entry: match on meaning, not wording. If an entry answers the question, even partly, answer it.
- You may combine several entries, reorder them and rephrase them in plain, friendly English. Speak to the student as "you". Keep it short: 2 to 5 sentences.
- When it helps, end with one concrete next step taken from the entries (for example, which page to open).
- If an entry covers only part of the question, answer that part and say that a co-op coordinator can help with the rest.

What you must not do
- Do not add facts the entries do not state: no policy, dates, numbers, pay, grades, visas or names of your own.
- Do not approve placements, change records or discuss other students.
- Set handoff to true ONLY when none of the entries is relevant to the question. Then leave answer empty; a co-op coordinator will reply.

Output
- answer: your reply to the student.
- faq_ids: the IDs of every entry you used (only IDs from the list).
- handoff: true or false, as above.
- reason: one short sentence on which entries you used, or why none fit."""

SCHEMA = {
    "name": "faq_reply",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "answer": {"type": "string", "description": "Answer to the student, or empty when handing off"},
            "faq_ids": {"type": "array", "items": {"type": "string"}},
            "handoff": {"type": "boolean"},
            "reason": {"type": "string", "description": "One short sentence: which entry answers it, or why none does"},
        },
        "required": ["answer", "faq_ids", "handoff", "reason"],
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
    """Turn the model's text into a safe reply. Anything doubtful becomes a handoff."""
    try:
        r = json.loads(raw)
    except (TypeError, ValueError):
        return {"answer": "", "faq_ids": [], "handoff": True, "reason": "The model did not return valid JSON."}
    ids = [i for i in r.get("faq_ids", []) if i in candidate_ids]
    answer = str(r.get("answer", "")).strip()
    if r.get("handoff") or not ids or not answer:
        why = str(r.get("reason", "")).strip() or "No approved entry answers this question."
        if not r.get("handoff") and not ids:
            why = "The model cited no approved entry, so the question goes to a person."
        return {"answer": "", "faq_ids": [], "handoff": True, "reason": why[:300]}
    return {"answer": answer[:1200], "faq_ids": ids, "handoff": False, "reason": str(r.get("reason", "")).strip()[:300]}


def ask_model(question, candidates, key, model, timeout=25):
    # Inkling 2 Mini reasons before it answers. Keep the reasoning short and leave room for the answer,
    # or the reasoning uses up every token and the reply comes back empty.
    body = {"model": model, "messages": build_messages(question, candidates), "temperature": 0.2, "max_tokens": 2500,
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
