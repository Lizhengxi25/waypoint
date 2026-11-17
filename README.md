# Team P6/P7: co-op preparation, progress and AI features

Classroom prototype for BUS2010 IPP projects **P06** (internship preparation) and **P07** (co-op learning progress).
Sprint 2 adds two AI features:

- **Ask the assistant** (`#/assistant`): answers only from 12 approved FAQ entries and shows the source of each answer. Policy questions with no approved source (pay, GPA, credits, visas, remote work), low-confidence questions and requests for other students' data go to the co-op coordinator. No LLM is used.
- **Internship matches** (`#/matches`): up to three open opportunities ranked by visible rules (required skills 40, desirable 15, interests 30, location 15). Eligibility is checked separately. Each match shows its reasons and skill gaps, and a skill gap can go straight onto the P06 preparation plan.
- **AI checks** (`#/ai-checks`): reruns the assistant and matching tests live in the browser.
- **Embed** (`#/embed`): the assistant on its own, for other teams to place in an iframe:
  `<iframe src="https://lizhengxi25.github.io/waypoint/#/embed" title="IPP co-op assistant" width="380" height="600"></iframe>`

All people, students, opportunities and records are synthetic. A match is decision support. A placement becomes official only when the university confirms it.

## Run
Live site: https://lizhengxi25.github.io/waypoint/ (the repository name is kept from Sprint 1; the product is now Team P6/P7). Or open `index.html` in a browser. It works offline. Records are saved in each browser, so use **Demo scenarios and date** to load data:
- *Fresh start* (23 Nov 2026): empty records, used for the Sprint 2 demo.
- *Jira reviewed (Sprint 2 demo)* (28 Nov 2026): Jira evidence is reviewed, so you can rerun matching.
- *Mid-placement* and *End of period*: the P07 journey.

## Files
| Path | What it is |
|---|---|
| `index.html` | Built single-file app (published by GitHub Pages) |
| `data/` | Synthetic sample data: students, opportunities, approved FAQ, skill vocabulary (CSV) |
| `data/handoffs/` | Sample records for partner teams: P05 → P06 gaps (P05's format), P06 → P01 review results (snake_case, for the joint test), P04 → P07 placement (P04's proposed format) |
| `source/src/ai_data.js` | Approved FAQ, synthetic students and opportunities, weights, test plan, failure log |
| `source/src/ai_engine.js` | Assistant retrieval and matching rules (pure functions) |
| `source/src/app.js`, `data.js`, `styles.css` | Screens, P06/P07 data and the MBZUAI theme (navy #154677, blue #006BA1, gold #E5C687) |
| `source/tests/` | `ai_test.py` (28 checks) and `acceptance_test.py` (35 checks), with their result JSON |

## Build and test
```
cd source
python3 build.py                      # writes dist/TeamP6P7.html; copy it to ../index.html
pip install playwright && playwright install chromium
python3 tests/ai_test.py              # 28 checks
python3 tests/acceptance_test.py      # 35 checks
```
