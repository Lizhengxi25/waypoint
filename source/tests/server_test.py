"""Checks for server.py without calling OpenRouter (the model call is replaced by a fake).
Run: python3 tests/server_test.py"""
import json, os, pathlib, sys, threading, urllib.request, urllib.error
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import server
R = []
def check(desc, ok, detail=""):
    R.append({"ac": "LLM-SRV", "desc": desc, "ok": bool(ok), "detail": detail}); print(("PASS" if ok else "FAIL"), desc, detail)

C = {"FAQ-03", "FAQ-04"}
v = server.validate_reply(json.dumps({"answer": "Open your plan.", "faq_ids": ["FAQ-03"], "handoff": False, "reason": "FAQ-03"}), C)
check("A grounded answer citing a given entry is kept", not v["handoff"] and v["faq_ids"] == ["FAQ-03"])
v = server.validate_reply(json.dumps({"answer": "You will be paid.", "faq_ids": ["FAQ-99"], "handoff": False, "reason": ""}), C)
check("An answer citing an entry we did not send becomes a handoff", v["handoff"] and v["answer"] == "")
v = server.validate_reply(json.dumps({"answer": "Something", "faq_ids": [], "handoff": False, "reason": ""}), C)
check("An answer with no citation becomes a handoff", v["handoff"])
check("Text that is not JSON becomes a handoff", server.validate_reply("Sure! Here is", C)["handoff"])
msgs = server.build_messages("How do I learn Jira?", [{"id": "FAQ-03", "topic": "Preparation", "q": "Q", "a": "A", "source": "S"}])
check("The prompt holds only the question and the approved entries", "[FAQ-03]" in msgs[1]["content"] and "COOP-B" not in json.dumps(msgs))

# HTTP endpoints with a fake model
calls = []
server.ask_model = lambda q, c, key, model, timeout=25: calls.append((q, c)) or {"answer": "Open your plan.", "faq_ids": ["FAQ-03"], "handoff": False, "reason": "ok"}
httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler); port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{port}"
def post(body):
    req = urllib.request.Request(base + "/api/chat", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())
os.environ.pop("OPENROUTER_API_KEY", None)
j = json.loads(urllib.request.urlopen(base + "/api/llm").read())
check("Without a key the server reports the model as unavailable", j["available"] is False)
code, _ = post({"question": "q", "candidates": []})
check("Without a key /api/chat refuses (503) and calls nothing", code == 503 and not calls)
os.environ["OPENROUTER_API_KEY"] = "test-key-not-real"
j = json.loads(urllib.request.urlopen(base + "/api/llm").read())
check("With a key the server reports the model, never the key", j["available"] is True and "test-key" not in json.dumps(j) and j["model"])
code, j = post({"question": "How do I learn Jira?", "candidates": [{"id": "FAQ-03", "topic": "t", "q": "q", "a": "a", "source": "s"}]})
check("/api/chat returns the checked answer and the model name", code == 200 and j["faq_ids"] == ["FAQ-03"] and j["model"])
code, _ = post({"nonsense": 1})
check("A malformed request is refused (400)", code == 400)
check("The served page is the built app", b"Coop Platform" in urllib.request.urlopen(base + "/").read())
httpd.shutdown()
json.dump(R, open(pathlib.Path(__file__).with_name("server_results.json"), "w"), indent=1)
print(sum(r["ok"] for r in R), "/", len(R), "passed")
