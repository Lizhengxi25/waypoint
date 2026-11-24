/* Team P6/P7 — synthetic classroom data. All names, organisations' roles and records are invented. */

const PEOPLE = {
  student:    { id: "COOP-B001", name: "Layla Hassan",       role: "Student",                 short: "Layla" },
  reviewer:   { id: "STF-R014",  name: "Maya Chen",          role: "Learning reviewer",       short: "Maya" },
  coordinator:{ id: "STF-C002",  name: "Sara Al Hammadi",    role: "Co-op coordinator",       short: "Sara" },
  supervisor: { id: "EMP-S310",  name: "R. Khan",            role: "Workplace supervisor",    short: "R. Khan" },
  advisor:    { id: "FAC-A021",  name: "Dr. Ahmed Youssef",  role: "Academic advisor",        short: "Dr. Youssef" }
};

const SKILLS = [
  { id: "SK-JIRA", name: "Work tracking in Jira",  module: "MOD-JIRA-101" },
  { id: "SK-SQL",  name: "SQL for analytics",      module: "MOD-SQL-101" },
  { id: "SK-VIZ",  name: "Data visualisation",     module: "MOD-VIZ-101" }
];

const MODULES = {
  "MOD-JIRA-101": {
    id: "MOD-JIRA-101", skill: "SK-JIRA", status: "full",
    title: "Tracking team work in Jira",
    outcome: "Create, assign and progress work items on a team board, and explain each status change so a colleague can follow the work.",
    minutes: 90,
    resource: {
      title: "How a team board tells the story of the work",
      minutes: 20,
      parts: [
        ["A work item is one piece of work", "Each item has a short summary that says what will be done, for example “Clean turnaround-time data for Terminal 3”. If you cannot finish it in a few days, split it."],
        ["Every item has one owner", "The assignee is the person who will move it forward. Unassigned work is invisible work: nobody is accountable for it."],
        ["Status shows where the work is", "Items move from To do, to In progress, to Done. Move an item when its real state changes, not to look busy."],
        ["Explain the change", "When you move an item, leave a one-line reason: what changed and what happens next. This is the record your supervisor and team read."]
      ]
    },
    task: "Your ground-operations analytics team is starting a sprint. On the simulated board, create at least two work items, assign an owner to every item, move one item from To do through In progress to Done, and give a reason for each status change. Then submit the board with a short explanation.",
    checklist: [
      "Creates at least two work items with clear, specific summaries",
      "Gives every work item an owner",
      "Moves at least one item from To do through In progress to Done",
      "Explains each status change in plain language"
    ]
  },
  "MOD-SQL-101": {
    id: "MOD-SQL-101", skill: "SK-SQL", status: "outline",
    title: "Querying operational data with SQL",
    outcome: "Write SELECT, JOIN and GROUP BY queries that answer a stated operational question, and check the result for missing data.",
    minutes: 120,
    task: "Planned: answer three questions about a synthetic flight-delay table and explain one data-quality issue.",
    checklist: ["Query answers the stated question", "Joins use the correct keys", "Aggregates are grouped correctly", "One data-quality issue is identified"]
  },
  "MOD-VIZ-101": {
    id: "MOD-VIZ-101", skill: "SK-VIZ", status: "outline",
    title: "Building a clear operational dashboard",
    outcome: "Choose a chart that fits the question, label it so a non-specialist can read it, and state the main finding in one sentence.",
    minutes: 120,
    task: "Planned: redesign a cluttered on-time-performance chart and write the headline finding.",
    checklist: ["Chart type fits the question", "Axes and units are labelled", "Colour is used for meaning only", "Headline finding is stated"]
  }
};

const BOARD_PEOPLE = ["Layla Hassan", "Omar Saleh", "Priya Nair"];

const OUTCOMES = [
  { id: "LO1", name: "Apply data analysis to an operational problem" },
  { id: "LO2", name: "Communicate findings to non-specialist stakeholders" },
  { id: "LO3", name: "Work effectively in a professional team" },
  { id: "LO4", name: "Reflect on professional growth and ethics" }
];

/* Period 1 follows the confirmed placement from P04 (OP-028: 1 Feb to 31 May 2027, from the P03 listing). app.js resets it from the placement on every render. */
const PERIOD = { id: "P1", label: "Period 1", start: "2027-02-01", end: "2027-05-31" };
const ADVISORS = [{ id: "FAC-A021", name: "Dr. Ahmed Youssef" }];
const P06_STUDENTS = ["COOP-B001"];

