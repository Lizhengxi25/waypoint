/* Team P6/P7 — Sprint 2 AI data. Everything here is synthetic classroom data.
   Approved knowledge = the BUS2010 Co-op Project Binder (v3) briefs and this app's own rules.
   No real student records are used. Employers other than the binder's Emirates/Etihad examples are fictional. */

const AI_META = {
  assistantVersion: "FAQ assistant v0.2 (approved-source retrieval, no LLM)",
  matcherVersion: "Matching rules v0.2 (transparent weighted rules)",
  kbApprovedBy: "Sara Al Hammadi (co-op coordinator persona)",
  kbApprovedOn: "2026-11-20",
  kbSource: "BUS2010 Co-op Project Binder v3 (P04–P07 briefs, common terms) and Team P6/P7 app rules"
};

/* ---------- Approved FAQ knowledge base ---------- */
const FAQ = [
  { id: "FAQ-01", topic: "Matching",
    q: "How are internships recommended to me?",
    alts: ["Which internships fit me?", "How does matching work?", "Why was this opportunity suggested?", "How do you rank opportunities?", "What roles match my profile and skills?"],
    keys: ["match", "recommend", "rank", "suggest", "fit", "suitable", "opportunity", "internship", "jobs", "profile", "score", "reason"],
    a: "The matching page suggests up to three open opportunities. It ranks them on four inputs you can see: required skills, desirable skills, shared interests and preferred location. Eligibility (programme, dates, listing open) is checked separately, and each suggestion lists its reasons and any skill gap. A suggestion is not an application or a placement.",
    source: "Binder P05: purpose and acceptance 1–2; Lab 3 matching guidance", link: "#/matches" },
  { id: "FAQ-02", topic: "Placement approval",
    q: "Who approves my placement?",
    alts: ["Is a recommendation an offer?", "Does a match mean I got the internship?", "Who confirms the placement?", "Who signs off my internship?"],
    keys: ["approve", "approval", "confirm", "confirmed", "placement", "offer", "official", "sign", "decide", "decision"],
    a: "A recommendation is decision support only. A placement becomes official only after the employer makes an offer and the university confirms it; P04 then sends the placement with status university_confirmed. The co-op coordinator records that confirmation. The assistant and the matching engine cannot approve anything.",
    source: "Binder shared data (P04 placement record); Lab 3 human control", link: "#/placement" },
  { id: "FAQ-03", topic: "Preparation",
    q: "How do I close a skill gap such as Jira?",
    alts: ["I am missing a required skill, what do I do?", "How can I learn Jira?", "How do I get better at a skill?", "What should I do about a skill gap?"],
    keys: ["gap", "missing", "skill", "learn", "jira", "prepare", "preparation", "module", "plan", "close"],
    a: "Open your preparation plan. Each gap links to a short module: read the resource, complete the practical task, and submit evidence with an explanation. A reviewer checks it against the module checklist. The gap closes only when the reviewer records the skill as demonstrated.",
    source: "Binder P06: purpose and acceptance 1", link: "#/plan" },
  { id: "FAQ-04", topic: "Preparation",
    q: "Does finishing the module mean I have the skill?",
    alts: ["If I complete the reading, is my skill demonstrated?", "Is reading the resource enough?", "Do I get the skill after the course?"],
    keys: ["finish", "complete", "reading", "resource", "module", "course", "enough", "demonstrate", "count"],
    a: "No. Completing the resource is recorded as activity only. A skill counts as demonstrated only after you submit evidence and a reviewer records the outcome against the checklist.",
    source: "Binder P06: acceptance 2", link: "#/module/MOD-JIRA-101" },
  { id: "FAQ-05", topic: "Preparation",
    q: "What evidence do I need for the Jira module?",
    alts: ["What will the reviewer check?", "What does the reviewer look for?", "What is on the Jira checklist?", "How is my Jira task assessed?"],
    keys: ["evidence", "checklist", "check", "reviewer", "jira", "task", "assess", "criteria", "submit"],
    a: "The reviewer checks four things: at least two work items with clear summaries; an owner on every item; at least one item moved from To do through In progress to Done; and a plain-language reason for each status change. Submit the board with an explanation of at least 25 words.",
    source: "Module MOD-JIRA-101 checklist (Binder P06 acceptance 3)", link: "#/module/MOD-JIRA-101" },
  { id: "FAQ-06", topic: "Preparation",
    q: "What happens if the reviewer asks for a revision?",
    alts: ["My evidence was sent back", "How do I resubmit?", "The reviewer requested changes"],
    keys: ["revision", "revise", "resubmit", "sent", "back", "change", "reviewer", "again", "feedback"],
    a: "Read the reviewer's comment on the module page, update your board or explanation, and submit again. Your original submission and the comment stay in the history, and the reviewer checks the new version against the same checklist.",
    source: "Binder P06: acceptance 4", link: "#/plan" },
  { id: "FAQ-07", topic: "Co-op progress",
    q: "What is the learning agreement and who signs it?",
    alts: ["How do I set my co-op goals?", "Who agrees my learning goals?", "What goes in the learning agreement?"],
    keys: ["agreement", "learning", "goal", "goals", "outcome", "sign", "agree", "supervisor", "advisor"],
    a: "The learning agreement holds three of your goals, each mapped to at least one learning outcome. You, your workplace supervisor and your academic advisor each agree it; once all three have agreed, it is locked.",
    source: "Binder P07: purpose", link: "#/agreement" },
  { id: "FAQ-08", topic: "Co-op progress",
    q: "How do I submit a weekly logbook entry?",
    alts: ["How do I record what I learned this week?", "Where do I write my weekly log?", "What does my supervisor do with my log?"],
    keys: ["log", "logbook", "weekly", "week", "entry", "record", "journal", "diary", "supervisor"],
    a: "Open the logbook, choose the goal the entry supports, describe what you did and learned (at least eight words) and link evidence if you have it. Your supervisor can acknowledge it or ask for more detail; if they ask, you revise it and the original stays in the history.",
    source: "Binder P07: acceptance 1", link: "#/logbook" },
  { id: "FAQ-09", topic: "Co-op progress",
    q: "How is my final review decided?",
    alts: ["Who grades my co-op?", "How is my co-op assessed at the end?", "Does my employer give my grade?"],
    keys: ["final", "review", "grade", "grading", "assess", "assessment", "end", "employer", "advisor", "judgement"],
    a: "At the end of the period your employer gives feedback and your academic advisor records a separate academic judgement for each outcome. An outcome can be marked achieved only with evidence from that period. Official grading is outside this prototype and follows university process.",
    source: "Binder P07: acceptance 4; outside scope (official grading)", link: "#/final" },
  { id: "FAQ-10", topic: "Privacy",
    q: "Can I see other students' profiles?",
    alts: ["Can I look at a classmate's matches?", "Show me another student's data", "Who can see my records?"],
    keys: ["other", "students", "classmate", "another", "privacy", "see", "profile", "data", "records", "personal"],
    a: "No. You can see only your own records. Coordinators and reviewers see what their role needs. This classroom demo uses synthetic students only, never real student information.",
    source: "Binder common terms (synthetic data); Lab 3 acceptance (no unapproved personal data)", link: "#/records" },
  { id: "FAQ-11", topic: "Matching",
    q: "Why does my match say eligibility needs checking?",
    alts: ["My availability is missing", "What does unknown eligibility mean?", "Why is a condition unknown?"],
    keys: ["eligibility", "eligible", "unknown", "availability", "available", "dates", "missing", "check", "condition"],
    a: "A mandatory condition could not be confirmed, usually because your availability dates are missing. The match is shown, but the condition is never treated as satisfied. Update your profile (P01) or ask the coordinator, who checks eligibility separately.",
    source: "Binder P05: acceptance 2", link: "#/matches" },
  { id: "FAQ-12", topic: "Matching",
    q: "Can I challenge a recommendation?",
    alts: ["I think my match is wrong", "I disagree with my ranking", "How do I ask the coordinator about a match?"],
    keys: ["challenge", "wrong", "disagree", "ranking", "correct", "coordinator", "ask", "review", "match"],
    a: "Yes. On the matching page choose “Ask coordinator to review” on any suggestion and say why. The coordinator can question or correct the inputs and replies in the same record.",
    source: "Binder P05: acceptance 3 (how users can challenge a result)", link: "#/matches" }
];

