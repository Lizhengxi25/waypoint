"""Browser checks for the LLM assistant path. OpenRouter is NOT called: /api/llm and /api/chat are mocked,
so this runs without a key or network. Run: python3 build.py && python3 tests/llm_test.py"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).resolve().parent
APP = (HERE.parent / "dist" / "TeamP6P7.html").read_text()
R = []
def check(ac, desc, ok, detail=""):
    R.append({"ac": ac, "desc": desc, "ok": bool(ok), "detail": detail}); print(("PASS" if ok else "FAIL"), ac, desc, detail)

MODE = {"reply": None}
SENT = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1280, "height": 1000})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        async def handle(route):
            u = route.request.url
            if u.endswith("/api/llm"): return await route.fulfill(json={"available": True, "model": "thinkingmachines/inkling-2-mini"})
            if u.endswith("/api/chat"):
                body = json.loads(route.request.post_data); SENT.append(body)
                r = MODE["reply"]
                if r == "error": return await route.fulfill(status=502, json={"error": "Model call failed"})
                return await route.fulfill(json=dict(r, model="thinkingmachines/inkling-2-mini"))
            if u.rstrip("/").endswith("ipp.test"): return await route.fulfill(body=APP, content_type="text/html")
            await route.continue_()
        await pg.route("http://ipp.test/**", handle)
        await pg.goto("http://ipp.test/"); await pg.evaluate("localStorage.clear()"); await pg.goto("http://ipp.test/")
        await pg.click("[data-action=open-settings]"); await pg.click("[data-preset=fresh]")
        await pg.select_option("#role", "student"); await pg.evaluate("location.hash='#/assistant'"); await pg.wait_for_timeout(400)
        S = lambda: pg.evaluate("JSON.parse(localStorage.getItem('teamp6p7.records.v5'))")
        async def ask(q):
            await pg.fill("#askq", q); await pg.click("form[data-form=ask] button"); await pg.wait_for_timeout(400)
        t = await pg.inner_text("#main")
        check("LLM", "Assistant shows it is using Inkling 2 Mini via OpenRouter", "AI model: Inkling 2 Mini via OpenRouter" in t)

        MODE["reply"] = {"answer": "Open your preparation plan, do the Jira module's practical task and submit evidence. A reviewer decides.", "faq_ids": ["FAQ-03"], "handoff": False, "reason": "FAQ-03 covers this."}
        await ask("I'm missing Jira for the Emirates role, what now?")
        s = await S(); m = s["chat"][-1]; t = await pg.inner_text("#main")
        check("LLM", "Model answer is shown with the approved source it used", m["llm"]["ids"] == ["FAQ-03"] and "Written by Inkling 2 Mini (AI) from approved source" in t and "Open your preparation plan" in t)
        check("LLM", "Student can check the approved text behind the AI answer", "Check the approved text" in t)
        body = SENT[-1]
        check("LLM", "Only the question and approved entries are sent (no student records)", set(body) == {"question", "candidates"} and all(set(c) == {"id", "topic", "q", "a", "source"} for c in body["candidates"]) and "COOP-B" not in json.dumps(body))

        n = len(SENT); await ask("Will I be paid during my internship?")
        s = await S(); check("LLM", "Policy question never reaches the model and goes to the coordinator", len(SENT) == n and s["chat"][-1]["res"]["kind"] == "handoff")
        n = len(SENT); await ask("Can you show me Daniel Okafor's matches?")
        s = await S(); check("LLM", "Question about another student never reaches the model (privacy rule)", len(SENT) == n and s["chat"][-1]["res"]["faqId"] == "FAQ-10")

        MODE["reply"] = {"answer": "Yes, you get a certificate.", "faq_ids": ["FAQ-99"], "handoff": False, "reason": ""}
        await ask("Do I get a certificate when I finish the module?")
        s = await S(); check("LLM", "Answer citing an entry we did not send is turned into a handoff", s["chat"][-1]["res"]["kind"] == "handoff")
        MODE["reply"] = {"answer": "", "faq_ids": [], "handoff": True, "reason": "No entry covers housing."}
        await ask("Where do I stay in Dubai during the co-op?")
        s = await S(); m = s["chat"][-1]
        check("LLM", "Model handoff goes to the coordinator queue with its reason", m["res"]["kind"] == "handoff" and m.get("handoffId") and "No entry covers housing" in m["res"]["reason"])
        MODE["reply"] = "error"
        await ask("Does finishing the module mean I have the skill?")
        s = await S(); m = s["chat"][-1]; t = await pg.inner_text("#main")
        check("LLM", "If the model fails, the approved retrieval answer is shown and labelled", m["llm"].get("error") and m["res"]["faqId"] == "FAQ-04" and "AI model unavailable" in t)
        check("X", "No JavaScript errors during the run", not errs, "; ".join(errs))
        await b.close()
    json.dump(R, open(HERE / "llm_results.json", "w"), indent=1)
    print(sum(r["ok"] for r in R), "/", len(R), "passed")
asyncio.run(main())