/* Samples standing in for other teams' files until they send real ones.
   Both follow the P04/P05 data dictionary v3 (github.com/faizr206/ProjectManagement-AIRecommendation, docs/data-dictionary.md, 24 Nov 2026).
   Real files from P04/P05 are imported the same way (Skill gaps > Import, Placement > Import). */
const FIXTURES = {
  /* P05 skill_gap_handoffs.p06_payload. With P01's profile for Layla (v2: SQL reviewed, Jira self-declared) and OP-028 v2 (required SQL + Jira),
     P05 rules-v3 lists one gap: Jira. P05 creates gap_id. */
  P05_GAPS: [
    { gap_id: "GAP-0001", student_id: "COOP-B001", skill_id: "SK-JIRA", opportunity_id: "OP-028", reason: "OP-028 requires Jira; not yet demonstrated",
      recommendation_id: "REC-7F3A2C91", opportunity_version: 2, profile_version: 2 }
  ],
  /* P04 p07_handoffs.payload. academic_advisor is null because P04 does not hold it; the coordinator assigns it in P07. */
  P04_PLACEMENT_CONFIRMED: {
    placement_id: "PL-0001", status: "university_confirmed", student_id: "COOP-B001", opportunity_id: "OP-028",
    employer_name: "Emirates Group", location: "Dubai", role: "Aviation Analytics Intern",
    period_start: "2027-02-01", period_end: "2027-05-31",
    supervisor_name: "R. Khan (synthetic)", supervisor_contact: "supervisor.op028@example.com", academic_advisor: null,
    application_id: "APP-0001", confirmed_by: "Sara Al Hammadi", confirmed_at: "2026-12-14T10:00:00Z", opportunity_version: 2
  },
  /* Guard test only: P04 never sends a placement that is not university_confirmed. We check anyway. */
  P04_PLACEMENT_UNCONFIRMED: {
    placement_id: "PL-0002", status: "awaiting_university_confirmation", student_id: "COOP-B001", opportunity_id: "OP-031",
    employer_name: "Etihad Airways", location: "Abu Dhabi", role: "Network planning intern",
    period_start: "2027-02-01", period_end: "2027-05-31", supervisor_name: null, supervisor_contact: null, academic_advisor: null,
    application_id: "APP-0002", confirmed_by: null, confirmed_at: null, opportunity_version: 1
  }
};

/* P04 v3 payload -> P07 record */
function placementFromP04(r, receivedAt) {
  return {
    placementId: r.placement_id, studentId: r.student_id, opportunityId: r.opportunity_id, opportunityVersion: r.opportunity_version ?? null,
    applicationId: r.application_id ?? null, employer: r.employer_name, location: r.location || "", role: r.role || "",
    periodStart: r.period_start, periodEnd: r.period_end,
    supervisor: (r.supervisor_name || "").replace(/\s*\(synthetic\)\s*$/i, "") || null, supervisorContact: r.supervisor_contact || null,
    advisor: r.academic_advisor || null, advisorAssignedBy: null, advisorAssignedAt: null,
    status: r.status, confirmedBy: r.confirmed_by || null, confirmedAt: r.confirmed_at ? String(r.confirmed_at).slice(0, 10) : null,
    receivedAt, source: "P04"
  };
}

const BOARD_START = () => ({
  items: [
    { key: "OPS-101", summary: "Clean turnaround-time data for Terminal 3", assignee: "", status: "todo", createdBy: "seed" },
    { key: "OPS-102", summary: "Agree delay-cause categories with the ops team", assignee: "", status: "todo", createdBy: "seed" },
    { key: "OPS-103", summary: "Build weekly on-time-performance chart", assignee: "", status: "todo", createdBy: "seed" }
  ],
  log: [],
  next: 104
});

/* ---------- Presets ---------- */
function emptyState(today) {
  return {
    version: 4,
    today,
    role: "student",
    preset: "",
    gaps: [], resources: {}, board: BOARD_START(), submissions: [],
    placement: null, placementAttempts: [],
    agreement: { goals: [], status: "draft", signoffs: { student: null, supervisor: null, advisor: null } },
    logs: [], evidence: [], judgements: {}, milestones: [], actions: [],
    final: { employer: null, advisor: null },
    handoffs: [], events: [], importLog: []
  };
}

function presetFresh() {
  const s = emptyState("2026-11-23");
  s.preset = "fresh";
  s.role = "coordinator";
  s.events.push({ at: "2026-11-23", actor: "System", text: "Demo started from a clean record" });
  return s;
}