/* Policy topics that the approved sources do not cover. The assistant must hand these to a person. */
const AI_SENSITIVE = ["gpa", "grade point", "salary", "pay", "paid", "stipend", "allowance", "money", "visa", "remote", "remotely", "work from home", "abroad", "overseas",
  "credit", "credits", "deadline", "fee", "fees", "insurance", "holiday", "vacation", "leave", "overtime", "housing", "accommodation", "transport"];

const AI_SUGGESTED = [
  "Which internships fit me?",
  "Who approves my placement?",
  "How can I close my Jira skill gap?",
  "If I finish the reading, do I have the skill?",
  "How do I write my weekly log?",
  "Will I be paid during my co-op?"
];

/* ---------- Shared skill vocabulary (agreed IDs SK-JIRA / SK-SQL / SK-VIZ, plus proposed IDs) ---------- */
const SKILL_TAXONOMY = [
  { id: "SK-JIRA",  name: "Jira work tracking",       terms: ["jira", "jira software", "atlassian jira", "work tracking in jira"], agreed: true },
  { id: "SK-SQL",   name: "SQL",                      terms: ["sql", "sql for analytics", "mysql", "postgresql", "postgres", "sql server", "t-sql"], agreed: true },
  { id: "SK-VIZ",   name: "Data visualisation",       terms: ["data visualisation", "data visualization", "tableau", "power bi", "powerbi", "dashboards", "dashboard design"], agreed: true },
  { id: "SK-PY",    name: "Python",                   terms: ["python", "python programming", "python 3", "pandas"], agreed: true },
  { id: "SK-EXCEL", name: "Spreadsheets",             terms: ["excel", "microsoft excel", "spreadsheets", "google sheets"], agreed: true },
  { id: "SK-COMM",  name: "Communication and presenting", terms: ["communication", "presenting", "presentation", "public speaking", "stakeholder communication"], agreed: true },
  { id: "SK-UX",    name: "User research",            terms: ["user research", "ux research", "usability testing", "customer interviews"], agreed: false },
  { id: "SK-STATS", name: "Statistics",               terms: ["statistics", "statistical analysis", "regression", "r programming"], agreed: false },
  { id: "SK-FIN",   name: "Financial modelling",      terms: ["financial modelling", "financial modeling", "valuation", "dcf"], agreed: false },
  { id: "SK-FIGMA", name: "Figma (UI design and prototyping)", terms: ["figma", "ui design", "prototyping", "wireframing"], agreed: true },
  { id: "SK-DMKT",  name: "Digital marketing",        terms: ["digital marketing", "seo", "social media marketing"], agreed: true }
];

