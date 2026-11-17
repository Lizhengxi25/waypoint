/* Team P6/P7 — Sprint 2 AI engine.
   1) FAQ assistant: retrieves the closest APPROVED answer and quotes it with its source. It never writes new policy.
      Low confidence, uncovered policy topics, or requests for other people's data go to a human.
   2) Matching: transparent weighted rules. Eligibility is checked separately from ranking.
   Pure functions, no network, no LLM. Exposed as window.IPP_AI so the page and the tests share one engine. */
const IPP_AI = (function () {
  "use strict";

  /* ---------------- Text handling ---------------- */
  const STOP = new Set(("a an the i me my mine we our you your it its is are am be been was were do does did doing have has had " +
    "to of in on at for from by with about as into than then so if or and but not no can could should would will shall may might must " +
    "what which who whom whose when where why how this that these those there here please tell know want need get got any some " +
    "there's i'm it's what's").split(" "));
  const SYN = {
    recommend: "match", recommended: "match", recommendation: "match", recommendations: "match", suggest: "match", suggested: "match",
    matching: "match", matches: "match", fit: "match", fits: "match", suitable: "match", good: "match",
    internship: "placement", internships: "placement", coop: "placement", "co-op": "placement", job: "placement", position: "placement",
    opportunity: "placement", opportunities: "placement", placements: "placement", role: "placement",
    approves: "approve", approved: "approve", approval: "approve", confirm: "approve", confirms: "approve", confirmation: "approve",
    authorise: "approve", authorize: "approve", official: "approve", signs: "sign", "sign-off": "sign",
    finish: "complete", finished: "complete", completing: "complete", completed: "complete", done: "complete", read: "reading",
    proof: "evidence", logbook: "log", journal: "log", diary: "log", weekly: "week",
    grade: "grade", grades: "grade", graded: "grade", grading: "grade", marks: "grade", assessed: "assess", assessment: "assess", evaluate: "assess",
    revise: "revision", resubmit: "revision", redo: "revision", "sent back": "revision",
    classmate: "other", classmates: "other", someone: "other", another: "other", "other's": "other",
    available: "availability", dates: "availability",
    disagree: "challenge", wrong: "challenge", appeal: "challenge", dispute: "challenge",
    gaps: "gap", missing: "gap", lack: "gap",
    course: "module", lesson: "module", training: "module", modules: "module",
    skills: "skill", goals: "goal", outcomes: "outcome", students: "student"
  };
  function stem(w) {
    if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    return w;
  }
  function tokens(text) {
    return String(text || "").toLowerCase().replace(/[’']s\b/g, "").replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
      .filter((w) => w && !STOP.has(w)).map((w) => SYN[w] || w).map(stem);
  }

  /* Pre-index the approved knowledge base */
  const DOCS = FAQ.map((f) => { const all = tokens([f.q, ...f.alts, f.keys.join(" ")].join(" ")); const tf = {}; all.forEach((t) => (tf[t] = (tf[t] || 0) + 1)); return { f, toks: new Set(all), tf }; });
  const DF = {};
  DOCS.forEach((d) => d.toks.forEach((t) => (DF[t] = (DF[t] || 0) + 1)));
  // Words that no approved entry uses (names, employers, small talk) count at a capped weight (fix for F-03).
  const idf = (t) => (DF[t] ? Math.log((DOCS.length + 1) / (DF[t] + 0.5)) : 1.0);
  const THRESHOLD = 0.45;

  function personMentioned(text, selfId) {
    const t = String(text || "").toLowerCase();
    return AI_STUDENTS.find((s) => s.id !== selfId && (t.includes(s.name.toLowerCase()) || t.includes(s.name.split(" ")[0].toLowerCase() + "'s") || t.includes(s.name.split(" ")[0].toLowerCase() + "’s")));
  }
  function sensitiveTerm(text) {
    const t = " " + String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ") + " ";
    return AI_SENSITIVE.find((w) => t.includes(" " + w + " "));
  }

  /* Returns { kind: "answer"|"handoff", faq?, score, matched:[], ranked:[{id,score}], reason } */
  function answer(question, opts) {
    const selfId = (opts && opts.selfId) || "COOP-B001";
    const q = tokens(question);
    const ranked = DOCS.map((d) => {
      const uniq = [...new Set(q)];
      const total = uniq.reduce((s, t) => s + idf(t), 0) || 1;
      const hit = uniq.filter((t) => d.toks.has(t));
      const weight = hit.reduce((s, t) => s + idf(t) * Math.min(d.tf[t], 4), 0);
      return { id: d.f.id, f: d.f, score: hit.reduce((s, t) => s + idf(t), 0) / total, weight, matched: hit };
    }).sort((a, b) => (Math.abs(b.score - a.score) > 0.05 ? b.score - a.score : b.weight - a.weight) || a.id.localeCompare(b.id));
    // Near-ties are broken by how central the shared terms are to each entry, not by ID order (fix for F-02).
    const best = ranked[0];
    const top = ranked.slice(0, 3).map((r) => ({ id: r.id, score: +r.score.toFixed(2) }));

    const other = personMentioned(question, selfId);
    if (other) {
      const f = FAQ.find((x) => x.id === "FAQ-10");
      return { kind: "answer", faq: f, score: 1, matched: ["other person named"], ranked: top, guard: "privacy",
        reason: `Asked about another person (${other.id}); privacy answer given, no data shown.` };
    }
    const sens = sensitiveTerm(question);
    if (sens) {
      return { kind: "handoff", score: +best.score.toFixed(2), matched: best.matched, ranked: top, guard: "policy",
        reason: `“${sens}” is a policy topic that no approved source covers.` };
    }
    if (!q.length || best.score < THRESHOLD || best.matched.length < 2) {
      return { kind: "handoff", score: +best.score.toFixed(2), matched: best.matched, ranked: top, guard: "confidence",
        reason: `Best approved match ${best.id} scored ${best.score.toFixed(2)} (needs ${THRESHOLD} and two shared terms).` };
    }
    return { kind: "answer", faq: best.f, score: +best.score.toFixed(2), matched: best.matched, ranked: top,
      reason: `Retrieved ${best.id} (score ${best.score.toFixed(2)}).` };
  }

  /* ---------------- Matching ---------------- */
  const TAX = SKILL_TAXONOMY;
  const skillName = (id) => (TAX.find((k) => k.id === id) || { name: id }).name;
  function normalizeSkill(raw) {
    const r = String(raw || "").trim().toLowerCase();
    const k = TAX.find((x) => x.terms.includes(r));
    return k ? k.id : null;
  }
  function normalizeSkills(list) {
    const known = {}, unknown = [];
    (list || []).forEach((s) => {
      const id = s.id || normalizeSkill(s.raw);
      if (!id) { unknown.push(s.raw); return; }
      const prev = known[id];
      const factor = EVIDENCE_FACTOR[s.status] || EVIDENCE_FACTOR.self;
      if (!prev || factor > prev.factor) known[id] = { id, name: skillName(id), raw: s.raw, status: s.status, factor, evidence: s.evidence || null };
    });
    return { known, unknown };
  }

  function eligibility(st, op, today) {
    const checks = [];
    const open = op.status === "published" && (!op.closes || op.closes >= today);
    checks.push({ label: "Listing open", state: open ? "pass" : "fail", note: open ? `Open until ${op.closes}` : `Listing ${op.status === "closed" ? "closed" : "deadline passed"} (${op.closes})` });
    const prog = op.programmes.includes(st.programme);
    checks.push({ label: "Programme", state: prog ? "pass" : "fail", note: prog ? `${st.programme} is accepted` : `${st.programme} is not in ${op.programmes.join(", ")}` });
    if (!st.availability || !st.availability.from || !st.availability.to) {
      checks.push({ label: "Availability", state: "unknown", note: "Availability not provided: not treated as satisfied" });
    } else {
      const ok = st.availability.from <= op.start && st.availability.to >= op.end;
      checks.push({ label: "Availability", state: ok ? "pass" : "fail", note: ok ? `Available ${st.availability.from} to ${st.availability.to}` : `Placement runs ${op.start} to ${op.end}; available ${st.availability.from} to ${st.availability.to}` });
    }
    const status = checks.some((c) => c.state === "fail") ? "no" : checks.some((c) => c.state === "unknown") ? "check" : "eligible";
    return { status, checks };
  }

  function scoreOne(st, op, skills, W) {
    const cover = (ids) => ids.length ? ids.reduce((s, id) => s + (skills.known[id] ? skills.known[id].factor : 0), 0) / ids.length : 0;
    const req = cover(op.required), des = cover(op.desirable);
    const shared = st.interests.filter((i) => op.tags.includes(i));
    const intShare = shared.length / Math.max(1, Math.min(st.interests.length, op.tags.length));
    const loc = st.locations.includes(op.location) ? 1 : 0;
    const parts = { required: +(req * W.required).toFixed(1), desirable: +(des * W.desirable).toFixed(1), interests: +(intShare * W.interests).toFixed(1), location: loc * W.location };
    const total = +(parts.required + parts.desirable + parts.interests + parts.location).toFixed(1);
    const have = (ids) => ids.filter((id) => skills.known[id]).map((id) => `${skillName(id)} (${skills.known[id].status === "reviewed" ? "reviewed" : "self-declared"})`);
    const gaps = [...op.required.filter((id) => !skills.known[id]).map((id) => ({ id, name: skillName(id), kind: "required" })),
                  ...op.desirable.filter((id) => !skills.known[id]).map((id) => ({ id, name: skillName(id), kind: "desirable" }))];
    const reasons = [];
    const hr = have(op.required), hd = have(op.desirable);
    reasons.push(hr.length ? `Required skills you have: ${hr.join(", ")}` : "You have none of the required skills yet");
    if (hd.length) reasons.push(`Desirable skills you have: ${hd.join(", ")}`);
    reasons.push(shared.length ? `Shared interests: ${shared.join(", ")}` : "No shared interests with this role");
    reasons.push(loc ? `${op.location} is one of your preferred locations` : `${op.location} is not a preferred location`);
    return { total, parts, reasons, gaps };
  }

  /* Returns { ranked:[top 3], others:[eligible beyond 3], excluded:[], unknownSkills:[], method } */
  function match(student, opps, opts) {
    const o = Object.assign({ today: "2026-11-23", weights: MATCH_WEIGHTS, limit: 3 }, opts || {});
    const skills = normalizeSkills(student.skills);
    const rows = opps.map((op) => {
      const el = eligibility(student, op, o.today);
      const sc = scoreOne(student, op, skills, o.weights);
      return Object.assign({ op, eligibility: el, weak: sc.total < WEAK_MATCH, inputs: `${student.id} profile v${student.profileVersion} · ${op.id} listing v${op.version}` }, sc);
    });
    const ok = rows.filter((r) => r.eligibility.status !== "no").sort((a, b) => b.total - a.total || a.op.id.localeCompare(b.op.id));
    return {
      ranked: ok.slice(0, o.limit).map((r, i) => Object.assign(r, { rank: i + 1 })),
      others: ok.slice(o.limit),
      excluded: rows.filter((r) => r.eligibility.status === "no"),
      unknownSkills: skills.unknown,
      skills: Object.values(skills.known),
      method: { version: AI_META.matcherVersion, weights: o.weights, evidenceFactor: EVIDENCE_FACTOR, weakBelow: WEAK_MATCH, today: o.today }
    };
  }

  return { tokens, answer, match, normalizeSkill, normalizeSkills, eligibility, skillName, THRESHOLD };
})();
if (typeof window !== "undefined") window.IPP_AI = IPP_AI;
