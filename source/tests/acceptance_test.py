import asyncio, json
from playwright.async_api import async_playwright
import pathlib, sys
URL = (pathlib.Path(__file__).resolve().parent.parent / "dist" / "Waypoint.html").as_uri()
R = []   # results
def check(ac, desc, ok, detail=""):
    R.append({"ac": ac, "desc": desc, "ok": bool(ok), "detail": detail}); print(("PASS" if ok else "FAIL"), ac, desc, detail)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1440, "height": 900})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
        await pg.click("[data-action=open-settings]"); await pg.click("[data-preset=fresh]")
        S = lambda: pg.evaluate("JSON.parse(localStorage.getItem('waypoint.records.v3'))")
        async def role(r): await pg.select_option("#role", r); await pg.wait_for_timeout(80)
        async def go(h): await pg.evaluate(f"location.hash='#/{h}'"); await pg.wait_for_timeout(120)
        async def text(): return await pg.inner_text("#main")

        # ---------- P06 ----------
        await role("coordinator"); await go("gaps")
        await pg.click("[data-action=import-gaps]")
        s = await S(); check("P06-X", "P05 gaps imported", len(s["gaps"]) == 2)
        await pg.select_option("#g-skill", "SK-JIRA"); await pg.fill("#g-reason", "Needed for OP-028"); await pg.click("form[data-form=manual-gap] button")
        t = await text(); check("P06-EXC", "Duplicate open gap is blocked with an explanation", "already has an open gap" in t)

        await role("student"); await go("plan")
        t = await text(); check("P06-AC1", "Gap appears on plan linked to its module", "Work tracking in Jira" in t and "GAP-001" in t)
        await go("module/MOD-JIRA-101")
        t = await text(); check("P06-AC1", "Module shows the evidence required (4-item checklist)", "The reviewer will check" in t and "Explains each status change" in t)
        await pg.click("[data-action=resource-done]")
        s = await S(); t = await text()
        check("P06-AC2", "Resource completion does not mark the skill demonstrated", s["resources"].get("MOD-JIRA-101") and not s["submissions"] and "Not yet demonstrated" in t)

        for summ in ["Check missing gate-time values in the March extract", "Write the data dictionary for the delay table"]:
            await pg.fill("#newsum", summ); await pg.click("form[data-form=add-item] button")
        await pg.click("[data-action=move][data-key='OPS-101']")
        await pg.wait_for_timeout(100)
        dlg_open = await pg.evaluate("document.querySelector('#reason').open")
        check("P06-AC3", "Moving an item without an owner is blocked", not dlg_open)
        for k, who in [("OPS-101","Layla Hassan"),("OPS-102","Priya Nair"),("OPS-103","Omar Saleh"),("OPS-104","Layla Hassan"),("OPS-105","Omar Saleh")]:
            await pg.select_option(f"#as-{k}", who); await pg.wait_for_timeout(40)
        await pg.click("[data-action=move][data-key='OPS-101']"); await pg.fill("#reason-text", "ok"); await pg.click("#reason button[type=submit]")
        e = await pg.is_visible("#reason-err"); check("P06-AC3", "Status change requires a reason", e)
        await pg.fill("#reason-text", "Started cleaning; 3% of rows lack gate time."); await pg.click("#reason button[type=submit]")
        await pg.click("[data-action=move][data-key='OPS-101']"); await pg.fill("#reason-text", "Cleaned file shared; gaps tracked in OPS-104."); await pg.click("#reason button[type=submit]")
        s = await S(); check("P06-AC3", "Student created, assigned and moved items with reasons on the simulated board", sum(1 for i in s["board"]["items"] if i["createdBy"]=="student")==2 and len(s["board"]["log"])==2 and all(i["assignee"] for i in s["board"]["items"]))

        await pg.fill("#expl", "I moved OPS-101 to Done."); await pg.click("form[data-form=submit-evidence] button")
        t = await text(); check("P06-EXC", "Too-short evidence explanation is rejected with guidance", "Write at least 25" in t)
        await pg.fill("#expl", "I created OPS-104 and OPS-105 for work the team needs next and gave every item an owner. I moved OPS-101 from To do to In progress when cleaning started and to Done once the file was shared.")
        await pg.click("form[data-form=submit-evidence] button")
        s = await S(); check("P06-X", "Evidence EV-0001 v1 submitted and board locked", s["submissions"][0]["status"]=="submitted" and "locked" in (await text()))
        await pg.screenshot(path="/tmp/flow_module_submitted.png")

        await role("reviewer"); await go("submission/EV-0001")
        for i in range(3): await pg.check(f"input[name=c{i}]")
        await pg.click("button[value=demonstrated]")
        t = await text(); check("P06-AC4", "Demonstrated cannot be recorded unless every criterion is met", "All four criteria must be met" in t)
        await pg.fill("#rcomment", "Explain why each status changed and what happens next."); await pg.click("button[value=revision]")
        s = await S(); check("P06-AC4", "Reviewer requests a revision with a comment", s["submissions"][0]["status"]=="revision")

        await role("student"); await go("module/MOD-JIRA-101")
        t = await text(); check("P06-AC4", "Student sees the reviewer's revision request", "revision requested" in t)
        await pg.fill("#expl", "I created OPS-104 and OPS-105 for work the team needs next and gave every item an owner. OPS-101 moved to In progress because cleaning had started, and to Done once the cleaned file was shared, so Omar and Priya know the data is ready and missing rows are tracked in OPS-104.")
        await pg.click("form[data-form=submit-evidence] button")
        await role("reviewer"); await go("submission/EV-0001")
        for i in range(4): await pg.check(f"input[name=c{i}]")
        await pg.click("button[value=demonstrated]")
        s = await S(); sub = s["submissions"][0]
        check("P06-AC4", "Resubmission checked against checklist; original and revision both kept", sub["status"]=="demonstrated" and len(sub["versions"])==2 and len(sub["reviews"])==2)
        h = [x for x in s["handoffs"] if x["to"]=="P01"]
        ok = h and set(h[0]["payload"]) >= {"skillId","evidenceId","outcome","reviewDate"}
        check("P06-AC4", "P01 receives skill, evidence ID, outcome and review date", ok, json.dumps(h[0]["payload"]) if h else "")
        check("P06-X", "Readiness summary sent to P07 (internal handoff)", any(x["to"]=="P07" for x in s["handoffs"]))
        await pg.screenshot(path="/tmp/flow_review_done.png")
        await role("student"); await go("plan"); await pg.wait_for_timeout(2900); await pg.screenshot(path="/tmp/flow_plan_done.png")

        # ---------- P07 ----------
        await pg.click("[data-action=open-settings]"); await pg.fill("#demo-date", "2027-02-15"); await pg.click("form[data-form=date] button")
        await role("coordinator"); await go("placement")
        await pg.click("[data-action=placement-bad]")
        s = await S(); t = await text(); check("P07-EXC", "Accepted offer without university confirmation is rejected", s["placement"] is None and "not accepted" in t)
        await pg.click("[data-action=placement-ok]")
        s = await S(); check("P07-X", "Confirmed placement PL-028 received from P04 fixture", s["placement"]["placementId"]=="PL-028")

        await role("student"); await go("agreement")
        await pg.fill("#goal-text", "Build a weekly on-time-performance dashboard"); await pg.click("form[data-form=goal] button")
        t = await text(); check("P07-EXC", "Goal without a mapped outcome is rejected", "at least one learning outcome" in t)
        goals = [("Build a weekly on-time-performance dashboard the team uses", ["LO1","LO2"]), ("Present one analysis to the station operations meeting", ["LO2","LO3"]), ("Keep a weekly reflective log on professional practice", ["LO4"])]
        for g, los in goals:
            await pg.fill("#goal-text", g)
            for lo in los: await pg.check(f"input[name=lo][value={lo}]")
            await pg.click("form[data-form=goal] button")
        for r in ["student","supervisor","advisor"]:
            await role(r); await go("agreement"); await pg.click(f"[data-action=sign][data-who={r}]")
        s = await S(); check("P07-X", "Learning agreement: 3 goals mapped to outcomes, agreed by 3 parties", s["agreement"]["status"]=="agreed" and len(s["agreement"]["goals"])==3)

        await role("student"); await go("logbook")
        await pg.select_option("#l-goal", "G1"); await pg.fill("#l-text", "Finished the dashboard."); await pg.click("form[data-form=log] button")
        t = await text(); check("P07-EXC", "Log entry that is too brief is rejected with guidance", "at least eight words" in t)
        await pg.select_option("#l-goal", "G1"); await pg.fill("#l-text", "Finished the first version of the on-time-performance dashboard this week."); await pg.fill("#l-new", "OTP dashboard v1 screenshot")
        await pg.click("form[data-form=log] button")
        await role("supervisor"); await go("logbook")
        await pg.click("[data-action=log-request]"); await pg.fill("textarea[id^=req-]", "Please say what it shows, who uses it and what changed after feedback.")
        await pg.click("form[data-form=log-request] button[type=submit]")
        await role("student"); await go("logbook")
        await pg.click("[data-action=log-revise]"); await pg.fill("textarea[id^=rev-]", "Released dashboard v1 with daily OTP, delay causes and gate turnaround. Ops leads asked for an aircraft-type filter, which I added. Next: test with the night shift.")
        await pg.click("form[data-form=log-revise] button")
        await role("supervisor"); await go("logbook")
        if "Original entry" not in await text(): await pg.click("[data-action=toggle]")
        t = await text(); s = await S(); l = s["logs"][0]
        check("P07-AC1", "Log submitted, feedback requested, revised; original, feedback and revision all visible", len(l["versions"])==2 and "Original entry" in t and "Revision 1" in t and "feedback request" in t)
        await pg.screenshot(path="/tmp/flow_logbook.png", full_page=False)

        await role("advisor"); await go("progress")
        t = await text(); check("P07-AC2", "Outcomes with no linked evidence are marked missing", "Evidence missing" in t)
        await pg.click("[data-action=judge][data-lo=LO1]"); await pg.select_option("#lvl", "developing"); await pg.click("form[data-form=judge] button[type=submit]")
        t = await text(); check("P07-AC2", "A judgement cannot be saved without linked evidence", "Link at least one piece of evidence" in t)
        await pg.check("input[name=ev][value='EV-0101']"); await pg.click("form[data-form=judge] button[type=submit]")
        s = await S(); check("P07-AC2", "Judgement saved with evidence link", s["judgements"]["LO1"]["evidence"]==["EV-0101"])
        t = await text(); check("P07-AC2", "Progress view states host milestones do not demonstrate outcomes", "does not demonstrate an academic outcome" in t)
        await pg.fill("#a-text", "Agree a date to present at the station operations meeting"); await pg.select_option("#a-owner", "supervisor"); await pg.fill("#a-due", "2027-02-10"); await pg.click("form[data-form=action] button")
        await pg.fill("#a-text", "Add evidence for teamwork (LO3)"); await pg.select_option("#a-owner", "student"); await pg.fill("#a-due", "2027-03-01"); await pg.click("form[data-form=action] button")
        t = await text(); check("P07-AC3", "Action has owner and due date; overdue action is flagged", "Overdue" in t and "days late" in t)
        await role("supervisor"); await go("progress"); await pg.click("[data-action=close-open]"); await pg.click("form[data-form=close-action] button")
        t = await text(); check("P07-EXC", "Closing an action without closure evidence is rejected", "Describe the evidence" in t)
        await pg.fill("input[name=closure]", "Date agreed for 8 April; calendar invite sent"); await pg.click("form[data-form=close-action] button")
        s = await S(); a = s["actions"][0]; t = await text()
        check("P07-AC3", "Closed action shows closure evidence; completed and open actions visible", a["status"]=="closed" and a["closure"] and "Closed" in t and "Open" in t)

        await go("final"); t = await text(); check("P07-EXC", "Final review is locked before the period ends", "opens at the end of Period 1" in t)
        await pg.click("[data-action=open-settings]"); await pg.fill("#demo-date", "2027-06-21"); await pg.click("form[data-form=date] button")
        await role("supervisor"); await go("final")
        await pg.fill("#emp-text", "Layla delivered a dashboard the team uses weekly and presented clearly to duty managers."); await pg.click("form[data-form=employer] button")
        await role("advisor"); await go("final")
        await pg.select_option("#fo-LO4", "achieved"); await pg.fill("#f-sum", "Strong analytical delivery; teamwork evidence developing, reflection not yet evidenced."); await pg.fill("#f-next", "Lead one analysis end to end")
        await pg.click("form[data-form=final] button")
        t = await text(); check("P07-AC4", "Outcome cannot be marked achieved without in-period evidence", "cannot be marked achieved" in t)
        await pg.select_option("#fo-LO4", "noev"); await pg.fill("#f-sum", "Strong analytical delivery; teamwork evidence developing, reflection not yet evidenced."); await pg.fill("#f-next", "Lead one analysis end to end"); await pg.click("form[data-form=final] button")
        s = await S(); t = await text()
        check("P07-AC4", "Final view separates employer feedback from academic judgement and records the period", s["final"]["employer"] and s["final"]["advisor"]["period"]=="P1" and "Employer feedback" in t and "Academic judgement" in t and "20 Jun 2027" in t)
        await pg.reload(); s2 = await S(); check("X", "Records persist after reload", s2["final"]["advisor"] is not None)
        check("X", "No JavaScript errors during the run", not errs, "; ".join(errs))
        await b.close()
    json.dump(R, open(pathlib.Path(__file__).with_name("acceptance_results.json"),"w"), indent=1)
    print(sum(r["ok"] for r in R), "/", len(R), "passed")
asyncio.run(main())