/* ---------- Synthetic student profiles (P01-shaped) ---------- */
const AI_STUDENTS = [
  { id: "COOP-B001", name: "Layla Hassan", profileVersion: 3, programme: "Business Analytics",
    interests: ["aviation", "analytics", "operations"], locations: ["Dubai", "Abu Dhabi"],
    availability: { from: "2027-01-10", to: "2027-06-20" },
    skills: [ { raw: "SQL", status: "self" }, { raw: "Excel", status: "self" }, { raw: "Tableau", status: "self" }, { raw: "Python programming", status: "self" } ],
    note: "Main persona. Jira becomes a reviewed skill when P06 records EV-0001 as demonstrated." },
  { id: "COOP-B002", name: "Daniel Okafor", profileVersion: 1, programme: "Computer Science",
    interests: ["software", "fintech", "data engineering"], locations: ["Abu Dhabi"],
    availability: { from: "2027-01-10", to: "2027-06-20" },
    skills: [ { raw: "Python 3", status: "self" }, { raw: "PostgreSQL", status: "self" }, { raw: "Git", status: "self" }, { raw: "Trello", status: "self" } ],
    note: "Strong technical fit for one role; two skills are not in the shared vocabulary." },
  { id: "COOP-B003", name: "Mei Tanaka", profileVersion: 2, programme: "Marketing",
    interests: ["retail", "customer experience", "ux"], locations: ["Dubai"],
    availability: null,
    skills: [ { raw: "User research", status: "self" }, { raw: "Google Sheets", status: "self" }, { raw: "Presenting", status: "self" }, { raw: "Figma", status: "self" } ],
    note: "Edge case: availability missing, so no eligibility can be confirmed." },
  { id: "COOP-B004", name: "Yusuf Demir", profileVersion: 1, programme: "Finance",
    interests: ["banking", "fintech", "finance"], locations: ["Abu Dhabi"],
    availability: { from: "2027-05-01", to: "2027-08-31" },
    skills: [ { raw: "Excel", status: "self" }, { raw: "Financial modeling", status: "self" }, { raw: "Power BI", status: "self" }, { raw: "SQL", status: "reviewed" } ],
    note: "Edge case: summer-only availability excludes most January roles." }
];

