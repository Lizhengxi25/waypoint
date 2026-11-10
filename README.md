# Waypoint: source code

Classroom prototype for BUS2010 projects P06 (Internship Preparation LMS) and P07 (Co-op Learning Progress).
All data is synthetic.

## Run
- Built prototype: open `index.html` (repository root) or the published GitHub Pages URL in any modern browser (works offline).
- From source: open `source/src/index.html`.

## Edit
- `src/data.js`: people, skills, modules, learning outcomes, fixtures for P04/P05, demo scenarios
- `src/app.js`: screens, rules and handoffs (vanilla JavaScript, no framework)
- `src/styles.css`: design tokens and components
- `src/fonts/`: IBM Plex Sans, IBM Plex Mono and Source Serif 4 (SIL Open Font License)

## Build
`python3 build.py` writes `dist/Waypoint.html` (copy it to `index.html` to publish) with CSS, scripts and fonts embedded.

## Test
`pip install playwright && playwright install chromium`, then `python3 tests/acceptance_test.py`.
The script replays the journey from an empty record and checks every acceptance criterion (34 checks).
