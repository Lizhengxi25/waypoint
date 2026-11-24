# Team P6/P7: co-op preparation, progress and AI features

Classroom prototype for BUS2010 IPP projects **P06** (internship preparation) and **P07** (co-op learning progress).
**Sprint 3 (25 Nov 2026)** connects our modules to the partner teams' agreed formats:

- **P05 → P06 skill gaps** and **P04 → P07 confirmed placements** are read in the format of the P04/P05 data dictionary v3 (github.com/faizr206/ProjectManagement-AIRecommendation, `docs/data-dictionary.md`). The coordinator uploads or pastes the file that P04/P05 export (Skill gaps > Import, Placement > Import). There is no live API between the apps: this is a file handoff.
- Every record is checked on import. Not accepted: missing fields, unknown students, skills with no P06 module, placements that are not `university_confirmed`, invalid periods, a second placement for the same student. Skipped: records already received. Each import is kept in the import log on the Handoffs page.
- Placement IDs follow P04 (`PL-0001`). P04 does not hold `academic_advisor`, so a placement can arrive without one; the coordinator assigns the advisor in P07 before the learning agreement can be agreed.
- Period 1 and the supervisor now come from the placement (OP-028: 1 Feb to 31 May 2027; supervisor from the P03 listing).
- Matching is owned by P04/P05. Our matching page stays as a labelled reference from Sprint 2.
- The P01–P03 team's data file (profiles and published listings, 24 Nov) is bundled in `data/p01p03/` (`source/tools/update_p01p03.py`). P06 shows Layla's latest submitted P01 profile, and imports are checked against it: a gap built on an old profile or listing version, or for an unpublished listing, is not accepted.
- The look follows the shared Coop Platform frame of the P04/P05 app (navy sidebar with the IPP mark, Inter, white cards, "Demo only" banner).
- Approved FAQ answers from the P01–P03 team can be added with `source/tools/import_faq.py` (see below).

Sprint 2 added two AI features:

- **Ask the assistant** (`#/assistant`): answers only from 12 approved FAQ entries and shows the source of each answer. Policy questions with no approved source (pay, GPA, credits, visas, remote work), low-confidence questions and requests for other students' data go to the co-op coordinator. No LLM is used.
- **Internship matches** (`#/matches`): up to three open opportunities ranked by visible rules (required skills 40, desirable 15, interests 30, location 15). Eligibility is checked separately. Each match shows its reasons and skill gaps, and a skill gap can go straight onto the P06 preparation plan.
- **AI checks** (`#/ai-checks`): reruns the assistant and matching tests live in the browser.
- **Embed** (`#/embed`): the assistant on its own, for other teams to place in an iframe:
  `<iframe src="https://lizhengxi25.github.io/waypoint/#/embed" title="IPP co-op assistant" width="380" height="600"></iframe>`

All people, students, opportunities and records are synthetic. A match is decision support. A placement becomes official only when the university confirms it.

## Run
Live site: https://lizhengxi25.github.io/waypoint/ (the repository name is kept from Sprint 1; the product is now Team P6/P7). Or open `index.html` in a browser. It works offline. Records are saved in each browser, so use **Demo scenarios and date** to load data:
- *Fresh start* (23 Nov 2026): empty records, used for the Sprint 2 and Sprint 3 demos.
- *Jira reviewed (Sprint 2 demo)* (28 Nov 2026): Jira evidence is reviewed, so you can rerun matching.
- *Mid-placement* and *End of period*: the P07 journey.

## Files
| Path | What it is |
|---|---|
| `index.html` | Built single-file app (published by GitHub Pages) |
| `data/` | Synthetic sample data: students, opportunities, approved FAQ, skill vocabulary (CSV) |
| `data/handoffs/` | Sample files: P05 → P06 gap and P04 → P07 placement (P04/P05 data dictionary v3 format, used until their real files arrive), P06 → P01 review results (snake_case, for the joint test with P01) |
| `source/src/ai_data.js` | Approved FAQ, synthetic students and opportunities, weights, test plan, failure log |
| `data/p01p03/`, `source/src/partner_data.js` | P01–P03 team's data (copy of their file) and the generated script the app loads |
| `source/src/ai_engine.js` | Assistant retrieval and matching rules (pure functions) |
| `source/src/app.js`, `data.js`, `styles.css` | Screens, P06/P07 data and the shared Coop Platform theme (navy #0C2840, blue #144673, gold #D9BA82) |
| `source/src/faq_partner.js` | Approved FAQ answers from the P01–P03 team (generated; empty until their file arrives) |
| `source/tools/import_faq.py` | Turns their Section / Question / Answer file into `faq_partner.js` and `data/faq_partner.csv` |
| `source/tests/` | `integration_test.py` (32 Sprint 3 checks), `ai_test.py` (28) and `acceptance_test.py` (37), with their result JSON |

## Build and test
```
cd source
python3 build.py                      # writes dist/TeamP6P7.html; copy it to ../index.html
pip install playwright && playwright install chromium
python3 tests/integration_test.py     # 32 checks (Sprint 3 partner imports)
python3 tests/ai_test.py              # 28 checks
python3 tests/acceptance_test.py      # 37 checks
```

## Add the P01–P03 team's FAQ answers
```
cd source
python3 tools/import_faq.py path/to/their_faq.csv --received 2026-11-24   # CSV, TSV or a | table
python3 build.py && python3 tests/ai_test.py                             # check nothing else changed
cp dist/TeamP6P7.html ../index.html
```