function presetMidpoint() {
  const s = emptyState("2027-03-18");
  s.preset = "midpoint";
  s.role = "student";
  s.gaps = [
    { id: "GAP-0001", studentId: "COOP-B001", skillId: "SK-JIRA", opportunityId: "OP-028", opportunityVersion: 2, recommendationId: "REC-7F3A2C91", profileVersion: 2, source: "P05", reason: FIXTURES.P05_GAPS[0].reason, createdAt: "2026-11-24", status: "closed" },
    { id: "GAP-0002", studentId: "COOP-B001", skillId: "SK-VIZ", opportunityId: "OP-028", source: "manual", reason: "Desirable for OP-028; self-declared only", createdAt: "2026-11-24", status: "open" }
  ];
  s.resources = { "MOD-JIRA-101": "2026-11-24" };
  const board = BOARD_START();
  board.items[0].assignee = "Layla Hassan"; board.items[0].status = "done";
  board.items[1].assignee = "Priya Nair"; board.items[1].status = "inprogress";
  board.items[2].assignee = "Omar Saleh";
  board.items.push({ key: "OPS-104", summary: "Check missing gate-time values in the March extract", assignee: "Layla Hassan", status: "todo", createdBy: "student" });
  board.items.push({ key: "OPS-105", summary: "Write the data dictionary for the delay table", assignee: "Omar Saleh", status: "todo", createdBy: "student" });
  board.next = 106;
  board.log = [
    { key: "OPS-101", from: "todo", to: "inprogress", reason: "Started cleaning; 3% of rows have no gate time.", at: "2026-11-25" },
    { key: "OPS-101", from: "inprogress", to: "done", reason: "Cleaned file shared with the team; missing rows flagged in OPS-104.", at: "2026-11-25" },
    { key: "OPS-102", from: "todo", to: "inprogress", reason: "Priya booked a call with the ops lead for Thursday.", at: "2026-11-25" }
  ];
  s.board = board;
  s.submissions = [{
    id: "EV-0001", skillId: "SK-JIRA", moduleId: "MOD-JIRA-101", status: "demonstrated",
    versions: [
      { v: 1, at: "2026-11-25", explanation: "I created two items and moved OPS-101 to Done.", board: JSON.parse(JSON.stringify(board)) },
      { v: 2, at: "2026-11-26", explanation: "I created OPS-104 and OPS-105 for work the team will need next, gave every item an owner, and moved OPS-101 from To do to Done once the cleaned file was shared. Each move has a reason so Omar and Priya can see what changed and what comes next.", board: JSON.parse(JSON.stringify(board)) }
    ],
    reviews: [
      { at: "2026-11-25", by: "Maya Chen", decision: "revision", comment: "Good board. Your explanation needs to say why each status changed and what happens next, so a colleague can follow it.", checklist: [true, true, true, false] },
      { at: "2026-11-27", by: "Maya Chen", decision: "demonstrated", comment: "All four criteria met. Clear reasons on every move.", checklist: [true, true, true, true] }
    ]
  }];
  s.handoffs = [
    { id: "HO-001", to: "P01", at: "2026-11-27", status: "sent", payload: { student_id: "COOP-B001", skill_id: "SK-JIRA", evidence_id: "EV-0001", outcome: "demonstrated", reviewer: "Maya Chen", review_date: "2026-11-27" } },
    { id: "HO-002", to: "P07", at: "2026-11-27", status: "sent", payload: { studentId: "COOP-B001", demonstrated: [{ skillId: "SK-JIRA", evidenceId: "EV-0001", reviewDate: "2026-11-27" }], inProgress: ["SK-VIZ"] } }
  ];
  s.placement = Object.assign(placementFromP04(FIXTURES.P04_PLACEMENT_CONFIRMED, "2026-12-15"), { advisor: "Dr. Ahmed Youssef", advisorAssignedBy: "Sara Al Hammadi", advisorAssignedAt: "2026-12-15" });
  s.agreement = {
    status: "agreed",
    goals: [
      { id: "G1", text: "Build a weekly on-time-performance dashboard that the ground-ops team uses", outcomes: ["LO1", "LO2"] },
      { id: "G2", text: "Present one analysis to the station operations meeting", outcomes: ["LO2", "LO3"] },
      { id: "G3", text: "Keep a weekly reflective log on professional practice", outcomes: ["LO4", "LO3"] }
    ],
    signoffs: { student: "2027-02-02", supervisor: "2027-02-03", advisor: "2027-02-04" }
  };
  s.evidence = [
    { id: "EV-0001", title: "Jira readiness (reviewed in P06)", date: "2026-11-27", source: "P06" },
    { id: "EV-0101", title: "OTP dashboard v1, screenshot and notes", date: "2027-02-18", source: "Student" },
    { id: "EV-0102", title: "Supervisor email confirming the dashboard is used weekly", date: "2027-03-04", source: "Supervisor" }
  ];
  s.logs = [
    { id: "LOG-01", week: 2, date: "2027-02-11", goal: "G1", status: "acknowledged",
      versions: [{ v: 1, at: "2027-02-11", text: "Mapped the data sources for on-time performance and agreed the weekly cut-off with R. Khan.", evidence: ["EV-0001"] }],
      feedback: [{ at: "2027-02-12", by: "R. Khan", type: "note", text: "Good start. Keep the cut-off on Sunday evening." }] },
    { id: "LOG-02", week: 3, date: "2027-02-18", goal: "G1", status: "acknowledged",
      versions: [
        { v: 1, at: "2027-02-18", text: "Finished the dashboard.", evidence: ["EV-0101"] },
        { v: 2, at: "2027-02-21", text: "Released dashboard v1 with three views: daily OTP, delay causes and gate turnaround. Ops leads asked for a filter by aircraft type, which I added on Friday. Next: test it with the night shift.", evidence: ["EV-0101"] }
      ],
      feedback: [
        { at: "2027-02-19", by: "R. Khan", type: "request", text: "Please say what the dashboard shows, who uses it and what changed after feedback." },
        { at: "2027-02-22", by: "R. Khan", type: "note", text: "Much clearer, thank you." }
      ] },
    { id: "LOG-03", week: 6, date: "2027-03-11", goal: "G3", status: "submitted",
      versions: [{ v: 1, at: "2027-03-11", text: "Reflected on presenting numbers to people who were not in the analysis. I over-explained the method and ran out of time for questions.", evidence: [] }],
      feedback: [] }
  ];
  s.judgements = {
    LO1: { level: "developing", evidence: ["EV-0101", "EV-0102"], by: "Dr. Ahmed Youssef", at: "2027-03-15" },
    LO2: { level: "developing", evidence: ["EV-0101"], by: "Dr. Ahmed Youssef", at: "2027-03-15" },
    LO3: { level: "none", evidence: [], by: null, at: null },
    LO4: { level: "none", evidence: [], by: null, at: null }
  };
  s.milestones = [
    { id: "MS-1", text: "Completed Emirates data-access training", done: true, at: "2027-02-05" },
    { id: "MS-2", text: "Dashboard v1 released to ground-ops", done: true, at: "2027-02-21" },
    { id: "MS-3", text: "Present at station operations meeting", done: false, at: null }
  ];
  s.actions = [
    { id: "ACT-01", text: "Agree a date to present at the station operations meeting", owner: "supervisor", due: "2027-03-10", status: "open", closure: "", closedAt: null, createdAt: "2027-03-02", createdBy: "Dr. Ahmed Youssef" },
    { id: "ACT-02", text: "Add evidence for teamwork (LO3), such as meeting notes or peer feedback", owner: "student", due: "2027-04-01", status: "open", closure: "", closedAt: null, createdAt: "2027-03-15", createdBy: "Dr. Ahmed Youssef" }
  ];
  s.events = [
    { at: "2026-11-24", actor: "Sara Al Hammadi", text: "Imported 1 skill gap from P05 (GAP-0001)" },
    { at: "2026-11-24", actor: "Sara Al Hammadi", text: "Added gap GAP-0002 for Data visualisation" },
    { at: "2026-11-25", actor: "Layla Hassan", text: "Submitted EV-0001 version 1" },
    { at: "2026-11-25", actor: "Maya Chen", text: "Requested a revision on EV-0001" },
    { at: "2026-11-26", actor: "Layla Hassan", text: "Submitted EV-0001 version 2" },
    { at: "2026-11-27", actor: "Maya Chen", text: "Recorded EV-0001 as demonstrated; sent to P01 and P07" },
    { at: "2026-12-15", actor: "Sara Al Hammadi", text: "Received confirmed placement PL-0001 from P04" },
    { at: "2026-12-15", actor: "Sara Al Hammadi", text: "Assigned academic advisor Dr. Ahmed Youssef to placement PL-0001" },
    { at: "2027-02-04", actor: "Dr. Ahmed Youssef", text: "Learning agreement agreed by all three parties" },
    { at: "2027-02-19", actor: "R. Khan", text: "Requested more detail on LOG-02" },
    { at: "2027-02-21", actor: "Layla Hassan", text: "Revised LOG-02" },
    { at: "2027-03-15", actor: "Dr. Ahmed Youssef", text: "Recorded midpoint judgements and support action ACT-02" }
  ];
  return s;
}

