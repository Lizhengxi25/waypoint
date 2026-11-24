"""Sprint 3 checks: files from partner teams in the P04/P05 data dictionary v3 format, and the exceptions on import.
Run: python3 build.py && python3 tests/integration_test.py   (needs: pip install playwright && playwright install chromium)"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / "dist" / "TeamP6P7.html").as_uri()
DATA = HERE.parent.parent / "data" / "handoffs"
OUT = HERE / "screens"; OUT.mkdir(exist_ok=True)
R = []
def check(ac, desc, ok, detail=""):
    R.append({"ac": ac, "desc": desc, "ok": bool(ok), "detail": detail}); print(("PASS" if ok else "FAIL"), ac, desc, detail)

GAP = {"gap_id": "GAP-0001", "student_id": "COOP-B001", "skill_id": "SK-JIRA", "opportunity_id": "OP-028", "reason": "OP-028 requires Jira; not yet demonstrated",
       "recommendation_id": "REC-7F3A2C91", "opportunity_version": 2, "profile_version": 2}
PL = json.load(open(DATA / "p04_to_p07_confirmed_placement.sample.json"))["payload"]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1440, "height": 1000})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
        S = lambda: pg.evaluate("JSON.parse(localStorage.getItem('teamp6p7.records.v5'))")
        async def preset(k): await pg.click("[data-action=open-settings]"); await pg.click(f"[data-preset={k}]"); await pg.wait_for_timeout(100)
        async def role(r): await pg.select_option("#role", r); await pg.wait_for_timeout(80)
        async def go(h): await pg.evaluate(f"location.hash='#/{h}'"); await pg.wait_for_timeout(150)
        async def text(): return await pg.inner_text("#main")
        async def paste(kind, obj): await pg.fill(f"#imp-text-{kind}", obj if isinstance(obj, str) else json.dumps(obj)); await pg.click(f"form[data-form=import][data-kind={kind}] button[type=submit]"); await pg.wait_for_timeout(120)

        # ---------- P05 -> P06 skill gaps ----------
        await preset("fresh"); await role("coordinator"); await go("gaps")
        await paste("gaps", "{not json")
        t = await text(); check("S3-GAP", "Invalid JSON is refused with a message", "not valid JSON" in t)
        await paste("gaps", {"gaps": [GAP,
            dict(GAP, gap_id="GAP-0002", skill_id="SK-EXCEL", reason="OP-033 requires Excel"),
            {k: v for k, v in dict(GAP, gap_id="GAP-0003").items() if k != "reason"},
            dict(GAP, gap_id="GAP-0004", student_id="COOP-B002"),
            dict(GAP, gap_id="GAP-0005", profile_version=1),
            dict(GAP, gap_id="GAP-0006", opportunity_version=1),
            dict(GAP, gap_id="GAP-0007", opportunity_id="OP-999"),
            dict(GAP, gap_id="GAP-0008", student_id="COOP-B999")]})
        s = await S(); t = await text()
        check("S3-GAP", "Gap in P05's v3 format (no gap_type) is imported with its versions", len(s["gaps"]) == 1 and s["gaps"][0]["id"] == "GAP-0001" and s["gaps"][0]["recommendationId"] == "REC-7F3A2C91" and s["gaps"][0]["profileVersion"] == 2)
        check("S3-EXC", "Gap for a skill with no P06 module is not accepted, with the reason", "No P06 module for SK-EXCEL" in t)
        check("S3-EXC", "Gap with a missing field is not accepted", "Missing reason" in t)
        check("S3-EXC", "Gap for a student P06 does not hold is not accepted", "COOP-B002 (Arjun Mehta, in P01's data) has no P06 record" in t)
        check("S3-VER", "Gap built on an old P01 profile version is not accepted (P01 latest submitted = v2)", "Built on profile v1; P01's latest submitted profile is v2" in t)
        check("S3-VER", "Gap built on an old P03 listing version is not accepted", "Built on OP-028 v1; P03's current listing is v2" in t)
        check("S3-EXC", "Gap for an opportunity P03 has not published is not accepted", "OP-999 is not in P03's published listings" in t)
        check("S3-EXC", "Gap for a student not in P01's data is not accepted", "COOP-B999 is not in P01's student profiles" in t)
        check("S3-P01", "P06 shows Layla's P01 profile (latest submitted v2) and flags a review P06 has no record of", "v2, latest submitted of 2 versions" in t and "No P06 review record for E-SQL-01" in t)
        check("S3-GAP", "Gap row shows recommendation, opportunity version and profile version", "REC-7F3A2C91 · OP-028 v2 · profile v2" in t)
        await pg.screenshot(path=str(OUT / "s3_gaps_import.png"))
        await paste("gaps", [{"gap_id": "GAP-0001", "p06_payload": GAP}])
        s = await S(); t = await text(); check("S3-EXC", "Same gap sent twice is skipped, not duplicated", len(s["gaps"]) == 1 and "Already imported" in t)
        await role("student"); await go("plan")
        t = await text(); check("S3-GAP", "Imported gap appears on Layla's plan, linked to the Jira module", "GAP-0001" in t and "Work tracking in Jira" in t)

        # file upload path
        await preset("fresh"); await role("coordinator"); await go("gaps")
        await pg.set_input_files("#imp-file-gaps", str(DATA / "p05_to_p06_skill_gaps.sample.json")); await pg.wait_for_timeout(300)
        s = await S(); check("S3-GAP", "P05 file can be uploaded as a file, not only pasted", len(s["gaps"]) == 1 and "p05_to_p06" in s["importLog"][-1]["from"])

        # ---------- P04 -> P07 placement ----------
        await go("placement")
        handoff_row = {"handoff_id": "H07-0001", "sent_at": "2026-12-14T10:00:05Z", "receipt_status": "mock-received", "payload": dict(PL, placement_id="PL-0009", status="Awaiting university confirmation")}
        await paste("placement", handoff_row)
        s = await S(); t = await text()
        check("S3-EXC", "Placement not university_confirmed is not accepted", s["placement"] is None and "accepts only university_confirmed" in t)
        await paste("placement", dict(PL, period_end="2027-01-15"))
        s = await S(); t = await text(); check("S3-EXC", "Placement whose period ends before it starts is not accepted", s["placement"] is None and "not a valid date range" in t)
        await paste("placement", dict(PL, placement_id="PL-0010", opportunity_id="OP-039"))
        s = await S(); t = await text(); check("S3-EXC", "Placement for a listing P03 has not published is not accepted", s["placement"] is None and "OP-039 is not a published P03 listing" in t)
        await paste("placement", {"handoff_id": "H07-0001", "payload": PL})
        s = await S(); t = await text(); pl = s["placement"]
        check("S3-PL", "P04 placement in the v3 format is received (PL-0001, role, supervisor_name/contact, application, version)",
              pl and pl["placementId"] == "PL-0001" and pl["role"] == "Aviation Analytics Intern" and pl["supervisor"] == "R. Khan" and pl["applicationId"] == "APP-0001" and pl["opportunityVersion"] == 2)
        check("S3-PL", "Period 1 follows the placement: 1 Feb to 31 May 2027", "1 Feb 2027 to 31 May 2027" in t)
        check("S3-EXC", "Placement without academic_advisor is accepted and flagged for the coordinator", "No academic advisor yet" in t and "Not assigned" in t)
        check("S3-PL", "Supervisor contact is shown to the coordinator", "supervisor.op028@example.com" in t)
        await pg.screenshot(path=str(OUT / "s3_placement_no_advisor.png"))
        await paste("placement", PL)
        t = await text(); check("S3-EXC", "Same placement sent again is skipped (P04 sends each once)", "Already received" in t)
        await paste("placement", dict(PL, placement_id="PL-0003"))
        s = await S(); t = await text(); check("S3-EXC", "A second, different placement for Layla is not accepted", s["placement"]["placementId"] == "PL-0001" and "already has an active placement" in t)
        await role("student"); await go("placement")
        t = await text(); check("S3-PL", "Supervisor contact is not shown to the student", "supervisor.op028@example.com" not in t and "R. Khan" in t)
        await role("advisor"); await go("agreement")
        t = await text(); check("S3-EXC", "Learning agreement shows the advisor is missing", "No academic advisor is assigned" in t)
        await role("coordinator"); await go("placement"); await pg.click("form[data-form=assign-advisor] button")
        s = await S(); t = await text(); check("S3-PL", "Coordinator assigns the advisor; who and when are recorded", s["placement"]["advisor"] == "Dr. Ahmed Youssef" and s["placement"]["advisorAssignedBy"] == "Sara Al Hammadi" and "Assigned by Sara Al Hammadi" in t)
        await pg.screenshot(path=str(OUT / "s3_placement_advisor_assigned.png"))
        await go("records")
        await pg.click("details[data-key=rec-imports] summary"); t = await text()
        check("S3-REC", "Handoffs page keeps an import log with reasons", "Imports from partner teams" in t and "not accepted" in t and "accepts only university_confirmed" in t)

        # ---------- Other Sprint 3 changes ----------
        await role("student"); await go("matches")
        t = await text(); check("S3-OWN", "Matching page says matching is owned by P04/P05", "Reference only" in t and "owned by P04/P05" in t)
        check("S3-FAQ", "Partner FAQ file is loaded into the assistant's knowledge base", await pg.evaluate("Array.isArray(FAQ_PARTNER) && FAQ_PARTNER.every(f => FAQ.includes(f))"))
        for k in ["midpoint", "end"]:
            await preset(k); await go("final"); t = await text()
            check("S3-DATA", f"'{k}' scenario uses the P04 period (1 Feb to 31 May 2027)", "1 Feb 2027 to 31 May 2027" in t)
        check("X", "No JavaScript errors during the run", not errs, "; ".join(errs))
        await b.close()
    json.dump(R, open(HERE / "integration_results.json", "w"), indent=1)
    print(sum(r["ok"] for r in R), "/", len(R), "passed")
asyncio.run(main())
