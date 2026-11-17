"""Sprint 2 end-to-end checks for the AI features (assistant, matching, human review, embed).
Run: python3 build.py && python3 tests/ai_test.py   (needs: pip install playwright && playwright install chromium)"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / "dist" / "TeamP6P7.html").as_uri()
OUT = HERE / "screens"; OUT.mkdir(exist_ok=True)
R = []
def check(ac, desc, ok, detail=""):
    R.append({"ac": ac, "desc": desc, "ok": bool(ok), "detail": detail}); print(("PASS" if ok else "FAIL"), ac, desc, detail)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1440, "height": 1000})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
        await pg.click("[data-action=open-settings]"); await pg.click("[data-preset=fresh]")
        S = lambda: pg.evaluate("JSON.parse(localStorage.getItem('teamp6p7.records.v4'))")
        async def role(r): await pg.select_option("#role", r); await pg.wait_for_timeout(80)
        async def go(h): await pg.evaluate(f"location.hash='#/{h}'"); await pg.wait_for_timeout(150)
        async def text(): return await pg.inner_text("#main")
        async def ask(q): await pg.fill("#askq", q); await pg.click("form[data-form=ask] button"); await pg.wait_for_timeout(80)

        # ---------- Branding ----------
        side = await pg.inner_text(".side")
        check("UI", "App is branded Team P6/P7 (no Waypoint)", "Team P6/P7" in side and "Waypoint" not in (await pg.content()))
        navy = await pg.evaluate("getComputedStyle(document.querySelector('h1')).color")
        check("UI", "Theme uses MBZUAI navy #154677", navy == "rgb(21, 70, 119)", navy)

        # ---------- Assistant ----------
        await role("student"); await go("assistant")
        approved = [("Which internships are a good fit for me?", "FAQ-01"), ("Who has to approve my placement before it is official?", "FAQ-02"),
                    ("I have a Jira skill gap. What should I do?", "FAQ-03"), ("If I finish the reading, does that count as having the skill?", "FAQ-04"),
                    ("How do I record what I learned this week in my logbook?", "FAQ-08")]
        for q, _ in approved: await ask(q)
        s = await S(); got = [m["res"]["faqId"] for m in s["chat"]]
        check("CB", "Five approved questions answered from the right approved entries", got == [f for _, f in approved], str(got))
        t = await text(); check("CB", "Each answer shows its approved source", t.count("Approved source") == 5)
        await ask("What is the minimum GPA to apply for a co-op?")
        s = await S(); check("CB", "Unknown policy question is not answered; handed to coordinator", s["chat"][-1]["res"]["kind"] == "handoff" and len(s["handoffQ"]) == 1)
        t = await text(); check("CB", "Student is told the assistant won't guess", "won’t guess" in t)
        await ask("Can you show me Daniel Okafor's matches?")
        s = await S(); check("CB", "Request for another student's data gets the privacy answer", s["chat"][-1]["res"]["faqId"] == "FAQ-10")
        await pg.click("[data-action=ask][data-q='Will I be paid during my co-op?']")
        s = await S(); check("CB", "Suggested pay question also handed over", len(s["handoffQ"]) == 2)
        await pg.click("[data-action=chat-flag][data-id='M-001']")
        s = await S(); check("HR", "Student can send a doubtful answer to a coordinator", len(s["handoffQ"]) == 3 and s["chat"][0].get("flagged") == "Q-003")
        await pg.evaluate("document.getElementById('chatlog').scrollTop = 0")
        await pg.screenshot(path=str(OUT / "ai_assistant_student.png"))

        await role("coordinator"); await go("assistant")
        cnt = await pg.inner_text(".nav-group a[href='#/assistant']")
        check("HR", "Coordinator sees open handed-over questions in the navigation", "3" in cnt, cnt.replace("\n", " "))
        await pg.fill("#hr-Q-001", "ok"); await pg.click("form[data-form=handoff-reply][data-id='Q-001'] button")
        t = await text(); check("HR", "Too-short coordinator reply is rejected", "at least four words" in t)
        await pg.fill("#hr-Q-001", "There is no GPA rule in the co-op binder; I will confirm with the programme office and reply by Friday.")
        await pg.click("form[data-form=handoff-reply][data-id='Q-001'] button")
        await pg.screenshot(path=str(OUT / "ai_assistant_coordinator.png"))
        await role("student"); await go("assistant")
        t = await text(); check("HR", "Coordinator's human answer appears in the student's conversation, labelled as human", "Human answer" in t and "programme office" in t)

        # ---------- Matching ----------
        await go("matches")
        s = await S(); t = await text()
        ids = await pg.eval_on_selector_all("article.match", "els => els.map(e => e.querySelector('.id').textContent)")
        check("MT", "Layla sees three ranked opportunities", ids == ["OP-031", "OP-028", "OP-033"], str(ids))
        check("MT", "Each match shows reasons, eligibility and inputs", t.count("Why it is suggested") == 3 and t.count("Eligibility, checked separately") == 3 and "profile v3" in t)
        check("MT", "Human-control notice is shown", "Ranking is not placement" in t)
        check("PRIV", "Student cannot pick another student's profile", await pg.locator("#mstudent").count() == 0)
        await pg.screenshot(path=str(OUT / "ai_matches_layla.png"), full_page=True)
        await pg.click("[data-action=match-gap][data-skill='SK-JIRA'][data-op='OP-028']")
        s = await S(); g = [x for x in s["gaps"] if x["source"] == "match"]
        check("INT", "Jira gap from matching goes onto the P06 preparation plan", len(g) == 1 and g[0]["skillId"] == "SK-JIRA" and g[0]["opportunityId"] == "OP-028")
        await go("plan"); t = await text(); check("INT", "Plan shows the gap with its matching source", "From matching (Sprint 2)" in t)
        await go("matches")
        await pg.click("[data-action=toggle][data-id='mr-OP-028']")
        await pg.fill("#mr-OP-028", "Jira is required but I am learning it now; is it still worth applying?")
        await pg.click("form[data-form=match-review] button[type=submit]")
        s = await S(); check("HR", "Student asks the coordinator to review a match", len(s["matchReviews"]) == 1)
        await role("coordinator"); await go("matches")
        await pg.fill("#md-MR-001", "Yes, apply; finish the Jira module before the interview.")
        await pg.click("form[data-form=match-decide] button[value=ok]")
        s = await S(); check("HR", "Coordinator records a decision with a comment", s["matchReviews"][0]["status"] == "closed" and s["matchReviews"][0]["decision"] == "ok")
        await pg.select_option("#mstudent", "COOP-B003"); await pg.wait_for_timeout(120)
        t = await text(); n = await pg.locator("article.match").count()
        check("EL", "Mei (no availability): two results, all needing a coordinator check, list not padded", n == 2 and t.count("Eligibility needs a coordinator check") == 2 and "Only 2 open opportunities pass" in t)
        check("EL", "Closed listing OP-043 appears only under not recommended", "OP-043" in t.split("Not recommended")[1])
        await pg.screenshot(path=str(OUT / "ai_matches_mei.png"), full_page=True)
        await pg.select_option("#mstudent", "COOP-B002"); await pg.wait_for_timeout(120)
        t = await text(); check("DQ", "Skills outside the shared vocabulary are flagged (Git, Trello)", "Git, Trello" in t)

        # ---------- Rerun after reviewed evidence ("Jira reviewed" preset: EV-0001 demonstrated, 28 Nov 2026) ----------
        await pg.click("[data-action=open-settings]"); await pg.click("[data-preset=reviewed]")
        await role("student"); await go("matches")
        ids = await pg.eval_on_selector_all("article.match", "els => els.map(e => e.querySelector('.id').textContent)")
        t = await text()
        check("SE", "After Jira is reviewed in P06, OP-028 becomes rank 1 for Layla", ids[0] == "OP-028" and "reviewed EV-0001" in t, str(ids))
        await pg.screenshot(path=str(OUT / "ai_matches_layla_after_review.png"), full_page=True)

        # ---------- AI checks page ----------
        await go("ai-checks"); t = await text()
        stat = await pg.inner_text(".bigstat")
        a, bt = [int(x) for x in stat.replace("passed", "").split("/")]
        check("QA", "AI checks page: every live test passes", a == bt and a >= 24, stat)
        await pg.screenshot(path=str(OUT / "ai_checks.png"), full_page=True)

        # ---------- Embed ----------
        await pg.goto(URL + "#/embed"); await pg.wait_for_timeout(200)
        check("EMB", "Embed view shows only the assistant (no sidebar)", await pg.locator(".side").count() == 0 and await pg.locator("#askq").count() == 1)
        await pg.set_viewport_size({"width": 400, "height": 640}); await pg.screenshot(path=str(OUT / "ai_embed.png"))
        await pg.set_viewport_size({"width": 390, "height": 844}); await pg.goto(URL + "#/matches"); await pg.wait_for_timeout(200)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check("UI", "Matches page has no horizontal scroll at phone width", sw <= 390, str(sw))

        check("X", "No JavaScript errors during the run", not errs, "; ".join(errs))
        await b.close()
    json.dump(R, open(HERE / "ai_results.json", "w"), indent=1)
    print(sum(r["ok"] for r in R), "/", len(R), "passed")
asyncio.run(main())