/* ---------- Synthetic published opportunities (P02/P03-shaped) ---------- */
const AI_OPPORTUNITIES = [
  { id: "OP-028", version: 2, employer: "Emirates Group", title: "Aviation analytics intern", location: "Dubai",
    start: "2027-02-01", end: "2027-05-31", status: "published", closes: "2026-12-10",
    programmes: ["Business Analytics", "Computer Science", "Data Science"], tags: ["aviation", "analytics", "operations"],
    required: ["SK-JIRA", "SK-EXCEL"], desirable: ["SK-SQL", "SK-VIZ"] },
  { id: "OP-031", version: 1, employer: "Etihad Airways", title: "Network planning intern", location: "Abu Dhabi",
    start: "2027-01-10", end: "2027-06-20", status: "published", closes: "2026-12-10",
    programmes: ["Business Analytics", "Data Science", "Engineering"], tags: ["aviation", "planning", "analytics"],
    required: ["SK-SQL", "SK-EXCEL"], desirable: ["SK-PY"] },
  { id: "OP-033", version: 1, employer: "Marina Logistics (fictional)", title: "Supply-chain data intern", location: "Dubai",
    start: "2027-01-10", end: "2027-06-20", status: "published", closes: "2026-12-15",
    programmes: ["Business Analytics", "Computer Science", "Industrial Engineering"], tags: ["logistics", "operations", "analytics"],
    required: ["SK-SQL", "SK-PY"], desirable: ["SK-VIZ", "SK-JIRA"] },
  { id: "OP-035", version: 1, employer: "Dune Fintech (fictional)", title: "Junior data engineering intern", location: "Abu Dhabi",
    start: "2027-01-10", end: "2027-06-20", status: "published", closes: "2026-12-15",
    programmes: ["Computer Science", "Data Science"], tags: ["fintech", "software", "data engineering"],
    required: ["SK-PY", "SK-SQL"], desirable: ["SK-JIRA"] },
  { id: "OP-037", version: 1, employer: "Palm Retail Group (fictional)", title: "Customer insights intern", location: "Dubai",
    start: "2027-01-10", end: "2027-06-20", status: "published", closes: "2026-12-20",
    programmes: ["Marketing", "Business Analytics"], tags: ["retail", "customer experience", "marketing"],
    required: ["SK-UX", "SK-EXCEL"], desirable: ["SK-COMM", "SK-VIZ"] },
  { id: "OP-039", version: 1, employer: "Oasis Health Data (fictional)", title: "Health analytics intern", location: "Abu Dhabi",
    start: "2027-01-10", end: "2027-06-20", status: "published", closes: "2026-12-20",
    programmes: ["Data Science", "Business Analytics", "Public Health"], tags: ["healthcare", "analytics"],
    required: ["SK-STATS", "SK-SQL"], desirable: ["SK-PY"] },
  { id: "OP-041", version: 1, employer: "Harbour Capital (fictional)", title: "Finance analyst summer intern", location: "Abu Dhabi",
    start: "2027-05-15", end: "2027-08-15", status: "published", closes: "2027-03-01",
    programmes: ["Finance", "Business Analytics", "Economics"], tags: ["banking", "fintech", "finance"],
    required: ["SK-EXCEL", "SK-FIN"], desirable: ["SK-VIZ", "SK-SQL"] },
  { id: "OP-043", version: 1, employer: "Skyline Media (fictional)", title: "Digital marketing intern", location: "Dubai",
    start: "2027-01-10", end: "2027-06-20", status: "closed", closes: "2026-11-01",
    programmes: ["Marketing"], tags: ["media", "marketing", "customer experience"],
    required: ["SK-COMM"], desirable: ["SK-VIZ"] },
  { id: "OP-045", version: 1, employer: "Lumen Travel (fictional)", title: "Digital experience intern", location: "Dubai",
    start: "2027-01-10", end: "2027-06-20", status: "published", closes: "2026-12-20",
    programmes: ["Marketing", "Design", "Business Analytics"], tags: ["customer experience", "ux", "travel"],
    required: ["SK-UX"], desirable: ["SK-COMM", "SK-EXCEL"] },
  { id: "OP-047", version: 1, employer: "Crescent Bank (fictional)", title: "Risk analytics summer intern", location: "Abu Dhabi",
    start: "2027-06-01", end: "2027-08-20", status: "published", closes: "2027-03-15",
    programmes: ["Finance", "Economics", "Data Science"], tags: ["banking", "risk", "analytics"],
    required: ["SK-SQL", "SK-STATS"], desirable: ["SK-EXCEL", "SK-PY"] }
];