function presetEnd() {
  const s = presetMidpoint();
  s.preset = "end";
  s.today = "2027-06-04";
  s.role = "advisor";
  s.evidence.push(
    { id: "EV-0103", title: "Station ops meeting slides and attendance note", date: "2027-04-08", source: "Student" },
    { id: "EV-0104", title: "Peer feedback from Priya Nair on joint delay analysis", date: "2027-05-02", source: "Peer" },
    { id: "EV-0105", title: "Draft plan for night-shift dashboard (Period 2 work)", date: "2027-06-02", source: "Student" }
  );
  s.logs[2].status = "acknowledged";
  s.logs[2].feedback.push({ at: "2027-03-13", by: "R. Khan", type: "note", text: "Honest reflection. Try ending with one clear recommendation." });
  s.logs.push(
    { id: "LOG-04", week: 10, date: "2027-04-08", goal: "G2", status: "acknowledged",
      versions: [{ v: 1, at: "2027-04-08", text: "Presented the delay-cause analysis at the station operations meeting. Led with one recommendation, then took questions.", evidence: ["EV-0103"] }],
      feedback: [{ at: "2027-04-09", by: "R. Khan", type: "note", text: "Strong session; the duty managers asked for a follow-up." }] },
    { id: "LOG-05", week: 13, date: "2027-05-02", goal: "G3", status: "acknowledged",
      versions: [{ v: 1, at: "2027-05-02", text: "Worked with Priya on the joint delay analysis and asked her for written feedback on how I share work.", evidence: ["EV-0104"] }],
      feedback: [] },
    { id: "LOG-06", week: 1, date: "2027-06-02", goal: "G1", status: "submitted", period: "P2",
      versions: [{ v: 1, at: "2027-06-02", text: "Planned the night-shift version of the dashboard for next period.", evidence: ["EV-0105"] }],
      feedback: [] }
  );
  s.judgements = {
    LO1: { level: "achieved", evidence: ["EV-0101", "EV-0102"], by: "Dr. Ahmed Youssef", at: "2027-06-01" },
    LO2: { level: "achieved", evidence: ["EV-0101", "EV-0103"], by: "Dr. Ahmed Youssef", at: "2027-06-01" },
    LO3: { level: "developing", evidence: ["EV-0104"], by: "Dr. Ahmed Youssef", at: "2027-06-01" },
    LO4: { level: "none", evidence: [], by: null, at: null }
  };
  s.milestones[2].done = true; s.milestones[2].at = "2027-04-08";
  s.actions[0].status = "closed"; s.actions[0].closure = "Meeting date agreed for 8 April; see EV-0103"; s.actions[0].closedAt = "2027-03-19";
  s.actions[1].status = "closed"; s.actions[1].closure = "EV-0104 peer feedback added"; s.actions[1].closedAt = "2027-05-02";
  s.final.employer = { by: "R. Khan", at: "2027-05-28", text: "Layla delivered a dashboard the ground-ops team now uses every week and presented clearly to duty managers. Next step: own a small analysis end to end with less check-in.", wouldHost: "yes" };
  s.events.push(
    { at: "2027-03-19", actor: "R. Khan", text: "Closed ACT-01 with closure evidence" },
    { at: "2027-05-02", actor: "Layla Hassan", text: "Closed ACT-02 with EV-0104" },
    { at: "2027-05-28", actor: "R. Khan", text: "Submitted employer feedback for Period 1" }
  );
  return s;
}

/* Sprint 2 demo: P06 finished (Jira reviewed) while listings are still open, so matching can be rerun. */
function presetReviewed() {
  const m = presetMidpoint();
  const s = emptyState("2026-11-28");
  s.preset = "reviewed";
  s.role = "student";
  s.gaps = m.gaps; s.resources = m.resources; s.board = m.board; s.submissions = m.submissions; s.handoffs = m.handoffs;
  s.events = m.events.filter((e) => e.at <= "2026-11-28");
  return s;
}

const PRESETS = {
  fresh:    { label: "Fresh start", note: "No records. Run P06 end to end, then load the placement.", make: presetFresh },
  reviewed: { label: "Jira reviewed (Sprint 2 demo)", note: "28 Nov 2026. EV-0001 is demonstrated; rerun matching to see the change.", make: presetReviewed },
  midpoint: { label: "Mid-placement", note: "P06 complete; Week 10 of the Emirates placement.", make: presetMidpoint },
  end:      { label: "End of period", note: "Period 1 closed; ready for the final review.", make: presetEnd }
};