/* Weights are editable and recorded with every run (rules baseline, P05 acceptance 4). */
const MATCH_WEIGHTS = { required: 40, desirable: 15, interests: 30, location: 15 };
const EVIDENCE_FACTOR = { reviewed: 1.0, self: 0.75 };   // self-declared skills count, but less than reviewed ones
const WEAK_MATCH = 40;

/* ---------- Test plan run on the AI checks page (expected results written before the run) ---------- */
const AI_TESTS = {
  chatbot: [
    { id: "CB-01", q: "Which internships are a good fit for me?", expect: "FAQ-01" },
    { id: "CB-02", q: "Who has to approve my placement before it is official?", expect: "FAQ-02" },
    { id: "CB-03", q: "I have a Jira skill gap. What should I do?", expect: "FAQ-03" },
    { id: "CB-04", q: "If I finish the reading, does that count as having the skill?", expect: "FAQ-04" },
    { id: "CB-05", q: "How do I record what I learned this week in my logbook?", expect: "FAQ-08" },
    { id: "CB-06", q: "What is the minimum GPA to apply for a co-op?", expect: "handoff" },
    { id: "CB-07", q: "Will I be paid during my internship?", expect: "handoff" },
    { id: "CB-08", q: "Can I do my co-op remotely from another country?", expect: "handoff" },
    { id: "CB-09", q: "Can you show me Daniel Okafor's matches?", expect: "FAQ-10" },
    { id: "CB-10", q: "Who signs off my internship?", expect: "FAQ-02" },
    { id: "CB-11", q: "What jobs match my profile?", expect: "FAQ-01", regression: "F-01" },
    { id: "CB-12", q: "How do I get better at Jira?", expect: "FAQ-03", regression: "F-03" },
    { id: "CB-13", q: "What does the reviewer look for in my Jira board?", expect: "FAQ-05", regression: "F-03" },
    { id: "CB-14", q: "Why did you recommend Etihad to me?", expect: "handoff", regression: "F-03", note: "Accepted limitation: employer-specific questions go to the coordinator" }
  ],
  checks: [
    { id: "EL-01", desc: "Closed listing OP-043 is never recommended", student: "COOP-B003" },
    { id: "EL-02", desc: "Unknown availability is shown as needs-check, not as satisfied", student: "COOP-B003" },
    { id: "EL-03", desc: "Summer-only availability excludes January role OP-035 with a reason", student: "COOP-B004" },
    { id: "FR-01", desc: "Fairness: changing only the name and ID gives identical rankings", student: "COOP-B001" },
    { id: "SE-01", desc: "Adding reviewed Jira evidence moves OP-028 to rank 1", student: "COOP-B001" },
    { id: "SE-02", desc: "Removing availability changes every result to needs-check", student: "COOP-B001" }
  ],
  matching: [
    { id: "MT-01", student: "COOP-B001", expectTop: ["OP-031", "OP-028", "OP-033"], note: "Layla before Jira is reviewed" },
    { id: "MT-02", student: "COOP-B002", expectTop: ["OP-035", "OP-033", "OP-028"], note: "Daniel: one strong, two weak matches" },
    { id: "MT-03", student: "COOP-B003", expectTop: ["OP-045", "OP-037"], note: "Mei: availability unknown, only two eligible" },
    { id: "MT-04", student: "COOP-B004", expectTop: ["OP-041", "OP-047"], note: "Yusuf: summer-only availability" }
  ]
};

/* Failures found while building and testing in Sprint 2 (kept as an honest record). */
const AI_FAILURE_LOG = [
  { id: "F-01", found: "2026-11-17", severity: "High: wrong answer given with no warning", version: "v0.1",
    what: "“What jobs match my profile?” returned the privacy answer (FAQ-10). The word “profile” appeared only in FAQ-10, so it outweighed the matching terms.",
    fix: "Added profile/jobs wording to FAQ-01 (curated by the coordinator). Retest CB-11 now returns FAQ-01. Every answer now shows its source and score and has a “Not what I asked” button that sends the question to the coordinator." },
  { id: "F-02", found: "2026-11-17", severity: "Medium: correct by luck", version: "v0.1",
    what: "“Which internships are a good fit for me?” tied between FAQ-01 and FAQ-02 (both 1.00) and was won only by ID order.",
    fix: "Ties within 0.05 are now broken by how often the shared terms appear in each entry. CB-01 now wins on content, not order." },
  { id: "F-03", found: "2026-11-17", severity: "Low: safe failure (handed to a person)", version: "v0.1",
    what: "Three paraphrases had an approved answer but scored below the threshold: “How do I get better at Jira?”, “What does the reviewer look for…”, “Why did you recommend Etihad…”.",
    fix: "Added two paraphrases to FAQ-03 and FAQ-05. Words that appear in no approved entry (e.g. employer names) now count at a capped weight. Employer-specific questions still go to the coordinator by design." },
  { id: "F-04", found: "2026-11-17", severity: "Medium: matching limitation", version: "v0.2",
    what: "Skills outside the shared vocabulary are ignored: Daniel’s Git and Trello add nothing to his score (Mei’s Figma was in the same position until SK-FIGMA was added (P04/P05 data dictionary v3)).",
    fix: "Unrecognised skills are listed on every result for the coordinator. Added proposed IDs for the skills P05 asked about (Python, Excel, Figma, Communication, Digital marketing). SoS action: agree the vocabulary with P01 and P05 before Sprint 3." }
];
