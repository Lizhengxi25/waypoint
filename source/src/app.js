/* Team P6/P7 — Co-op preparation (P06), progress (P07) and Sprint 2 AI features. Vanilla JS, no build step required. */
(function () {
  "use strict";

  const STORE_KEY = "teamp6p7.records.v4";
  let S = load();
  let ui = { open: {}, errors: {}, draft: {} };

  /* ================= Storage ================= */
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.version === 3) return ensureAI(s); }
    } catch (e) { /* storage unavailable: fall back to memory */ }
    return ensureAI(PRESETS.midpoint.make());
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }
  function commit(msg) { save(); render(); if (msg) toast(msg); }

  /* ================= Helpers ================= */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function d(s) { if (!s) return "—"; const [y, m, dd] = s.split("-").map(Number); return `${dd} ${MONTHS[m - 1]} ${y}`; }
  function days(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); }
  const me = () => PEOPLE[S.role];
  const skillOf = (id) => SKILLS.find((k) => k.id === id);
  const words = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;
  function event(text) { S.events.push({ at: S.today, actor: me().name, text }); }
  function nextId(prefix, list, width) {
    let n = 0; list.forEach((x) => { const m = String(x.id).match(/(\d+)$/); if (m) n = Math.max(n, +m[1]); });
    return prefix + String(n + 1).padStart(width || 3, "0");
  }

  const ICON = {
    info: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.3v3.6M8 11.7v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    ok: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m4.8 8.2 2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const notice = (kind, html) => `<div class="notice ${kind}" role="note">${ICON[kind === "rule" ? "info" : kind === "ok" ? "ok" : "warn"]}<div>${html}</div></div>`;
  const chip = (cls, text) => `<span class="chip ${cls}">${esc(text)}</span>`;

  function locked(roleKey, what) {
    const p = PEOPLE[roleKey];
    return `<p class="locked">Only the ${esc(p.role.toLowerCase())} can ${esc(what)}. <button type="button" data-action="as" data-role="${roleKey}">View as ${esc(p.name)}</button></p>`;
  }
  const can = (...roles) => roles.includes(S.role);

  /* ================= Derived state: P06 ================= */
  const subFor = (skillId) => S.submissions.find((x) => x.skillId === skillId);
  function skillStatus(skillId) {
    const sub = subFor(skillId);
    if (!sub) return { key: "none", label: "Not yet demonstrated", cls: "none" };
    return {
      submitted:    { key: "submitted", label: "Awaiting review", cls: "wait" },
      revision:     { key: "revision", label: "Revision requested", cls: "warn" },
      not_yet:      { key: "not_yet", label: "Not yet demonstrated", cls: "warn" },
      demonstrated: { key: "demonstrated", label: "Demonstrated", cls: "ok" }
    }[sub.status];
  }
  function chainFor(gap) {
    const sk = skillOf(gap.skillId), mod = MODULES[sk.module], sub = subFor(gap.skillId);
    const learned = !!S.resources[mod.id];
    const st = sub ? sub.status : "none";
    const lastReview = sub && sub.reviews.length ? sub.reviews[sub.reviews.length - 1] : null;
    const steps = [
      { label: "Gap identified", sub: `${gap.source === "P05" ? "From P05" : gap.source === "match" ? "From matching (Sprint 2)" : "Entered by coordinator"}, ${d(gap.createdAt)}`, reached: true },
      { label: "Learn", sub: learned ? `Resource complete, ${d(S.resources[mod.id])}` : mod.status === "full" ? "Short resource" : "Module in development", reached: learned },
      { label: "Practise and submit", sub: sub ? `${sub.id} v${sub.versions.length}, ${d(sub.versions[sub.versions.length - 1].at)}` : "Practical task", reached: !!sub && st !== "revision" && st !== "not_yet" },
      { label: "Reviewer decision", sub: st === "submitted" ? "With reviewer" : st === "revision" ? "Revision requested" : st === "not_yet" ? "Not yet demonstrated" : lastReview ? `${lastReview.by}, ${d(lastReview.at)}` : "Checklist review", reached: st === "demonstrated", gate: true },
      { label: "Demonstrated", sub: st === "demonstrated" ? "Sent to profile (P01)" : "Needs reviewed evidence", reached: st === "demonstrated" }
    ];
    // current marker
    let cur = steps.findIndex((s) => !s.reached);
    if (cur >= 0) steps[cur].current = true;
    if (st === "revision" || st === "not_yet") { steps[3].blocked = true; steps[3].current = false; }
    if (st === "submitted") { steps[3].current = true; steps[2].reached = true; }
    return steps;
  }
  function chainHTML(steps, label) {
    return `<ol class="chain" aria-label="${esc(label)}">${steps.map((s) => `
      <li class="chain-step ${s.reached ? "reached" : ""} ${s.current ? "current" : ""} ${s.blocked ? "blocked" : ""} ${s.gate ? "gate" : ""}" style="list-style:none">
        <span class="chain-node" aria-hidden="true"></span>
        <div class="chain-label">${esc(s.label)}<span class="sr-only">${s.reached ? " (done)" : s.blocked ? " (needs action)" : s.current ? " (current step)" : ""}</span></div>
        <div class="chain-sub">${esc(s.sub)}</div>
      </li>`).join("")}</ol>`;
  }
  function studentNext() {
    const open = S.gaps.filter((g) => g.status === "open");
    if (!S.gaps.length) return { cls: "", html: "<strong>No skill gaps yet.</strong> Gaps arrive from opportunity matching (P05) or a coordinator." };
    for (const g of open) {
      const sk = skillOf(g.skillId), mod = MODULES[sk.module], sub = subFor(g.skillId);
      if (mod.status !== "full") continue;
      if (sub && sub.status === "revision") return { cls: "block", html: `<strong>Revise your ${esc(sk.name)} evidence.</strong> ${esc(sub.reviews.at(-1).by)} asked for changes. <a href="#/module/${mod.id}">Open the task</a>` };
      if (sub && sub.status === "not_yet") return { cls: "block", html: `<strong>Try the ${esc(sk.name)} task again.</strong> The last submission was not yet sufficient. <a href="#/module/${mod.id}">Open the task</a>` };
      if (sub && sub.status === "submitted") return { cls: "", html: `<strong>${esc(sub.id)} is with the reviewer.</strong> You will see the decision here.` };
      if (!S.resources[mod.id]) return { cls: "", html: `<strong>Start with the ${esc(sk.name)} resource.</strong> About ${mod.resource.minutes} minutes. <a href="#/module/${mod.id}">Open module</a>` };
      return { cls: "", html: `<strong>Complete the practical task for ${esc(sk.name)}.</strong> Finishing the reading does not demonstrate the skill. <a href="#/module/${mod.id}#task">Go to the task</a>` };
    }
    if (open.length) return { cls: "", html: `<strong>${open.length} gap${open.length > 1 ? "s" : ""} waiting for a module in development.</strong> Your coordinator will tell you when it opens.` };
    return { cls: "done", html: "<strong>All current gaps are demonstrated.</strong> Your profile shows reviewed evidence for each." };
  }

  /* ================= Derived state: P07 ================= */
  const weekOf = (date) => S.placement && S.placement.periodStart ? Math.floor(days(S.placement.periodStart, date) / 7) + 1 : null;
  const evById = (id) => S.evidence.find((e) => e.id === id);
  const inPeriod = (e) => e && e.date >= PERIOD.start && e.date <= PERIOD.end;
  const isOverdue = (a) => a.status === "open" && a.due < S.today;
  const pendingLogsForSupervisor = () => S.logs.filter((l) => (l.status === "submitted" || l.status === "revised") && l.period !== "P2").length;
  const pendingReviews = () => S.submissions.filter((x) => x.status === "submitted").length;

  /* ================= Shell ================= */
  const NAV = [
    { group: "AI features (Sprint 2)", items: [
      { r: "assistant", label: "Ask the assistant", count: () => (S.role === "coordinator" ? openHandoffs() : 0) },
      { r: "matches", label: "Internship matches", count: () => (S.role === "coordinator" ? S.matchReviews.filter((q) => q.status === "open").length : 0) },
      { r: "ai-checks", label: "AI checks" }
    ]},
    { group: "Preparation (P06)", items: [
      { r: "plan", label: "Preparation plan" },
      { r: "catalogue", label: "Modules" },
      { r: "review", label: "Review queue", count: pendingReviews },
      { r: "gaps", label: "Skill gaps" }
    ]},
    { group: "Co-op progress (P07)", items: [
      { r: "placement", label: "Placement" },
      { r: "agreement", label: "Learning agreement" },
      { r: "logbook", label: "Logbook", count: () => (S.role === "supervisor" ? pendingLogsForSupervisor() : 0) },
      { r: "progress", label: "Progress and actions", count: () => S.actions.filter(isOverdue).length },
      { r: "final", label: "Final review" }
    ]},
    { group: "Records", items: [ { r: "records", label: "Handoffs and data" } ] }
  ];
  const HOME = { student: "plan", reviewer: "review", coordinator: "gaps", supervisor: "logbook", advisor: "progress" };

  function route() { const h = location.hash.replace(/^#\/?/, ""); const [r, arg] = h.split("/"); return { r: r || HOME[S.role], arg: arg ? arg.split("#")[0] : null }; }

  function shell(content) {
    const { r } = route();
    const navHTML = NAV.map((g) => `
      <div class="nav-group"><h4>${esc(g.group)}</h4><ul>
      ${g.items.map((i) => { const c = i.count ? i.count() : 0; const active = r === i.r || (r === "module" && i.r === "catalogue") || (r === "submission" && i.r === "review");
        return `<li><a href="#/${i.r}" ${active ? 'aria-current="page"' : ""}><span>${esc(i.label)}</span>${c ? `<span class="nav-count" aria-label="${c} need attention">${c}</span>` : ""}</a></li>`; }).join("")}
      </ul></div>`).join("");
    return `
    <div class="app">
      <aside class="side" aria-label="Navigation">
        <div class="brand">
          <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="#fff" stroke-width="2"/><path d="M16 7.5 24.5 16 16 24.5 7.5 16z" fill="#8EC5FF"/><circle cx="16" cy="16" r="2.6" fill="#123B73"/></svg>
          <div><div class="brand-name">Team P6/P7</div><div class="brand-sub">Co-op preparation and progress</div></div>
        </div>
        <div class="whoami">
          <label for="role">Viewing as</label>
          <select id="role" data-change="role">
            ${Object.entries(PEOPLE).map(([k, p]) => `<option value="${k}" ${k === S.role ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
          </select>
          <div class="role-line">${esc(me().role)}</div>
        </div>
        <nav>${navHTML}</nav>
        <div class="side-foot">
          <div>Demo date <span class="today">${d(S.today)}</span></div>
          <button type="button" data-action="open-settings">Demo scenarios and date</button>
          <div>Synthetic classroom data. Not connected to MBZUAI systems.</div>
        </div>
      </aside>
      <main class="main" id="main" tabindex="-1">${content}</main>
    </div>
    <div class="toast" role="status" aria-live="polite" id="toast"></div>
    ${settingsDialog()}
    ${reasonDialog()}`;
  }

  function head(title, lede, right, crumb) {
    return `<header class="page-head"><div>${crumb ? `<div class="crumb">${crumb}</div>` : ""}<h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}</div>${right ? `<div>${right}</div>` : ""}</header>`;
  }
  const nextStrip = (n) => `<div class="next ${n.cls}" role="status"><span class="next-dot" aria-hidden="true"></span><div class="next-text">${n.html}</div></div>`;

  function rail(title, items, extra) {
    return `<aside class="rail"><section class="panel" aria-label="${esc(title)}"><div class="panel-head"><h2 style="font-size:16px">${esc(title)}</h2></div><div class="panel-body">
      ${items.length ? `<ol class="timeline">${items.map((i) => `<li class="${i.cls || ""}"><div class="when">${d(i.at)}</div><div><span class="who">${esc(i.who)}</span> ${esc(i.text)}</div></li>`).join("")}</ol>` : extra ? "" : `<p class="muted small">Nothing recorded yet.</p>`}
      ${extra || ""}</div></section></aside>`;
  }

  /* ================= P06 pages ================= */
  function pagePlan() {
    const n = studentNext();
    const gaps = [...S.gaps].sort((a, b) => (a.status === "open" ? -1 : 1) - (b.status === "open" ? -1 : 1));
    const rows = gaps.map((g) => {
      const sk = skillOf(g.skillId), mod = MODULES[sk.module], st = skillStatus(g.skillId);
      const act = S.resources[mod.id] ? chip("info", "Activity complete") : chip("none", "Activity not started");
      return `<section class="skill" aria-label="${esc(sk.name)}">
        <div class="skill-top">
          <div><h3>${esc(sk.name)}</h3><div class="skill-meta"><span class="id">${esc(g.id)}</span> for <span class="id">${esc(g.opportunityId || "—")}</span>. ${esc(g.reason)}</div></div>
          <div class="btn-row" style="justify-content:flex-end">${act}${chip(st.cls, st.label)}</div>
        </div>
        ${chainHTML(chainFor(g), sk.name + " progress")}
        <div class="btn-row" style="margin-top:14px">
          <a class="btn ${st.key === "demonstrated" ? "secondary" : ""} sm" href="#/module/${mod.id}">${mod.status === "full" ? (st.key === "demonstrated" ? "View module and evidence" : "Open module") : "View module outline"}</a>
          ${mod.status !== "full" ? '<span class="tag def">Content in development</span>' : ""}
        </div>
      </section>`;
    }).join("");
    const p06Events = S.events.filter((e) => /EV-|gap|P05|P01|readiness|resource|P07 readiness/i.test(e.text) && !/placement|agreement|LOG-|ACT-|judgement|employer|Period/i.test(e.text)).slice(-8).reverse();
    return head(`${S.role === "student" ? "Your" : "Layla’s"} preparation plan`,
      "Each skill gap links to a short module, a practical task and a reviewed decision. A skill counts as demonstrated only after review.") +
      nextStrip(n) +
      `<div class="layout"><div class="stack">
        <section class="panel divided">${rows || `<div class="empty"><h3>No skill gaps yet</h3><p class="muted">Gaps arrive from opportunity matching (P05) or are entered by the co-op coordinator.</p>${can("coordinator") ? '<a class="btn sm" href="#/gaps">Add skill gaps</a>' : locked("coordinator", "add skill gaps")}</div>`}</section>
        ${notice("rule", "<strong>Completing an activity is not the same as demonstrating a skill.</strong> Finishing the reading marks the activity complete. Only a reviewer’s recorded decision, based on your evidence, marks the skill as demonstrated.")}
      </div>${rail("Readiness record", p06Events.map((e) => ({ at: e.at, who: e.actor, text: e.text.replace(/^./, (c) => c.toLowerCase()), cls: /demonstrated/.test(e.text) ? "ok" : /revision/i.test(e.text) ? "warn" : "" })))}</div>`;
  }

  function pageCatalogue() {
    return head("Modules", "A small catalogue linked to the shared skill vocabulary used by P01 and P05. One module is fully built; two are outlined for later sprints.") +
      `<div class="layout single"><section class="panel divided">${Object.values(MODULES).map((m) => {
        const sk = skillOf(m.skill);
        return `<div class="skill"><div class="skill-top"><div><h3><a href="#/module/${m.id}">${esc(m.title)}</a></h3><div class="skill-meta"><span class="id">${m.id}</span> builds <strong>${esc(sk.name)}</strong> <span class="id">${sk.id}</span>. About ${m.minutes} minutes.</div></div>
          ${m.status === "full" ? chip("ok", "Available") : '<span class="tag def">Outline only</span>'}</div>
          <p style="max-width:70ch;margin:0">${esc(m.outcome)}</p></div>`;
      }).join("")}</section></div>`;
  }

  function boardHTML(board, editable) {
    const cols = [["todo", "To do"], ["inprogress", "In progress"], ["done", "Done"]];
    const label = { todo: "To do", inprogress: "In progress", done: "Done" };
    return `<div class="board ${editable ? "" : "readonly"}">${cols.map(([k, name]) => {
      const items = board.items.filter((i) => i.status === k);
      return `<div class="col" aria-label="${name}"><div class="col-head"><span>${name}</span><span class="muted">${items.length}</span></div>
        ${items.map((i) => `<div class="card"><div class="key">${esc(i.key)}${i.createdBy === "student" ? " · created by Layla" : ""}</div><div class="summary">${esc(i.summary)}</div>
          <div class="row">${editable ? `<label class="sr-only" for="as-${i.key}">Owner of ${i.key}</label><select id="as-${i.key}" data-change="assign" data-key="${i.key}"><option value="">Unassigned</option>${BOARD_PEOPLE.map((p) => `<option ${p === i.assignee ? "selected" : ""}>${esc(p)}</option>`).join("")}</select>`
            : i.assignee ? `<span class="small">${esc(i.assignee)}</span>` : ""}
            ${!i.assignee ? '<span class="unassigned">No owner</span>' : ""}
            ${editable && k !== "done" ? `<button class="btn secondary sm" type="button" data-action="move" data-key="${i.key}" data-to="${k === "todo" ? "inprogress" : "done"}">${k === "todo" ? "Start" : "Mark done"}</button>` : ""}
          </div></div>`).join("")}
      </div>`; }).join("")}</div>
      ${board.log.length ? `<ul class="board-log" aria-label="Status changes">${board.log.map((l) => `<li><span class="id">${esc(l.key)}</span> ${label[l.from]} to ${label[l.to]}: ${esc(l.reason)}</li>`).join("")}</ul>` : `<p class="small muted" style="margin-top:10px">No status changes yet. Each move asks for a one-line reason.</p>`}`;
  }

  function pageModule(id) {
    const m = MODULES[id]; if (!m) return pageNotFound();
    const sk = skillOf(m.skill), gap = S.gaps.find((g) => g.skillId === m.skill), sub = subFor(m.skill), st = skillStatus(m.skill);
    const crumb = `<a href="#/catalogue">Modules</a> / <span class="id">${m.id}</span>`;
    if (m.status !== "full") {
      return head(esc(m.title), null, '<span class="tag def">Outline only</span>', crumb) +
        `<div class="layout single"><div class="stack"><section class="panel"><div class="panel-body">
          <div class="label muted small" style="margin-bottom:4px">Learning outcome</div><p class="outcome">${esc(m.outcome)}</p>
          <h3 style="margin-top:14px">Planned practical task</h3><p>${esc(m.task)}</p>
          <h3 style="margin-top:10px">Assessment checklist</h3><ol class="checklist">${m.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>
          ${notice("wait", "This module is outlined for a later sprint. Resource content and review are deferred; a coordinator can still record the gap.")}
        </div></section></div></div>`;
    }
    const learned = S.resources[m.id];
    const locked6 = sub && (sub.status === "submitted" || sub.status === "demonstrated");
    const editable = can("student") && !locked6;
    const err = ui.errors.submit;
    const lastRev = sub && sub.reviews.length ? sub.reviews.at(-1) : null;
    const versionsRail = sub ? historyItems(sub) : [];
    return head(esc(m.title), null, chip(st.cls, st.label), crumb) +
      `<div class="layout"><div class="stack">
        <section class="panel"><div class="panel-body">
          <div class="muted small" style="margin-bottom:4px">Learning outcome for <strong>${esc(sk.name)}</strong></div>
          <p class="outcome">${esc(m.outcome)}</p>
          ${gap ? `<p class="small muted" style="margin:0">Linked to <span class="id">${gap.id}</span> for opportunity <span class="id">${esc(gap.opportunityId)}</span>.</p>` : ""}
        </div></section>

        <section class="panel" aria-labelledby="s-learn"><div class="panel-head"><h2 id="s-learn">1. Learn</h2>${learned ? chip("info", "Activity complete") : chip("none", `${m.resource.minutes} min`)}</div>
          <div class="panel-body"><div class="reading"><p class="muted" style="font-family:var(--sans);font-size:14px">${esc(m.resource.title)}</p>
            ${m.resource.parts.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join("")}</div>
            <div class="btn-row" style="margin-top:14px">
              ${learned ? `<span class="small muted">Marked complete on ${d(learned)}.${st.key === "demonstrated" ? "" : ` Your skill status is still <strong>${esc(st.label.toLowerCase())}</strong>.`}</span>`
                : can("student") ? `<button class="btn" type="button" data-action="resource-done" data-module="${m.id}">Mark resource complete</button><span class="small muted">This completes the activity only.</span>` : locked("student", "mark the resource complete")}
            </div></div></section>

        <section class="panel" id="task" aria-labelledby="s-task"><div class="panel-head"><h2 id="s-task">2. Practise on the board</h2><span class="tag sim">Simulated Jira board</span></div>
          <div class="panel-body"><p style="max-width:70ch">${esc(m.task)}</p>
          ${editable ? `<form class="btn-row" data-form="add-item" style="margin:4px 0 14px"><label class="sr-only" for="newsum">New work item summary</label><input class="input" id="newsum" name="summary" placeholder="New work item, e.g. Check missing gate times in the March extract" style="flex:1;min-width:240px"><button class="btn secondary" type="submit">Create work item</button></form>${ui.errors.item ? `<p class="small" style="color:var(--red);margin-top:-8px">${esc(ui.errors.item)}</p>` : ""}` : ""}
          ${boardHTML(S.board, editable)}
          ${!can("student") ? locked("student", "change the board") : locked6 ? `<p class="small muted" style="margin-top:10px">The board is locked while ${esc(sub.id)} is ${sub.status === "submitted" ? "with the reviewer" : "recorded as demonstrated"}.</p>` : ""}
          </div></section>

        <section class="panel" aria-labelledby="s-sub"><div class="panel-head"><h2 id="s-sub">3. Submit evidence</h2>${sub ? `<span class="id">${sub.id} · ${sub.versions.length} version${sub.versions.length > 1 ? "s" : ""}</span>` : ""}</div>
          <div class="panel-body">
            ${lastRev && (sub.status === "revision" || sub.status === "not_yet") ? `<div class="feedback" style="margin:0 0 14px"><div class="fhead">${esc(lastRev.by)}, ${d(lastRev.at)}: ${sub.status === "revision" ? "revision requested" : "not yet demonstrated"}</div>${esc(lastRev.comment)}</div>` : ""}
            <h3 style="margin-bottom:6px">The reviewer will check</h3><ol class="checklist">${m.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>
            ${editable ? `<form data-form="submit-evidence" data-module="${m.id}" style="margin-top:12px">
              <div class="field ${err ? "error" : ""}"><label for="expl">Explain what you did and why each item moved</label>
              <textarea class="input" id="expl" name="explanation" aria-describedby="expl-hint${err ? " expl-err" : ""}">${esc(ui.draft.expl || (sub ? sub.versions.at(-1).explanation : ""))}</textarea>
              <span class="hint" id="expl-hint">At least 25 words. The current board and its status changes are attached automatically.</span>
              ${err ? `<span class="err" id="expl-err">${esc(err)}</span>` : ""}</div>
              ${!learned ? notice("wait", "You can submit before finishing the reading, but the reviewer will see that the activity is incomplete.") : ""}
              <div class="btn-row" style="margin-top:12px"><button class="btn" type="submit">${sub ? "Submit revised evidence" : "Submit evidence for review"}</button></div></form>`
              : sub && sub.status === "submitted" ? notice("wait", `<strong>${esc(sub.id)} version ${sub.versions.length} is with the reviewer.</strong> You will be able to revise it if changes are requested.`)
              : sub && sub.status === "demonstrated" ? notice("ok", `<strong>Demonstrated.</strong> Reviewed by ${esc(lastRev.by)} on ${d(lastRev.at)} and sent to your profile (P01).`)
              : locked("student", "submit evidence")}
          </div></section>
      </div>${rail("Evidence history", versionsRail)}</div>`;
  }

  function historyItems(sub) {
    const items = [];
    sub.versions.forEach((v) => items.push({ at: v.at, who: "Layla Hassan", text: `submitted version ${v.v}`, cls: "wait", t: v.at + "a" + v.v }));
    sub.reviews.forEach((r, i) => items.push({ at: r.at, who: r.by, text: r.decision === "revision" ? "requested a revision" : r.decision === "not_yet" ? "recorded not yet demonstrated" : "recorded demonstrated", cls: r.decision === "demonstrated" ? "ok" : "warn", t: r.at + "b" + i }));
    return items.sort((a, b) => (a.t < b.t ? 1 : -1));
  }

  function pageReviewQueue() {
    const subs = [...S.submissions].sort((a, b) => (a.status === "submitted" ? -1 : 0) - (b.status === "submitted" ? -1 : 0));
    const label = { submitted: ["wait", "Awaiting review"], revision: ["warn", "Revision requested"], not_yet: ["warn", "Not yet demonstrated"], demonstrated: ["ok", "Demonstrated"] };
    return head("Review queue", "Practical evidence waiting for a recorded decision. Oldest first.") +
      `<div class="layout single"><section class="panel">${subs.length ? `<table class="table"><thead><tr><th>Evidence</th><th>Student</th><th>Skill</th><th>Version</th><th>Last submitted</th><th>Status</th></tr></thead><tbody>
      ${subs.map((x) => `<tr><td><a class="id" href="#/submission/${x.id}">${x.id}</a></td><td>Layla Hassan</td><td>${esc(skillOf(x.skillId).name)}</td><td>${x.versions.length}</td><td>${d(x.versions.at(-1).at)}</td><td>${chip(label[x.status][0], label[x.status][1])}</td></tr>`).join("")}
      </tbody></table>` : `<div class="empty"><h3>Nothing to review</h3><p class="muted">Submissions appear here when a student sends practical evidence.</p></div>`}</section></div>`;
  }

  function hints(board) {
    const created = board.items.filter((i) => i.createdBy === "student").length;
    const unassigned = board.items.filter((i) => !i.assignee).length;
    const full = new Set(board.log.filter((l) => l.to === "done").map((l) => l.key));
    const through = [...full].filter((k) => board.log.some((l) => l.key === k && l.from === "todo")).length;
    const explained = board.log.filter((l) => words(l.reason) >= 4).length;
    return [`${created} created by the student`, unassigned ? `${unassigned} without an owner` : "All items have an owner", `${through} moved To do → Done`, `${explained} of ${board.log.length} changes have a reason of 4+ words`];
  }

  function pageSubmission(id) {
    const sub = S.submissions.find((x) => x.id === id); if (!sub) return pageNotFound();
    const m = MODULES[sub.moduleId], sk = skillOf(sub.skillId);
    const latest = sub.versions.at(-1), active = sub.status === "submitted";
    const h = hints(latest.board);
    const lastReview = sub.reviews.at(-1);
    const prefill = active ? (ui.draft.checklist || m.checklist.map(() => false)) : (lastReview ? lastReview.checklist : m.checklist.map(() => false));
    // interleave versions and reviews
    const blocks = [];
    sub.versions.forEach((v, i) => {
      blocks.push(`<div class="version ${i < sub.versions.length - 1 ? "superseded" : ""}"><div class="vhead"><span><strong>Version ${v.v}</strong>${i < sub.versions.length - 1 ? " (superseded, kept for the record)" : ""}</span><span>${d(v.at)}</span></div><p style="margin:0">${esc(v.explanation)}</p>
        ${i === sub.versions.length - 1 ? `<details style="margin-top:10px" ${ui.open.board !== false ? "open" : ""}><summary class="small" style="cursor:pointer">Board at submission</summary><div style="margin-top:10px">${boardHTML(v.board, false)}</div></details>` : ""}</div>`);
      const r = sub.reviews[i];
      if (r) blocks.push(`<div class="feedback ${r.decision === "demonstrated" ? "note" : ""}"><div class="fhead">${esc(r.by)}, ${d(r.at)}: ${r.decision === "revision" ? "revision requested" : r.decision === "not_yet" ? "not yet demonstrated" : "demonstrated"} (${r.checklist.filter(Boolean).length}/${r.checklist.length} criteria)</div>${esc(r.comment)}</div>`);
    });
    const err = ui.errors.review;
    return head(`${esc(sk.name)} evidence`, `Layla Hassan · <span class="id">${sub.id}</span> · module <span class="id">${m.id}</span>`, chip(skillStatus(sub.skillId).cls, skillStatus(sub.skillId).label), `<a href="#/review">Review queue</a> / <span class="id">${sub.id}</span>`) +
      `<div class="layout"><div class="stack">
        <section class="panel"><div class="panel-head"><h2>Submission and history</h2>${S.resources[m.id] ? chip("info", "Activity complete") : chip("warn", "Resource not completed")}</div><div class="panel-body">${blocks.join("")}</div></section>
        <section class="panel"><div class="panel-head"><h2>Checklist decision</h2></div><div class="panel-body">
          ${active && can("reviewer") ? `<form data-form="review" data-id="${sub.id}">
          <fieldset style="border:0;padding:0;margin:0"><legend class="sr-only">Assessment checklist</legend>
            ${m.checklist.map((c, i) => `<label class="check"><input type="checkbox" name="c${i}" ${prefill[i] ? "checked" : ""}><span>${esc(c)}</span></label>`).join("")}
            <p class="small muted" style="margin:6px 0 14px">System hints, for the reviewer to confirm: ${h.map(esc).join("; ")}.</p>
            <div class="field ${err ? "error" : ""}"><label for="rcomment">Comment to the student</label><textarea class="input" id="rcomment" name="comment" style="min-height:80px">${esc(ui.draft.comment || "")}</textarea>${err ? `<span class="err">${esc(err)}</span>` : '<span class="hint">Required when requesting a revision or recording not yet demonstrated.</span>'}</div>
            <div class="btn-row"><button class="btn" type="submit" name="decision" value="demonstrated">Record as demonstrated</button><button class="btn secondary" type="submit" name="decision" value="revision">Request revision</button><button class="btn danger" type="submit" name="decision" value="not_yet">Record not yet demonstrated</button></div>
          </fieldset></form>` : `
          <ol class="checklist">${m.checklist.map((c, i) => `<li><span>${esc(c)} ${lastReview ? (lastReview.checklist[i] ? '<span class="chip plain ok" style="margin-left:6px">Met</span>' : '<span class="chip plain warn" style="margin-left:6px">Not met</span>') : ""}</span></li>`).join("")}</ol>
          <p class="small muted" style="margin:10px 0 0">${active ? "A decision is open." : sub.status === "demonstrated" ? "No decision is open. The outcome is recorded and was sent to P01." : "No decision is open. Waiting for the student to resubmit."}</p>
          ${!can("reviewer") && active ? locked("reviewer", "record a decision") : ""}`}
        </div></section>
      </div>${rail("Decision record", historyItems(sub))}</div>`;
  }

  function pageGaps() {
    const err = ui.errors.gap;
    return head("Skill gaps", "Gaps come from opportunity matching (P05) or are entered by the coordinator. Each open gap links Layla to a module.",
      can("coordinator") ? `<button class="btn" type="button" data-action="import-gaps">Import gaps from P05</button>` : "") +
      `<div class="layout"><div class="stack">
        <section class="panel">${S.gaps.length ? `<table class="table"><thead><tr><th>Gap</th><th>Skill</th><th>Opportunity</th><th>Source</th><th>Raised</th><th>Status</th></tr></thead><tbody>
          ${S.gaps.map((g) => `<tr><td class="id">${g.id}</td><td>${esc(skillOf(g.skillId).name)}<div class="small muted">${esc(g.reason)}</div></td><td class="id">${esc(g.opportunityId || "—")}</td><td>${g.source === "P05" ? '<span class="tag sim">P05 fixture</span>' : g.source === "match" ? '<span class="tag">Matching</span>' : '<span class="tag">Manual</span>'}</td><td>${d(g.createdAt)}</td><td>${g.status === "open" ? chip("wait", "Open") : chip("ok", "Closed by review")}</td></tr>`).join("")}
          </tbody></table>` : `<div class="empty"><h3>No gaps recorded</h3><p class="muted">Import the synthetic P05 output or enter a gap by hand.</p></div>`}</section>
        <section class="panel"><div class="panel-head"><h2>Enter a gap manually</h2></div><div class="panel-body">
          ${can("coordinator") ? `<form data-form="manual-gap"><div class="grid-2">
            <div class="field"><label for="g-skill">Skill</label><select class="input" id="g-skill" name="skill">${SKILLS.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></div>
            <div class="field"><label for="g-op">Opportunity (optional)</label><input class="input" id="g-op" name="op" placeholder="OP-028"></div></div>
            <div class="field ${err ? "error" : ""}"><label for="g-reason">Why this gap matters</label><input class="input" id="g-reason" name="reason" placeholder="e.g. Required for the role; no reviewed evidence">${err ? `<span class="err">${esc(err)}</span>` : ""}</div>
            <button class="btn secondary" type="submit">Add gap for Layla</button></form>` : locked("coordinator", "add skill gaps")}
        </div></section>
      </div>${rail("Gap activity", S.events.filter((e) => /gap/i.test(e.text)).slice(-6).reverse().map((e) => ({ at: e.at, who: e.actor, text: e.text.replace(/^./, (c) => c.toLowerCase()) })))}</div>`;
  }

  /* ================= P07 pages ================= */
  function needPlacement(title) {
    return head(title, null) + `<div class="layout single"><section class="panel"><div class="empty"><h3>No confirmed placement yet</h3><p class="muted">The co-op record starts when P04 sends a university-confirmed placement.</p><a class="btn sm" href="#/placement">Go to placement</a></div></section></div>`;
  }

  function pagePlacement() {
    const p = S.placement;
    const readiness = S.handoffs.filter((h) => h.to === "P07").at(-1);
    const blocked = S.placementAttempts.at(-1);
    return head("Placement", "The co-op record begins only when a placement is confirmed by the university. An accepted offer is not enough.") +
      `<div class="layout"><div class="stack">
      ${blocked && !p ? notice("warn", `<strong>${esc(blocked.placementId)} was not accepted.</strong> Its status is “offer accepted, awaiting university confirmation”. P07 records start only after a coordinator confirms the placement in P04.`) : ""}
      <section class="panel"><div class="panel-head"><h2>${p ? esc(p.employer) + ", " + esc(p.location) : "Waiting for P04"}</h2>${p ? chip("ok", "University confirmed") : chip("none", "No placement")}</div><div class="panel-body">
        ${p ? `<dl class="kv"><dt>Placement</dt><dd class="id">${p.placementId}</dd><dt>Role</dt><dd>${esc(p.role)}</dd><dt>Period</dt><dd>${d(p.periodStart)} to ${d(p.periodEnd)}</dd><dt>Supervisor</dt><dd>${esc(p.supervisor)}</dd><dt>Academic advisor</dt><dd>${esc(p.advisor)}</dd><dt>Confirmed by</dt><dd>${esc(p.confirmedBy)}, ${d(p.confirmedAt)}</dd></dl>`
          : `<p class="muted">Receive the synthetic placement record from P04 to start the co-op record.</p>
            ${can("coordinator") ? `<div class="btn-row"><button class="btn" type="button" data-action="placement-ok">Receive confirmed placement PL-028</button><button class="btn secondary" type="button" data-action="placement-bad">Try offer awaiting confirmation</button></div>` : locked("coordinator", "receive placements")}`}
      </div></section>
      <section class="panel"><div class="panel-head"><h2>Preparation evidence from P06</h2><span class="tag">Optional input</span></div><div class="panel-body">
        ${readiness ? `<p>Received ${d(readiness.at)}. Demonstrated before placement:</p><div class="ev-list">${readiness.payload.demonstrated.map((x) => `<span class="ev">${x.evidenceId} ${esc(skillOf(x.skillId).name)}</span>`).join("")}</div>${readiness.payload.inProgress.length ? `<p class="small muted" style="margin-top:10px">Still in progress: ${readiness.payload.inProgress.map((k) => esc(skillOf(k).name)).join(", ")}.</p>` : ""}`
          : `<p class="muted" style="margin:0">No readiness summary yet. It is sent from P06 when a reviewer records a demonstrated skill.</p>`}
      </div></section></div>
      ${rail("Placement record", S.events.filter((e) => /placement|PL-0/i.test(e.text)).reverse().map((e) => ({ at: e.at, who: e.actor, text: e.text.replace(/^./, (c) => c.toLowerCase()), cls: /confirmed placement/i.test(e.text) ? "ok" : /blocked|not accepted/i.test(e.text) ? "warn" : "" })))}</div>`;
  }

  function pageAgreement() {
    if (!S.placement) return needPlacement("Learning agreement");
    const a = S.agreement, agreed = a.status === "agreed", err = ui.errors.goal;
    const sign = (k) => a.signoffs[k] ? chip("ok", `Agreed ${d(a.signoffs[k])}`) : (can(k) && a.goals.length === 3 && !agreed ? `<button class="btn sm" type="button" data-action="sign" data-who="${k}">Agree as ${esc(PEOPLE[k].short)}</button>` : chip("none", "Not yet agreed"));
    return head("Learning agreement", `Three goals for ${esc(PERIOD.label)}, each mapped to the programme’s learning outcomes. Locked once all three parties agree.`, agreed ? chip("ok", "Agreed") : chip("wait", `Draft, ${a.goals.length} of 3 goals`)) +
      `<div class="layout"><div class="stack">
      <section class="panel divided">${a.goals.length ? a.goals.map((g, i) => `<div class="skill"><div class="skill-top"><div><div class="id" style="margin-bottom:2px">${g.id}</div><h3 style="font-family:var(--serif);font-size:18px;font-weight:600">${esc(g.text)}</h3></div>${!agreed && can("student") ? `<button class="btn ghost sm" type="button" data-action="remove-goal" data-id="${g.id}">Remove</button>` : ""}</div>
        <div class="ev-list">${g.outcomes.map((o) => `<span class="chip plain info">${o} ${esc(OUTCOMES.find((x) => x.id === o).name)}</span>`).join("")}</div></div>`).join("")
        : `<div class="empty"><h3>No goals yet</h3><p class="muted">Layla drafts three goals; her supervisor and advisor then agree them.</p></div>`}</section>
      ${!agreed && a.goals.length < 3 ? `<section class="panel"><div class="panel-head"><h2>Add goal ${a.goals.length + 1} of 3</h2></div><div class="panel-body">
        ${can("student") ? `<form data-form="goal"><div class="field ${err ? "error" : ""}"><label for="goal-text">Goal</label><input class="input" id="goal-text" name="text" placeholder="e.g. Build a weekly on-time-performance dashboard the team uses">
          <fieldset style="border:0;padding:0;margin:10px 0 0"><legend class="label" style="font-size:13.5px;font-weight:500">Maps to learning outcomes</legend>${OUTCOMES.map((o) => `<label class="check" style="padding:4px 0"><input type="checkbox" name="lo" value="${o.id}"><span><span class="id">${o.id}</span> ${esc(o.name)}</span></label>`).join("")}</fieldset>
          ${err ? `<span class="err">${esc(err)}</span>` : ""}</div><button class="btn secondary" type="submit">Add goal</button></form>` : locked("student", "draft goals")}
      </div></section>` : ""}
      <section class="panel"><div class="panel-head"><h2>Agreement</h2></div><div class="panel-body">
        <table class="table"><tbody>${["student", "supervisor", "advisor"].map((k) => `<tr><td><strong>${esc(PEOPLE[k].name)}</strong><div class="small muted">${esc(PEOPLE[k].role)}</div></td><td style="text-align:right">${sign(k)}</td></tr>`).join("")}</tbody></table>
        ${!agreed && a.goals.length < 3 ? '<p class="small muted" style="margin-top:8px">Sign-off opens when three goals are drafted.</p>' : ""}
      </div></section></div>
      ${rail("Outcomes in this programme", [], `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">${OUTCOMES.map((o) => `<li class="small"><span class="id">${o.id}</span> ${esc(o.name)}</li>`).join("")}</ul><p class="small muted" style="margin:12px 0 0">Outcome set is configurable by the programme.</p>`)}</div>`;
  }

  function logStatus(l) {
    return { submitted: ["wait", "Awaiting supervisor"], feedback: ["warn", "More detail requested"], revised: ["wait", "Revised, awaiting supervisor"], acknowledged: ["ok", "Acknowledged"] }[l.status];
  }

  function pageLogbook() {
    if (!S.placement) return needPlacement("Logbook");
    if (S.agreement.status !== "agreed") return head("Logbook", null) + `<div class="layout single"><section class="panel"><div class="empty"><h3>Agree the learning agreement first</h3><p class="muted">Log entries link to agreed goals.</p><a class="btn sm" href="#/agreement">Open learning agreement</a></div></section></div>`;
    const logs = [...S.logs].sort((a, b) => (a.date < b.date ? 1 : -1));
    const goal = (id) => S.agreement.goals.find((g) => g.id === id);
    const err = ui.errors.log;
    const entry = (l) => {
      const cur = l.versions.at(-1), [c, t] = logStatus(l), open = ui.open[l.id];
      const p2 = l.period === "P2";
      const timeline = [];
      l.versions.forEach((v) => timeline.push({ t: v.at + "a", html: `<div class="version ${v.v < l.versions.length ? "superseded" : ""}"><div class="vhead"><span><strong>${v.v === 1 ? "Original entry" : "Revision " + (v.v - 1)}</strong></span><span>${d(v.at)}</span></div><p style="margin:0">${esc(v.text)}</p></div>` }));
      l.feedback.forEach((f) => timeline.push({ t: f.at + "b", html: `<div class="feedback ${f.type === "note" ? "note" : ""}"><div class="fhead">${esc(f.by)}, ${d(f.at)}: ${f.type === "request" ? "feedback request" : "comment"}</div>${esc(f.text)}</div>` }));
      timeline.sort((a, b) => (a.t < b.t ? -1 : 1));
      return `<article class="skill" aria-label="${l.id}">
        <div class="skill-top"><div><div class="small muted"><span class="id">${l.id}</span> · Week ${l.week}${p2 ? " of Period 2" : ""} · ${d(l.date)} · <span class="id">${l.goal}</span> ${esc(goal(l.goal) ? goal(l.goal).text : "")}</div></div><div>${p2 ? '<span class="tag">Next period</span>' : chip(c, t)}</div></div>
        <p style="margin:0 0 8px;max-width:72ch">${esc(cur.text)}</p>
        <div class="ev-list">${cur.evidence.length ? cur.evidence.map((e) => `<span class="ev" title="${esc(evById(e) ? evById(e).title : "")}">${e}</span>`).join("") : '<span class="ev missing">No evidence attached</span>'}</div>
        ${open ? `<div style="margin-top:12px">${timeline.map((x) => x.html).join("")}</div>` : ""}
        <div class="btn-row" style="margin-top:12px">
          <button class="btn ghost sm" type="button" data-action="toggle" data-id="${l.id}" aria-expanded="${!!open}">${open ? "Hide history" : `Show history (${l.versions.length} version${l.versions.length > 1 ? "s" : ""}, ${l.feedback.length} comment${l.feedback.length === 1 ? "" : "s"})`}</button>
          ${!p2 && can("supervisor") && (l.status === "submitted" || l.status === "revised") && !ui.open["req-" + l.id] ? `<button class="btn sm" type="button" data-action="log-ack" data-id="${l.id}">Acknowledge</button><button class="btn secondary sm" type="button" data-action="log-request" data-id="${l.id}">Request more detail</button>` : ""}
          ${can("student") && l.status === "feedback" ? `<button class="btn sm" type="button" data-action="log-revise" data-id="${l.id}">Revise entry</button>` : ""}
        </div>
        ${ui.open["req-" + l.id] ? `<form data-form="log-request" data-id="${l.id}" style="margin-top:12px"><div class="field ${ui.errors["req-" + l.id] ? "error" : ""}"><label for="req-${l.id}">What should Layla add or change?</label><textarea class="input" id="req-${l.id}" name="text" style="min-height:70px"></textarea>${ui.errors["req-" + l.id] ? `<span class="err">${esc(ui.errors["req-" + l.id])}</span>` : ""}</div><div class="btn-row"><button class="btn" type="submit">Send feedback request</button><button class="btn ghost" type="button" data-action="log-request-cancel" data-id="${l.id}">Cancel</button></div></form>` : ""}
        ${ui.open["rev-" + l.id] ? `<form data-form="log-revise" data-id="${l.id}" style="margin-top:12px"><div class="field ${ui.errors["rev-" + l.id] ? "error" : ""}"><label for="rev-${l.id}">Revised entry</label><textarea class="input" id="rev-${l.id}" name="text">${esc(cur.text)}</textarea>${ui.errors["rev-" + l.id] ? `<span class="err">${esc(ui.errors["rev-" + l.id])}</span>` : '<span class="hint">The original stays in the history.</span>'}</div><button class="btn" type="submit">Save revision</button></form>` : ""}
      </article>`;
    };
    return head("Logbook", "Weekly entries linked to agreed goals and evidence. Feedback, revisions and originals are all kept.") +
      `<div class="layout"><div class="stack">
        ${can("student") ? `<section class="panel"><div class="panel-head"><h2>New entry</h2><span class="small muted">Week ${weekOf(S.today) || "—"}, ${d(S.today)}</span></div><div class="panel-body"><form data-form="log">
          <div class="field"><label for="l-goal">Goal</label><select class="input" id="l-goal" name="goal">${S.agreement.goals.map((g) => `<option value="${g.id}">${g.id} ${esc(g.text)}</option>`).join("")}</select></div>
          <div class="field ${err ? "error" : ""}"><label for="l-text">What did you do and learn?</label><textarea class="input" id="l-text" name="text"></textarea>${err ? `<span class="err">${esc(err)}</span>` : ""}</div>
          <div class="grid-2"><div class="field"><label for="l-ev">Link existing evidence</label><select class="input" id="l-ev" name="ev"><option value="">None</option>${S.evidence.filter((e) => e.date <= S.today).map((e) => `<option value="${e.id}">${e.id} ${esc(e.title)}</option>`).join("")}</select></div>
          <div class="field"><label for="l-new">Or add new evidence</label><input class="input" id="l-new" name="newev" placeholder="e.g. Meeting notes, 18 Mar"></div></div>
          <button class="btn" type="submit">Submit entry</button></form></div></section>` : ""}
        <section class="panel divided">${logs.map(entry).join("")}</section>
      </div>${rail("Evidence library", [], `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">${S.evidence.map((e) => `<li class="small"><span class="id">${e.id}</span> ${esc(e.title)}<div class="muted">${d(e.date)}${e.date > PERIOD.end ? " · after Period 1" : ""}</div></li>`).join("")}</ul>`)}</div>`;
  }

  const LEVEL = { none: ["none", "Not yet evidenced"], developing: ["wait", "Developing"], achieved: ["ok", "Achieved this period"] };

  function pageProgress() {
    if (!S.placement) return needPlacement("Progress and actions");
    const wk = weekOf(S.today);
    const goalsFor = (lo) => S.agreement.goals.filter((g) => g.outcomes.includes(lo)).map((g) => g.id);
    const overdue = S.actions.filter(isOverdue);
    const missing = OUTCOMES.filter((o) => !(S.judgements[o.id] && S.judgements[o.id].evidence.length));
    const nx = overdue.length ? { cls: "block", html: `<strong>${overdue.length} support action${overdue.length > 1 ? "s are" : " is"} overdue.</strong> ${overdue.map((a) => esc(a.id)).join(", ")} needs closure evidence from its owner.` }
      : missing.length ? { cls: "", html: `<strong>${missing.length} outcome${missing.length > 1 ? "s have" : " has"} no linked evidence.</strong> ${missing.map((o) => o.id).join(", ")} cannot be judged yet.` }
      : { cls: "done", html: "<strong>Every outcome has linked evidence.</strong>" };
    const editLO = ui.open.editLO, jerr = ui.errors.judge, aerr = ui.errors.action;
    return head("Progress and actions", `${esc(PERIOD.label)}, week ${wk > 0 ? wk : "—"} of ${weekOf(PERIOD.end)}. Each outcome judgement links to evidence; missing evidence is shown, not hidden.`) + nextStrip(nx) +
      `<div class="layout single"><div class="stack">
      <section class="panel"><div class="panel-head"><h2>Outcomes and evidence</h2><span class="small muted">Judged by ${esc(PEOPLE.advisor.name)}</span></div><div class="divided" style="margin-top:10px">
        ${OUTCOMES.map((o) => { const j = S.judgements[o.id] || { level: "none", evidence: [] }; const [c, t] = LEVEL[j.level];
          return `<div class="outcome-row"><div class="lo">${o.id}</div><div><div style="font-weight:500">${esc(o.name)}</div><div class="small muted">Goals ${goalsFor(o.id).join(", ") || "none"}</div>
            <div class="ev-list">${j.evidence.length ? j.evidence.map((e) => `<span class="ev" title="${esc(evById(e) ? evById(e).title : "")}">${e}</span>`).join("") : '<span class="ev missing">Evidence missing</span>'}</div>
            ${editLO === o.id ? `<form data-form="judge" data-lo="${o.id}" style="margin-top:12px"><div class="field"><label for="lvl">Judgement</label><select class="input" id="lvl" name="level" style="max-width:260px">${Object.entries(LEVEL).map(([k, v]) => `<option value="${k}" ${k === j.level ? "selected" : ""}>${v[1]}</option>`).join("")}</select></div>
              <fieldset style="border:0;padding:0;margin:0 0 10px"><legend class="label" style="font-size:13.5px;font-weight:500">Evidence that supports it</legend>${S.evidence.filter((e) => e.date <= S.today && inPeriod(e) || e.source === "P06").map((e) => `<label class="check" style="padding:3px 0"><input type="checkbox" name="ev" value="${e.id}" ${j.evidence.includes(e.id) ? "checked" : ""}><span><span class="id">${e.id}</span> ${esc(e.title)}</span></label>`).join("")}</fieldset>
              ${jerr ? `<p class="err small" style="color:var(--red);font-weight:500">${esc(jerr)}</p>` : ""}<div class="btn-row"><button class="btn sm" type="submit">Save judgement</button><button class="btn ghost sm" type="button" data-action="judge-cancel">Cancel</button></div></form>` : ""}
          </div><div style="text-align:right">${chip(c, t)}${j.by ? `<div class="small muted" style="margin-top:4px">${d(j.at)}</div>` : ""}${can("advisor") && editLO !== o.id ? `<div style="margin-top:6px"><button class="btn ghost sm" type="button" data-action="judge" data-lo="${o.id}">Update</button></div>` : ""}</div></div>`; }).join("")}
      </div>${!can("advisor") ? `<div class="panel-body" style="padding-top:0">${locked("advisor", "record outcome judgements")}</div>` : ""}</section>

      <div class="two-col">
        <section class="panel"><div class="panel-head"><h2>Host milestones</h2></div><div class="panel-body">
          ${S.milestones.map((m) => `<label class="check"><input type="checkbox" data-change="milestone" data-id="${m.id}" ${m.done ? "checked" : ""} ${can("supervisor") ? "" : "disabled"}><span>${esc(m.text)}${m.done ? `<span class="small muted"> · ${d(m.at)}</span>` : ""}</span></label>`).join("")}
          <div style="margin-top:10px">${notice("rule", "Milestones track the host’s plan. Completing one does not demonstrate an academic outcome on its own.")}</div>
          ${!can("supervisor") ? locked("supervisor", "update milestones") : ""}
        </div></section>
        <section class="panel"><div class="panel-head"><h2>Add a support action</h2></div><div class="panel-body">
          ${can("advisor") ? `<form data-form="action"><div class="field"><label for="a-text">Action</label><input class="input" id="a-text" name="text" placeholder="e.g. Share meeting notes as evidence for LO3"></div>
            <div class="grid-2"><div class="field"><label for="a-owner">Owner</label><select class="input" id="a-owner" name="owner">${["student", "supervisor", "advisor", "coordinator"].map((k) => `<option value="${k}">${esc(PEOPLE[k].name)}</option>`).join("")}</select></div>
            <div class="field"><label for="a-due">Due date</label><input class="input" type="date" id="a-due" name="due"></div></div>
            ${aerr ? `<p class="small" style="color:var(--red);font-weight:500">${esc(aerr)}</p>` : ""}<button class="btn secondary" type="submit">Add action</button></form>` : `<p class="muted small">Support actions are agreed at the midpoint review.</p>${locked("advisor", "add support actions")}`}
        </div></section>
      </div>

      <section class="panel"><div class="panel-head"><h2>Support actions</h2></div><div class="panel-body" style="padding-left:10px;padding-right:10px">
        <table class="table"><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th>Closure evidence</th></tr></thead><tbody>
        ${S.actions.map((a) => { const od = isOverdue(a); const mine = S.role === a.owner && a.status === "open";
          return `<tr class="${od ? "is-overdue" : ""}"><td><span class="id">${a.id}</span><div>${esc(a.text)}</div></td><td>${esc(PEOPLE[a.owner].name)}</td><td>${d(a.due)}${od ? `<div class="small" style="color:var(--red)">${days(a.due, S.today)} days late</div>` : ""}</td>
          <td>${a.status === "closed" ? chip("ok", "Closed") : od ? chip("warn", "Overdue") : chip("wait", "Open")}</td>
          <td>${a.status === "closed" ? `${esc(a.closure)}<div class="small muted">${d(a.closedAt)}</div>` : mine ? (ui.open["close-" + a.id] ? `<form data-form="close-action" data-id="${a.id}"><label class="sr-only" for="cl-${a.id}">Closure evidence</label><input class="input" id="cl-${a.id}" name="closure" placeholder="What shows it is done?" style="margin-bottom:6px">${ui.errors["close-" + a.id] ? `<div class="small" style="color:var(--red)">${esc(ui.errors["close-" + a.id])}</div>` : ""}<button class="btn sm" type="submit">Close action</button></form>` : `<button class="btn secondary sm" type="button" data-action="close-open" data-id="${a.id}">Close with evidence</button>`) : '<span class="muted small">Owner closes with evidence</span>'}</td></tr>`; }).join("")}
        </tbody></table></div></section>
      </div></div>`;
  }

  function pageFinal() {
    if (!S.placement) return needPlacement("Final review");
    const open = S.today >= PERIOD.end;
    const f = S.final, inEv = S.evidence.filter((e) => inPeriod(e) || e.source === "P06"), later = S.evidence.filter((e) => e.date > PERIOD.end);
    const ferr = ui.errors.final, eerr = ui.errors.employer;
    const LV = { achieved: ["ok", "Achieved"], partly: ["wait", "Partly achieved"], not: ["warn", "Not achieved"], noev: ["none", "Not evidenced"] };
    const empHTML = f.employer ? `<p class="quote">“${esc(f.employer.text)}”</p><p class="small muted" style="margin:10px 0 0">Would host again: ${esc(f.employer.wouldHost === "yes" ? "Yes" : f.employer.wouldHost === "maybe" ? "Possibly" : "No")} · Submitted ${d(f.employer.at)}</p>`
      : can("supervisor") && open ? `<form data-form="employer"><div class="field ${eerr ? "error" : ""}"><label for="emp-text">Feedback on Layla’s work this period</label><textarea class="input" id="emp-text" name="text"></textarea>${eerr ? `<span class="err">${esc(eerr)}</span>` : ""}</div><div class="field"><label for="emp-host">Would you host Layla again?</label><select class="input" id="emp-host" name="host" style="max-width:200px"><option value="yes">Yes</option><option value="maybe">Possibly</option><option value="no">No</option></select></div><button class="btn" type="submit">Submit employer feedback</button></form>`
      : `<p class="muted">Not submitted yet.</p>${!can("supervisor") ? locked("supervisor", "submit employer feedback") : ""}`;
    const advHTML = f.advisor ? `${OUTCOMES.map((o) => { const r = f.advisor.outcomes[o.id]; return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid var(--line-2)"><span class="small"><span class="id">${o.id}</span> ${esc(o.name)}</span>${chip(LV[r][0], LV[r][1])}</div>`; }).join("")}
        <p class="quote" style="margin-top:12px">${esc(f.advisor.summary)}</p><p class="small" style="margin:8px 0 0"><strong>Goal for Period 2:</strong> ${esc(f.advisor.nextGoal)}</p><p class="small muted" style="margin:8px 0 0">Recorded ${d(f.advisor.at)} for ${esc(PERIOD.label)} (${d(PERIOD.start)} to ${d(PERIOD.end)})</p>`
      : can("advisor") && open ? `<form data-form="final">${OUTCOMES.map((o) => { const j = S.judgements[o.id] || { level: "none", evidence: [] }; const evs = j.evidence.filter((e) => inPeriod(evById(e)) || (evById(e) && evById(e).source === "P06")); const def = evs.length ? (j.level === "achieved" ? "achieved" : "partly") : "noev";
          return `<div class="field" style="border-top:1px solid var(--line-2);padding-top:10px"><label for="fo-${o.id}"><span class="id">${o.id}</span> ${esc(o.name)}</label><div class="ev-list" style="margin:0 0 6px">${evs.length ? evs.map((e) => `<span class="ev">${e}</span>`).join("") : '<span class="ev missing">Evidence missing</span>'}</div><select class="input" id="fo-${o.id}" name="${o.id}" style="max-width:220px">${Object.entries(LV).map(([k, v]) => `<option value="${k}" ${k === def ? "selected" : ""}>${v[1]}</option>`).join("")}</select></div>`; }).join("")}
          <div class="field ${ferr && ferr.summary ? "error" : ""}"><label for="f-sum">Academic judgement</label><textarea class="input" id="f-sum" name="summary"></textarea>${ferr && ferr.summary ? `<span class="err">${esc(ferr.summary)}</span>` : ""}</div>
          <div class="field ${ferr && ferr.next ? "error" : ""}"><label for="f-next">Goal for the next period</label><input class="input" id="f-next" name="next">${ferr && ferr.next ? `<span class="err">${esc(ferr.next)}</span>` : ""}</div>
          ${ferr && ferr.rule ? `<p class="small" style="color:var(--red);font-weight:500">${esc(ferr.rule)}</p>` : ""}
          <button class="btn" type="submit">Record final review</button></form>`
      : `<p class="muted">Not recorded yet.</p>${!can("advisor") ? locked("advisor", "record the academic judgement") : ""}`;
    return head("Final review", `${esc(PERIOD.label)}: ${d(PERIOD.start)} to ${d(PERIOD.end)}. Employer feedback and the academic judgement are recorded separately.`, f.advisor ? chip("ok", "Recorded") : open ? chip("wait", "Open") : chip("none", "Opens " + d(PERIOD.end))) +
      (!open ? nextStrip({ cls: "", html: `<strong>The final review opens at the end of ${esc(PERIOD.label)} on ${d(PERIOD.end)}.</strong> Until then, use Progress and actions for the midpoint review.` }) : "") +
      `<div class="layout single"><div class="stack">
      <div class="two-col">
        <section class="voice employer" aria-labelledby="v-emp"><h3 id="v-emp">Employer feedback</h3><div class="who">${esc(PEOPLE.supervisor.name)}, workplace supervisor, Emirates Group</div>${empHTML}</section>
        <section class="voice" aria-labelledby="v-adv"><h3 id="v-adv">Academic judgement</h3><div class="who">${esc(PEOPLE.advisor.name)}, academic advisor · not an official grade</div>${advHTML}</section>
      </div>
      ${later.length ? `<section class="panel"><div class="panel-head"><h2>Evidence outside this period</h2></div><div class="panel-body"><p class="small muted">Dated after ${d(PERIOD.end)}. Not counted towards ${esc(PERIOD.label)} and not shown as achieved.</p><div class="ev-list">${later.map((e) => `<span class="ev excluded" title="${esc(e.title)}">${e.id} ${esc(e.title)}, ${d(e.date)}</span>`).join("")}</div></div></section>` : ""}
      <section class="panel"><div class="panel-head"><h2>Trace: goal G1 through the period</h2></div><div class="panel-body">${chainHTML(traceG1(), "Goal G1 trace")}</div></section>
      </div></div>`;
  }

  function traceG1() {
    const g = S.agreement.goals.find((x) => x.id === "G1");
    const rev = S.logs.find((l) => l.goal === "G1" && l.versions.length > 1);
    const act = S.actions[0];
    const lo1 = S.judgements.LO1;
    return [
      { label: "Agreed goal", sub: g ? `G1, agreed ${d(S.agreement.signoffs.advisor)}` : "Not agreed", reached: !!g && S.agreement.status === "agreed" },
      { label: "Revised log", sub: rev ? `${rev.id} revised ${d(rev.versions.at(-1).at)}` : "No revision yet", reached: !!rev },
      { label: "Midpoint action", sub: act ? `${act.id} ${act.status === "closed" ? "closed " + d(act.closedAt) : "open"}` : "None", reached: !!act && act.status === "closed" },
      { label: "Outcome evidence", sub: lo1 && lo1.evidence.length ? `LO1: ${lo1.evidence.join(", ")}` : "Evidence missing", reached: !!(lo1 && lo1.evidence.length), gate: true },
      { label: "Final review", sub: S.final.advisor ? `LO1 ${S.final.advisor.outcomes.LO1}` : "Not recorded", reached: !!S.final.advisor }
    ].map((s, i, arr) => { if (!s.reached && arr.slice(0, i).every((x) => x.reached)) s.current = true; return s; });
  }

  /* ================= Records ================= */
  function pageRecords() {
    const ifaces = [
      ["P05 → P06", "Skill gap", "gapId, studentId, skillId, opportunityId, reason", "Fixture", "Received through import"],
      ["P06 → P01", "Reviewed skill evidence", "studentId, skillId, evidenceId, outcome, reviewer, reviewDate", "Fixture endpoint", "Sent on each demonstrated decision"],
      ["P06 → P07", "Readiness summary", "studentId, demonstrated[], inProgress[]", "Working (same team)", "Sent with each demonstrated decision"],
      ["P04 → P07", "Confirmed placement", "placementId, studentId, employer, period, supervisor, advisor, status", "Fixture", "Rejected unless status is university_confirmed"]
    ];
    const features = [
      ["Working", "Records saved in this browser; preparation plan; resource completion; simulated board; evidence submission, review and revision; skill gaps; learning agreement; logbook with feedback and revision; outcome judgements; support actions and overdue status; final review"],
      ["Simulated", "P05 gaps and P04 placements (fixtures); P01 receiving endpoint; the Jira board; the demo date; single sign-on (role switcher instead)"],
      ["Deferred", "Content for the SQL and visualisation modules; notifications; cohort dashboard; Moodle competency integration; live Jira"]
    ];
    return head("Handoffs and data", "Interfaces with other teams, every payload sent, and the full event log.",
      `<div class="btn-row"><button class="btn secondary" type="button" data-action="export">Download records (JSON)</button>${can("coordinator") ? `<button class="btn" type="button" data-action="send-readiness">Send readiness summary to P07</button>` : ""}</div>`) +
      `<div class="layout single"><div class="stack">
      <section class="panel"><div class="panel-head"><h2>Interface agreements</h2></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><thead><tr><th>Direction</th><th>Record</th><th>Fields</th><th>Connection</th><th>Rule</th></tr></thead><tbody>${ifaces.map((r) => `<tr><td class="id" style="white-space:nowrap">${r[0]}</td><td>${r[1]}</td><td class="small">${r[2]}</td><td><span class="tag ${/Fixture/.test(r[3]) ? "sim" : ""}">${r[3]}</span></td><td class="small">${r[4]}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Payloads sent</h2><span class="small muted">${S.handoffs.length} total</span></div><div class="panel-body">
        ${S.handoffs.length ? S.handoffs.slice().reverse().map((h) => `<div style="margin-bottom:14px"><div class="small"><span class="id">${h.id}</span> to <strong>${h.to}</strong> on ${d(h.at)} ${chip("ok", "Sent")}</div><pre class="payload">${esc(JSON.stringify(h.payload, null, 2))}</pre></div>`).join("") : '<p class="muted">Nothing sent yet. A demonstrated decision sends a record to P01.</p>'}
      </div></section>
      <section class="panel"><div class="panel-head"><h2>What is working, simulated or deferred</h2></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><tbody>${features.map((f) => `<tr><td style="width:120px"><span class="tag ${f[0] === "Simulated" ? "sim" : f[0] === "Deferred" ? "def" : ""}">${f[0]}</span></td><td class="small">${f[1]}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Event log</h2><span class="small muted">${S.events.length} events</span></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><thead><tr><th style="width:120px">Date</th><th style="width:180px">Actor</th><th>Event</th></tr></thead><tbody>${S.events.slice().reverse().map((e) => `<tr><td>${d(e.at)}</td><td>${esc(e.actor)}</td><td>${esc(e.text)}</td></tr>`).join("")}</tbody></table></div></section>
      </div></div>`;
  }

  function pageNotFound() { return head("Page not found", "This record does not exist in the current scenario.") + `<a class="btn sm" href="#/${HOME[S.role]}">Go to start page</a>`; }

  /* ================= Dialogs ================= */
  function settingsDialog() {
    return `<dialog id="settings" aria-labelledby="set-title"><div class="panel-body">
      <h2 id="set-title" style="margin-bottom:6px">Demo scenarios</h2><p class="small muted">Loading a scenario replaces the records saved in this browser.</p>
      ${Object.entries(PRESETS).map(([k, p]) => `<div class="preset"><div><strong>${esc(p.label)}</strong>${S.preset === k ? ' <span class="small muted">(loaded)</span>' : ""}<div class="small muted">${esc(p.note)}</div></div><button class="btn secondary sm" type="button" data-action="preset" data-preset="${k}">Load</button></div>`).join("")}
      <form data-form="date" style="margin-top:16px;border-top:1px solid var(--line-2);padding-top:14px"><div class="field"><label for="demo-date">Demo date</label><div class="btn-row"><input class="input" type="date" id="demo-date" name="date" value="${S.today}" style="max-width:200px"><button class="btn secondary sm" type="submit">Set date</button></div><span class="hint">Use this to show overdue actions or open the final review.</span></div></form>
      <div class="btn-row" style="justify-content:flex-end;margin-top:6px"><button class="btn ghost" type="button" data-action="close-settings">Close</button></div></div></dialog>`;
  }
  function reasonDialog() {
    return `<dialog id="reason" aria-labelledby="reason-title"><form class="panel-body" data-form="reason"><h2 id="reason-title" style="margin-bottom:6px">Why is this item moving?</h2>
      <p class="small muted" id="reason-sub"></p><div class="field"><label for="reason-text">Reason for the status change</label><input class="input" id="reason-text" name="reason" autocomplete="off"><span class="err" id="reason-err" hidden></span></div>
      <div class="btn-row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-action="close-reason">Cancel</button><button class="btn" type="submit">Move item</button></div></form></dialog>`;
  }

  /* ================= Sprint 2: AI features ================= */
  function ensureAI(s) {
    s.chat = s.chat || []; s.handoffQ = s.handoffQ || []; s.matchReviews = s.matchReviews || [];
    s.matchStudent = s.matchStudent || "COOP-B001";
    return s;
  }
  const faqById = (id) => FAQ.find((f) => f.id === id);
  const openHandoffs = () => S.handoffQ.filter((q) => q.status === "open").length;

  /* Layla's live profile: reviewed skills from P06 feed straight into matching (P06 -> P01 -> matching). */
  function studentForMatch(id) {
    const base = JSON.parse(JSON.stringify(AI_STUDENTS.find((x) => x.id === id) || AI_STUDENTS[0]));
    if (base.id === "COOP-B001") {
      const rev = S.submissions.filter((x) => x.status === "demonstrated");
      rev.forEach((x) => base.skills.push({ id: x.skillId, raw: skillOf(x.skillId).name, status: "reviewed", evidence: x.id }));
      if (rev.length) { base.profileVersion += 1; base.reviewedFrom = rev.map((x) => x.id); }
    }
    return base;
  }

  function askHTML(embed) {
    const msgs = S.chat.map((m) => {
      const user = `<div class="msg user"><div class="bubble">${esc(m.q)}</div><div class="meta">${esc(m.by)} · ${d(m.at)}</div></div>`;
      let bot;
      if (m.res.kind === "answer") {
        const f = faqById(m.res.faqId);
        bot = `<div class="msg bot"><div class="bubble"><p>${esc(f.a)}</p>
          <div class="src"><span class="tag">Approved source</span> <span class="id">${f.id}</span> · ${esc(f.source)} · match score ${m.res.score.toFixed(2)}${m.res.guard === "privacy" ? " · privacy rule" : ""}</div>
          <div class="btn-row" style="margin-top:8px">${f.link && !embed ? `<a class="btn secondary sm" href="${f.link}">Open the related page</a>` : ""}
          ${m.flagged ? `<span class="small muted">Sent to the coordinator as ${esc(m.flagged)}</span>` : `<button class="btn ghost sm" type="button" data-action="chat-flag" data-id="${m.id}">Not what I asked: send to a coordinator</button>`}</div></div></div>`;
      } else {
        const h = S.handoffQ.find((x) => x.id === m.handoffId);
        bot = `<div class="msg bot handoff"><div class="bubble"><p><strong>I don’t have an approved answer for this, so I won’t guess.</strong> I have sent your question to ${esc(PEOPLE.coordinator.name)} (co-op coordinator) as <span class="id">${esc(m.handoffId)}</span>.</p>
          <div class="src">Why: ${esc(m.res.reason)}</div></div></div>`;
        if (h && h.status === "answered") bot += `<div class="msg bot human"><div class="bubble"><div class="fhead small muted">${esc(h.by)}, co-op coordinator · ${d(h.answeredAt)}</div><p>${esc(h.reply)}</p><div class="src"><span class="tag">Human answer</span> Not yet part of the approved FAQ.</div></div></div>`;
      }
      return user + bot;
    }).join("");
    const empty = `<div class="msg bot"><div class="bubble"><p>Hi ${esc(PEOPLE.student.short)}. I answer questions about internship matching, preparation and co-op progress, using only approved sources. I can’t make decisions or approve placements.</p></div></div>`;
    return `<div class="chat" aria-live="polite" id="chatlog">${msgs || empty}</div>
      <form class="chat-form" data-form="ask"><label class="sr-only" for="askq">Your question</label>
        <input class="input" id="askq" name="q" autocomplete="off" placeholder="Ask about matching, preparation or your co-op" value="${esc(ui.draft.ask || "")}">
        <button class="btn" type="submit">Ask</button></form>
      ${ui.errors.ask ? `<p class="small" style="color:var(--red);margin:6px 0 0">${esc(ui.errors.ask)}</p>` : ""}
      <div class="suggest" aria-label="Suggested questions">${AI_SUGGESTED.map((q) => `<button type="button" class="pill" data-action="ask" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>`;
  }

  function pageAssistant() {
    const queue = S.handoffQ.slice().reverse();
    const queueHTML = `<section class="panel"><div class="panel-head"><h2>Questions for a person</h2><span class="small muted">${openHandoffs()} open</span></div><div class="panel-body">
      ${queue.length ? `<table class="table"><thead><tr><th>ID</th><th>Question</th><th>Why it came here</th><th>Status</th></tr></thead><tbody>${queue.map((h) => `<tr>
        <td class="id">${h.id}<div class="small muted">${d(h.at)}</div></td><td>${esc(h.q)}<div class="small muted">from ${esc(h.from)}</div></td><td class="small">${esc(h.reason)}</td>
        <td>${h.status === "answered" ? `${chip("ok", "Answered")}<div class="small" style="margin-top:6px">${esc(h.reply)}</div>` : can("coordinator") ? `<form data-form="handoff-reply" data-id="${h.id}"><label class="sr-only" for="hr-${h.id}">Reply</label><textarea class="input" id="hr-${h.id}" name="reply" style="min-height:60px" placeholder="Reply to the student"></textarea>${ui.errors["hr-" + h.id] ? `<div class="small" style="color:var(--red)">${esc(ui.errors["hr-" + h.id])}</div>` : ""}<button class="btn sm" type="submit" style="margin-top:6px">Send reply</button></form>` : chip("wait", "With coordinator")}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted small">No questions have been handed over yet.</p>`}
      ${can("coordinator") ? "" : locked("coordinator", "answer handed-over questions")}</div></section>`;
    const embed = `&lt;iframe src="https://lizhengxi25.github.io/waypoint/#/embed"\n  title="IPP co-op assistant" width="380" height="600"&gt;&lt;/iframe&gt;`;
    return head("Ask the co-op assistant", `Answers come only from ${FAQ.length} approved entries, and each answer shows its source. If the assistant is not sure, or the question is about a policy it has no source for, it hands the question to the co-op coordinator instead of guessing.`,
      `<button class="btn secondary sm" type="button" data-action="chat-clear">Clear conversation</button>`) +
      `<div class="layout"><div class="stack">
        ${can("coordinator") ? queueHTML : ""}
        <section class="panel" aria-label="Conversation"><div class="panel-body">${notice("rule", "<strong>Decision support only.</strong> The assistant cannot approve placements, change records or answer questions about other students.")}<div style="margin-top:14px">${askHTML(false)}</div></div></section>
        ${can("coordinator") ? "" : queueHTML}
      </div>
      <aside class="rail"><section class="panel"><div class="panel-head"><h2 style="font-size:16px">How it works</h2></div><div class="panel-body small">
        <ol class="steps"><li>Your question is matched against the approved entries (synonyms included, e.g. “co-op” = “internship”).</li>
        <li>If the best entry scores at least ${IPP_AI.THRESHOLD} and shares two key terms, its approved text is shown word for word.</li>
        <li>Policy topics with no source (pay, GPA, visas, credits, remote work…) and low-confidence questions go to a person.</li>
        <li>Questions about another named student get the privacy answer and no data.</li></ol>
        <p class="muted" style="margin-top:10px">${esc(AI_META.assistantVersion)}. Knowledge base approved by ${esc(AI_META.kbApprovedBy)}, ${d(AI_META.kbApprovedOn)}. Source: ${esc(AI_META.kbSource)}.</p>
        <details style="margin-top:8px"><summary>See all ${FAQ.length} approved entries</summary><ul class="kb">${FAQ.map((f) => `<li><span class="id">${f.id}</span> ${esc(f.q)}</li>`).join("")}</ul></details>
      </div></section>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><h2 style="font-size:16px">Embedding plan</h2></div><div class="panel-body small">
        <p>Other IPP teams can place the same assistant in their pages with one iframe. It shares the approved knowledge base and the coordinator queue.</p>
        <pre class="payload">${embed}</pre><p style="margin-top:8px"><a href="#/embed">Preview the embedded view</a></p>
        <p class="muted">Sprint 3 option: move the approved entries into Botpress (knowledge base + human handoff) behind the same iframe.</p></div></section></aside></div>`;
  }

  function pageEmbed() {
    return `<div class="embed-wrap"><header class="embed-head"><svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#123B73"/><path d="M16 7.5 24.5 16 16 24.5 7.5 16z" fill="#8EC5FF"/></svg><div><strong>IPP co-op assistant</strong><div class="small muted">Team P6/P7 · approved answers only</div></div></header>
      ${askHTML(true)}<p class="small muted" style="margin-top:10px">Synthetic classroom demo. Decision support only; placements are approved by the university.</p></div>`;
  }

  const isoNice = (t) => String(t).replace(/\d{4}-\d{2}-\d{2}/g, (m) => d(m));
  const ELIG = { eligible: ["ok", "Eligible"], check: ["wait", "Eligibility needs a coordinator check"], no: ["warn", "Not eligible"] };
  function scoreBar(r) {
    const W = MATCH_WEIGHTS, p = r.parts;
    const seg = (k, cls) => `<span class="seg ${cls}" style="width:${p[k]}%" title="${k}: ${p[k]} of ${W[k]}"></span>`;
    return `<div class="scoreline"><div class="scorebar" role="img" aria-label="Score ${r.total} of 100: required skills ${p.required} of ${W.required}, desirable ${p.desirable} of ${W.desirable}, interests ${p.interests} of ${W.interests}, location ${p.location} of ${W.location}">${seg("required", "s1")}${seg("desirable", "s2")}${seg("interests", "s3")}${seg("location", "s4")}</div><span class="score">${r.total}<span class="muted small"> / 100</span></span></div>
      <div class="legend small muted"><span><i class="s1"></i>Required ${p.required}/${W.required}</span><span><i class="s2"></i>Desirable ${p.desirable}/${W.desirable}</span><span><i class="s3"></i>Interests ${p.interests}/${W.interests}</span><span><i class="s4"></i>Location ${p.location}/${W.location}</span></div>`;
  }

  function pageMatches() {
    const sid = can("student") ? "COOP-B001" : S.matchStudent;
    const st = studentForMatch(sid);
    const res = IPP_AI.match(st, AI_OPPORTUNITIES, { today: S.today });
    const isLayla = st.id === "COOP-B001";
    const card = (r) => {
      const op = r.op, el = ELIG[r.eligibility.status];
      const req = S.matchReviews.find((x) => x.studentId === st.id && x.opId === op.id);
      const gapBtns = r.gaps.map((g) => {
        const p06 = SKILLS.find((k) => k.id === g.id);
        const open = S.gaps.find((x) => x.skillId === g.id && x.status === "open");
        const done = S.submissions.find((x) => x.skillId === g.id && x.status === "demonstrated");
        const act = !isLayla ? "" : done ? "" : open ? `<span class="small muted">On plan as ${esc(open.id)}</span>` : p06 && (can("student") || can("coordinator")) ? `<button class="btn secondary sm" type="button" data-action="match-gap" data-skill="${g.id}" data-op="${op.id}">Add to preparation plan</button>` : p06 ? "" : `<span class="small muted">No P06 module yet</span>`;
        return `<li><span class="${g.kind === "required" ? "gap-req" : "gap-des"}">${esc(g.name)}</span> <span class="small muted">(${g.kind})</span> ${act}</li>`;
      }).join("");
      const reqForm = ui.open["mr-" + op.id] ? `<form data-form="match-review" data-op="${op.id}" style="margin-top:10px"><label class="label small" for="mr-${op.id}">What should the coordinator look at?</label><textarea class="input" id="mr-${op.id}" name="text" style="min-height:60px"></textarea>${ui.errors["mr-" + op.id] ? `<div class="small" style="color:var(--red)">${esc(ui.errors["mr-" + op.id])}</div>` : ""}<div class="btn-row" style="margin-top:6px"><button class="btn sm" type="submit">Send to coordinator</button><button class="btn ghost sm" type="button" data-action="toggle" data-id="mr-${op.id}">Cancel</button></div></form>` : "";
      return `<article class="match ${r.weak ? "weak" : ""}" aria-label="Rank ${r.rank}: ${esc(op.title)}">
        <div class="match-top"><div class="rank" aria-hidden="true">${r.rank}</div>
          <div style="flex:1;min-width:0"><h3>${esc(op.title)}</h3><div class="skill-meta">${esc(op.employer)} · ${esc(op.location)} · ${d(op.start)} to ${d(op.end)} · <span class="id">${op.id}</span></div></div>
          <div class="btn-row" style="justify-content:flex-end">${r.weak ? chip("none", "Weak match") : ""}${chip(el[0], el[1])}</div></div>
        ${scoreBar(r)}
        <div class="two-col" style="margin-top:12px;gap:16px"><div><h4 class="mini">Why it is suggested</h4><ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div><h4 class="mini">Eligibility, checked separately</h4><ul class="checks">${r.eligibility.checks.map((c) => `<li class="${c.state}"><span class="st">${c.state === "pass" ? "Met" : c.state === "fail" ? "Not met" : "Unknown"}</span> ${esc(c.label)}: <span class="muted">${esc(isoNice(c.note))}</span></li>`).join("")}</ul>
          ${r.gaps.length ? `<h4 class="mini" style="margin-top:10px">Skill gaps</h4><ul class="gaps">${gapBtns}</ul>` : `<p class="small muted" style="margin-top:8px">No skill gaps for this role.</p>`}</div></div>
        <div class="match-foot"><span class="small muted">Inputs: ${esc(r.inputs)}</span>
          ${req ? `<span class="small">${req.status === "open" ? chip("wait", `Review requested ${d(req.at)}`) : chip(req.decision === "ok" ? "ok" : "warn", req.decision === "ok" ? "Coordinator: fine to apply" : "Coordinator: not suitable")}</span>` : can("student") ? `<button class="btn ghost sm" type="button" data-action="toggle" data-id="mr-${op.id}">Ask coordinator to review</button>` : ""}</div>
        ${reqForm}</article>`;
    };
    const reviews = S.matchReviews.slice().reverse();
    const reviewsHTML = reviews.length ? `<section class="panel"><div class="panel-head"><h2>Review requests</h2><span class="small muted">Human review step</span></div><div class="panel-body"><table class="table"><thead><tr><th>Request</th><th>Student’s note</th><th>Coordinator decision</th></tr></thead><tbody>${reviews.map((q) => `<tr><td class="id">${q.id}<div class="small muted">${q.studentId} · ${q.opId} · ${d(q.at)}</div></td><td>${esc(q.text)}</td><td>${q.status === "closed" ? `${chip(q.decision === "ok" ? "ok" : "warn", q.decision === "ok" ? "Fine to apply" : "Not suitable")}<div class="small" style="margin-top:4px">${esc(q.reply)}</div><div class="small muted">${esc(q.by)}, ${d(q.closedAt)}</div>` : can("coordinator") ? `<form data-form="match-decide" data-id="${q.id}"><label class="sr-only" for="md-${q.id}">Comment</label><textarea class="input" id="md-${q.id}" name="reply" style="min-height:56px" placeholder="Comment for the student"></textarea>${ui.errors["md-" + q.id] ? `<div class="small" style="color:var(--red)">${esc(ui.errors["md-" + q.id])}</div>` : ""}<div class="btn-row" style="margin-top:6px"><button class="btn sm" type="submit" name="decision" value="ok">Fine to apply</button><button class="btn danger sm" type="submit" name="decision" value="no">Not suitable</button></div></form>` : chip("wait", "With coordinator")}</td></tr>`).join("")}</tbody></table>
      <p class="small muted" style="margin-top:8px">“Fine to apply” is advice. A placement is official only when the university confirms it (P04).</p></div></section>` : "";
    const picker = !can("student") ? `<form class="btn-row" style="margin-bottom:16px"><label for="mstudent" class="small" style="font-weight:500">Synthetic student</label><select class="input" id="mstudent" data-change="match-student" style="max-width:320px">${AI_STUDENTS.map((x) => `<option value="${x.id}" ${x.id === sid ? "selected" : ""}>${esc(x.name)} (${x.id})</option>`).join("")}</select></form>` : "";
    const skillChips = res.skills.map((k) => `<span class="chip ${k.status === "reviewed" ? "ok" : "none"}">${esc(k.name)} · ${k.status === "reviewed" ? `reviewed${k.evidence ? " " + k.evidence : ""}` : "self-declared"}</span>`).join(" ");
    return head(can("student") ? "Your internship matches" : "Internship matches",
      "Up to three open opportunities, ranked by transparent rules. Eligibility is checked separately, and every suggestion shows its reasons and skill gaps.") +
      notice("rule", "<strong>Ranking is not placement.</strong> A match is decision support. The coordinator checks eligibility, and a placement is official only after the university confirms it (P04).") +
      `<div class="layout" style="margin-top:20px"><div class="stack">${picker ? `<div>${picker}</div>` : ""}
        <section class="panel"><div class="panel-head"><h2>Profile used for matching</h2><span class="small muted">${esc(st.id)} · profile v${st.profileVersion}</span></div><div class="panel-body">
          <dl class="kv"><dt>Student</dt><dd>${esc(st.name)} <span class="tag sim">synthetic</span></dd><dt>Programme</dt><dd>${esc(st.programme)}</dd>
          <dt>Availability</dt><dd>${st.availability ? `${d(st.availability.from)} to ${d(st.availability.to)}` : `<span class="ev missing">Not provided</span>`}</dd>
          <dt>Interests</dt><dd>${esc(st.interests.join(", "))}</dd><dt>Locations</dt><dd>${esc(st.locations.join(", "))}</dd>
          <dt>Skills</dt><dd><div class="btn-row" style="gap:6px">${skillChips}</div>${res.unknownSkills.length ? `<div class="small" style="margin-top:6px;color:var(--amber)">Not in the shared skill vocabulary, so not used: ${esc(res.unknownSkills.join(", "))}</div>` : ""}</dd></dl>
          ${isLayla && st.reviewedFrom ? notice("ok", `Includes reviewed evidence from P06 (${esc(st.reviewedFrom.join(", "))}). Reviewed skills count in full; self-declared skills count at ${EVIDENCE_FACTOR.self * 100}%.`) : ""}
        </div></section>
        <h2 style="margin-top:6px">Top ${res.ranked.length} of ${res.ranked.length + res.others.length} eligible</h2>
        ${res.ranked.length < 3 ? notice("wait", `Only ${res.ranked.length} open ${res.ranked.length === 1 ? "opportunity passes" : "opportunities pass"} the mandatory conditions. We do not fill the list with roles the student cannot take.`) : ""}
        ${res.ranked.map(card).join("")}
        ${res.others.length ? `<details class="panel" style="padding:12px 20px"><summary>${res.others.length} more eligible ${res.others.length === 1 ? "opportunity" : "opportunities"} ranked lower</summary><table class="table" style="margin-top:8px"><tbody>${res.others.map((r) => `<tr><td class="id">${r.op.id}</td><td>${esc(r.op.title)}<div class="small muted">${esc(r.op.employer)}</div></td><td>${r.total}</td></tr>`).join("")}</tbody></table></details>` : ""}
        <section class="panel"><div class="panel-head"><h2>Not recommended: a mandatory condition fails</h2><span class="small muted">${res.excluded.length}</span></div><div class="panel-body">
          <table class="table"><thead><tr><th>Opportunity</th><th>Condition not met</th></tr></thead><tbody>${res.excluded.map((r) => `<tr><td><span class="id">${r.op.id}</span> ${esc(r.op.title)}<div class="small muted">${esc(r.op.employer)}</div></td><td class="small">${r.eligibility.checks.filter((c) => c.state === "fail").map((c) => `${esc(c.label)}: ${esc(isoNice(c.note))}`).join("<br>")}</td></tr>`).join("")}</tbody></table></div></section>
        ${reviewsHTML}
      </div>
      <aside class="rail"><section class="panel"><div class="panel-head"><h2 style="font-size:16px">Method</h2></div><div class="panel-body small">
        <p><strong>${esc(AI_META.matcherVersion)}.</strong> No machine-learning model: skill names are normalised to the shared vocabulary, then scored with fixed, visible weights.</p>
        <table class="table" style="font-size:13px"><tbody>${Object.entries(MATCH_WEIGHTS).map(([k, v]) => `<tr><td style="text-transform:capitalize">${k}</td><td>${v} pts</td></tr>`).join("")}<tr><td>Self-declared skill</td><td>${EVIDENCE_FACTOR.self * 100}% credit</td></tr><tr><td>Weak match</td><td>below ${WEAK_MATCH}</td></tr></tbody></table>
        <p style="margin-top:10px">Not used: name, gender, age, nationality or any other personal attribute. <a href="#/ai-checks">See the fairness test</a>.</p>
        <p class="muted">Sample data: ${AI_STUDENTS.length} synthetic students, ${AI_OPPORTUNITIES.length} synthetic opportunities. Demo date ${d(S.today)}.</p></div></section></aside></div>`;
  }

  /* Live test run: the same engine, base synthetic data, expected results fixed in ai_data.js */
  function runAITests() {
    const out = { chatbot: [], matching: [], checks: [] };
    AI_TESTS.chatbot.forEach((t) => { const r = IPP_AI.answer(t.q); const got = r.kind === "answer" ? r.faq.id : "handoff"; out.chatbot.push(Object.assign({}, t, { got, score: r.score, reason: r.reason, ok: got === t.expect })); });
    const base = (id) => JSON.parse(JSON.stringify(AI_STUDENTS.find((x) => x.id === id)));
    const run = (st) => IPP_AI.match(st, AI_OPPORTUNITIES, { today: "2026-11-23" });
    AI_TESTS.matching.forEach((t) => { const m = run(base(t.student)); const got = m.ranked.map((r) => r.op.id); out.matching.push(Object.assign({}, t, { got, scores: m.ranked.map((r) => r.total), ok: JSON.stringify(got) === JSON.stringify(t.expectTop) })); });
    const C = {};
    const mei = run(base("COOP-B003")), yus = run(base("COOP-B004")), lay = run(base("COOP-B001"));
    C["EL-01"] = [!mei.ranked.some((r) => r.op.id === "OP-043") && mei.excluded.some((r) => r.op.id === "OP-043" && r.eligibility.checks[0].state === "fail"), "OP-043 excluded: listing closed"];
    C["EL-02"] = [mei.ranked.length > 0 && mei.ranked.every((r) => r.eligibility.status === "check" && r.eligibility.checks.find((c) => c.label === "Availability").state === "unknown"), `${mei.ranked.length} results, all marked needs-check`];
    const y35 = yus.excluded.find((r) => r.op.id === "OP-035");
    C["EL-03"] = [!!y35 && y35.eligibility.checks.find((c) => c.label === "Availability").state === "fail", y35 ? y35.eligibility.checks.filter((c) => c.state === "fail").map((c) => c.label).join(" + ") + " not met" : "not excluded"];
    const twin = base("COOP-B001"); twin.name = "Test Student"; twin.id = "COOP-T999";
    const tw = run(twin); const sig = (m) => m.ranked.map((r) => r.op.id + ":" + r.total).join("|");
    C["FR-01"] = [sig(tw) === sig(lay), sig(tw)];
    const jira = base("COOP-B001"); jira.skills.push({ id: "SK-JIRA", raw: "Jira", status: "reviewed" });
    const jm = run(jira); C["SE-01"] = [jm.ranked[0].op.id === "OP-028" && lay.ranked[0].op.id !== "OP-028", `before: ${lay.ranked[0].op.id} first; after: ${jm.ranked.map((r) => r.op.id + " " + r.total).join(", ")}`];
    const noav = base("COOP-B001"); noav.availability = null; const nm = run(noav);
    C["SE-02"] = [nm.ranked.every((r) => r.eligibility.status === "check"), nm.ranked.map((r) => r.op.id + " " + r.eligibility.status).join(", ")];
    AI_TESTS.checks.forEach((c) => out.checks.push(Object.assign({}, c, { ok: C[c.id][0], detail: C[c.id][1] })));
    return out;
  }

  function pageAIChecks() {
    const R = runAITests(), all = [...R.chatbot, ...R.matching, ...R.checks], pass = all.filter((x) => x.ok).length;
    const okc = (ok) => (ok ? chip("ok", "Pass") : chip("warn", "Fail"));
    return head("AI checks", "Acceptance tests for the assistant and the matching engine. They run live in your browser on the base synthetic data every time this page opens.",
      `<div class="bigstat"><span>${pass}</span> / ${all.length} passed</div>`) +
      `<div class="layout single"><div class="stack">
      <section class="panel"><div class="panel-head"><h2>Assistant: ${R.chatbot.length} questions</h2><span class="small muted">${R.chatbot.filter((x) => x.ok).length} pass</span></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><thead><tr><th>ID</th><th>Question</th><th>Expected</th><th>Result</th><th>Why</th><th></th></tr></thead><tbody>
        ${R.chatbot.map((t) => `<tr><td class="id">${t.id}${t.regression ? `<div class="small muted">retest ${t.regression}</div>` : ""}</td><td>${esc(t.q)}</td><td class="id">${t.expect === "handoff" ? "Hand to person" : t.expect}</td><td class="id">${t.got === "handoff" ? "Handed to person" : t.got}</td><td class="small">${esc(t.reason)}</td><td>${okc(t.ok)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Matching: ${R.matching.length} synthetic profiles</h2><span class="small muted">${R.matching.filter((x) => x.ok).length} pass</span></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><thead><tr><th>ID</th><th>Profile</th><th>Expected order</th><th>Result (score)</th><th></th></tr></thead><tbody>
        ${R.matching.map((t) => `<tr><td class="id">${t.id}</td><td>${esc(AI_STUDENTS.find((s) => s.id === t.student).name)}<div class="small muted">${esc(t.note)}</div></td><td class="id">${t.expectTop.join(" → ")}</td><td class="id">${t.got.map((g, i) => `${g} (${t.scores[i]})`).join(" → ")}</td><td>${okc(t.ok)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Eligibility, fairness and sensitivity</h2></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><thead><tr><th>ID</th><th>Check</th><th>Observed</th><th></th></tr></thead><tbody>
        ${R.checks.map((t) => `<tr><td class="id">${t.id}</td><td>${esc(t.desc)}</td><td class="small">${esc(t.detail)}</td><td>${okc(t.ok)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Failures found and what we changed</h2></div><div class="panel-body" style="padding-left:10px;padding-right:10px"><table class="table"><thead><tr><th>ID</th><th>What went wrong</th><th>Corrective action</th></tr></thead><tbody>
        ${AI_FAILURE_LOG.map((f) => `<tr><td class="id">${f.id}<div class="small muted">${esc(f.version)}</div></td><td>${esc(f.what)}<div class="small muted" style="margin-top:4px">${esc(f.severity)}</div></td><td class="small">${esc(f.fix)}</td></tr>`).join("")}</tbody></table>
        <p class="small muted" style="margin-top:10px">Limits: these tests use ${AI_TESTS.chatbot.length} questions and ${AI_STUDENTS.length} synthetic profiles. They show the rules behave as designed; they do not show hiring accuracy. Human review: the coordinator answers every handed-over question, reviews challenged matches, and confirms eligibility before any application.</p></div></section>
      </div></div>`;
  }

  /* ================= Render ================= */
  function render() {
    const { r, arg } = route();
    const pages = { plan: pagePlan, catalogue: pageCatalogue, module: () => pageModule(arg), review: pageReviewQueue, submission: () => pageSubmission(arg), gaps: pageGaps,
      placement: pagePlacement, agreement: pageAgreement, logbook: pageLogbook, progress: pageProgress, final: pageFinal, records: pageRecords,
      assistant: pageAssistant, matches: pageMatches, "ai-checks": pageAIChecks };
    const y = window.scrollY;
    if (r === "embed") { document.body.classList.add("embedded"); document.getElementById("root").innerHTML = pageEmbed() + `<div class="toast" role="status" aria-live="polite" id="toast"></div>`; document.title = "IPP co-op assistant · Team P6/P7"; const cl = $("#chatlog"); if (cl) cl.scrollTop = cl.scrollHeight; return; }
    document.body.classList.remove("embedded");
    document.getElementById("root").innerHTML = shell((pages[r] || pageNotFound)());
    window.scrollTo(0, y);
    const cl = $("#chatlog"); if (cl) cl.scrollTop = cl.scrollHeight;
    const titleEl = document.querySelector("h1"); document.title = (titleEl ? titleEl.textContent + " · " : "") + "Team P6/P7";
  }
  let toastTimer;
  function toast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600); }

  /* ================= Actions ================= */
  function askQuestion(q) {
    const res = IPP_AI.answer(q, { selfId: "COOP-B001" });
    const m = { id: nextId("M-", S.chat), q, by: me().name, at: S.today, res: { kind: res.kind, faqId: res.faq ? res.faq.id : null, score: res.score, reason: res.reason, guard: res.guard || null, ranked: res.ranked } };
    if (res.kind === "handoff") { const id = nextId("Q-", S.handoffQ); S.handoffQ.push({ id, q, from: me().name, at: S.today, status: "open", reason: res.reason }); m.handoffId = id; event(`Assistant handed question ${id} to the coordinator`); }
    S.chat.push(m); ui.draft.ask = ""; commit(res.kind === "handoff" ? `Sent to ${PEOPLE.coordinator.name}: no approved answer` : null);
    const inp = $("#askq"); if (inp) inp.focus();
  }
  let pendingMove = null;
  function sendP01(sub, review) {
    const payload = { studentId: "COOP-B001", skillId: sub.skillId, evidenceId: sub.id, outcome: "demonstrated", reviewer: review.by, reviewDate: review.at };
    S.handoffs.push({ id: nextId("HO-", S.handoffs), to: "P01", at: S.today, status: "sent", payload });
  }
  function readinessPayload() {
    return { studentId: "COOP-B001", demonstrated: S.submissions.filter((x) => x.status === "demonstrated").map((x) => ({ skillId: x.skillId, evidenceId: x.id, reviewDate: x.reviews.at(-1).at })), inProgress: S.gaps.filter((g) => g.status === "open").map((g) => g.skillId) };
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]"); if (!b) return;
    const a = b.dataset.action;
    const go = {
      "as": () => { S.role = b.dataset.role; commit(`Now viewing as ${me().name}`); },
      "open-settings": () => $("#settings").showModal(),
      "close-settings": () => $("#settings").close(),
      "preset": () => { S = ensureAI(PRESETS[b.dataset.preset].make()); ui = { open: {}, errors: {}, draft: {} }; save(); location.hash = "#/" + HOME[S.role]; render(); toast(`Loaded “${PRESETS[S.preset].label}”`); },
      "import-gaps": () => {
        let added = 0, skipped = 0;
        FIXTURES.P05_GAPS.forEach((g) => { if (S.gaps.some((x) => x.skillId === g.skillId && x.status === "open") || S.gaps.some((x) => x.id === g.gapId)) { skipped++; return; }
          S.gaps.push({ id: g.gapId, studentId: g.studentId, skillId: g.skillId, opportunityId: g.opportunityId, source: "P05", reason: g.reason, createdAt: S.today, status: "open" }); added++; });
        if (added) event(`Imported ${added} skill gap${added > 1 ? "s" : ""} from P05`);
        commit(added ? `Imported ${added} gap${added > 1 ? "s" : ""} from P05${skipped ? `; ${skipped} already open` : ""}` : "No new gaps: these skills already have open gaps");
      },
      "resource-done": () => { const m = b.dataset.module; S.resources[m] = S.today; event(`Marked the ${MODULES[m].title} resource complete`); commit("Activity complete. Your skill is not yet demonstrated."); },
      "move": () => { const it = S.board.items.find((i) => i.key === b.dataset.key);
        if (!it.assignee) { toast(`Give ${it.key} an owner before moving it`); return; }
        pendingMove = { key: it.key, to: b.dataset.to }; $("#reason-sub").textContent = `${it.key}: ${it.summary}`; $("#reason-text").value = ""; $("#reason-err").hidden = true; $("#reason").showModal(); $("#reason-text").focus(); },
      "close-reason": () => $("#reason").close(),
      "toggle": () => { ui.open[b.dataset.id] = !ui.open[b.dataset.id]; render(); },
      "log-ack": () => { const l = S.logs.find((x) => x.id === b.dataset.id); l.status = "acknowledged"; l.feedback.push({ at: S.today, by: me().name, type: "note", text: "Acknowledged." }); event(`Acknowledged ${l.id}`); commit(`${l.id} acknowledged`); },
      "log-request": () => { ui.open["req-" + b.dataset.id] = true; render(); const t = document.getElementById("req-" + b.dataset.id); if (t) t.focus(); },
      "log-request-cancel": () => { ui.open["req-" + b.dataset.id] = false; render(); },
      "log-revise": () => { ui.open["rev-" + b.dataset.id] = true; ui.open[b.dataset.id] = true; render(); const t = document.getElementById("rev-" + b.dataset.id); if (t) t.focus(); },
      "sign": () => { const k = b.dataset.who; S.agreement.signoffs[k] = S.today; event(`Agreed the learning agreement as ${PEOPLE[k].role.toLowerCase()}`);
        if (Object.values(S.agreement.signoffs).every(Boolean)) { S.agreement.status = "agreed"; event("Learning agreement agreed by all three parties"); }
        commit(S.agreement.status === "agreed" ? "Learning agreement is now agreed and locked" : "Agreement recorded"); },
      "remove-goal": () => { S.agreement.goals = S.agreement.goals.filter((g) => g.id !== b.dataset.id); S.agreement.goals.forEach((g, i) => (g.id = "G" + (i + 1))); commit("Goal removed"); },
      "placement-ok": () => { S.placement = Object.assign({}, FIXTURES.P04_PLACEMENT_CONFIRMED, { receivedAt: S.today }); event("Received confirmed placement PL-028 from P04"); commit("Placement PL-028 received"); },
      "placement-bad": () => { S.placementAttempts.push({ placementId: "PL-031", at: S.today }); event("Placement PL-031 not accepted: awaiting university confirmation"); commit("PL-031 blocked: not yet confirmed by the university"); },
      "judge": () => { ui.open.editLO = b.dataset.lo; ui.errors.judge = null; render(); },
      "judge-cancel": () => { ui.open.editLO = null; render(); },
      "close-open": () => { ui.open["close-" + b.dataset.id] = true; render(); const t = document.getElementById("cl-" + b.dataset.id); if (t) t.focus(); },
      "send-readiness": () => { S.handoffs.push({ id: nextId("HO-", S.handoffs), to: "P07", at: S.today, status: "sent", payload: readinessPayload() }); event("Sent a readiness summary to P07"); commit("Readiness summary sent to P07"); },
      "ask": () => { askQuestion(b.dataset.q); },
      "chat-clear": () => { S.chat = []; ui.draft.ask = ""; commit("Conversation cleared. Handed-over questions stay with the coordinator."); },
      "chat-flag": () => { const m = S.chat.find((x) => x.id === b.dataset.id); const id = nextId("Q-", S.handoffQ);
        S.handoffQ.push({ id, q: m.q, from: m.by, at: S.today, status: "open", reason: `Student said the answer (${m.res.faqId}) did not fit the question.` });
        m.flagged = id; event(`Sent question ${id} to the coordinator (answer did not fit)`); commit(`${id} sent to ${PEOPLE.coordinator.name}`); },
      "match-gap": () => { const sk = b.dataset.skill, op = b.dataset.op;
        if (S.gaps.some((g) => g.skillId === sk && g.status === "open")) { toast("This gap is already on the plan"); return; }
        const id = nextId("GAP-", S.gaps); S.gaps.push({ id, studentId: "COOP-B001", skillId: sk, opportunityId: op, source: "match", reason: `${op} lists ${IPP_AI.skillName(sk)}; no reviewed evidence yet (matching, Sprint 2)`, createdAt: S.today, status: "open" });
        event(`Added skill gap ${id} from matching (${op})`); commit(`${id} added to the preparation plan`); },
      "export": () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(blob); const a2 = document.createElement("a"); a2.href = u; a2.download = `teamp6p7-records-${S.today}.json`; a2.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
    }[a];
    if (go) { e.preventDefault(); go(); }
  });

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-change]"); if (!el) return;
    const c = el.dataset.change;
    if (c === "role") { S.role = el.value; save(); render(); toast(`Now viewing as ${me().name}`); }
    if (c === "match-student") { S.matchStudent = el.value; save(); render(); }
    if (c === "assign") { const it = S.board.items.find((i) => i.key === el.dataset.key); it.assignee = el.value; save(); render(); }
    if (c === "milestone") { const m = S.milestones.find((x) => x.id === el.dataset.id); m.done = el.checked; m.at = el.checked ? S.today : null; event(`${el.checked ? "Completed" : "Reopened"} host milestone: ${m.text}`); commit(); }
  });

  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-form]"); if (!f) return;
    e.preventDefault();
    const fd = new FormData(f), kind = f.dataset.form;
    const handlers = {
      "add-item": () => { const s = (fd.get("summary") || "").trim();
        if (s.length < 8) { ui.errors.item = "Write a specific summary of at least 8 characters."; return render(); }
        ui.errors.item = null; const key = "OPS-" + S.board.next++; S.board.items.push({ key, summary: s, assignee: "", status: "todo", createdBy: "student" }); commit(`${key} created. Give it an owner.`); },
      "reason": () => { const r = (fd.get("reason") || "").trim(); if (words(r) < 3) { const er = $("#reason-err"); er.textContent = "Give a reason of at least three words."; er.hidden = false; return; }
        const it = S.board.items.find((i) => i.key === pendingMove.key); S.board.log.push({ key: it.key, from: it.status, to: pendingMove.to, reason: r, at: S.today }); it.status = pendingMove.to; $("#reason").close(); commit(`${it.key} moved`); },
      "submit-evidence": () => { const ex = (fd.get("explanation") || "").trim(); ui.draft.expl = ex;
        if (words(ex) < 25) { ui.errors.submit = `Your explanation has ${words(ex)} words. Write at least 25 so the reviewer can follow your reasoning.`; return render(); }
        const m = MODULES[f.dataset.module]; let sub = subFor(m.skill);
        const snap = JSON.parse(JSON.stringify(S.board));
        if (!sub) { sub = { id: "EV-" + String(S.submissions.length + 1).padStart(4, "0"), skillId: m.skill, moduleId: m.id, status: "submitted", versions: [], reviews: [] }; S.submissions.push(sub); }
        sub.versions.push({ v: sub.versions.length + 1, at: S.today, explanation: ex, board: snap }); sub.status = "submitted";
        ui.errors.submit = null; ui.draft.expl = null; event(`Submitted ${sub.id} version ${sub.versions.length}`); commit(`${sub.id} version ${sub.versions.length} sent for review`); },
      "review": () => { const sub = S.submissions.find((x) => x.id === f.dataset.id), m = MODULES[sub.moduleId];
        const decision = e.submitter ? e.submitter.value : "demonstrated", comment = (fd.get("comment") || "").trim(), checklist = m.checklist.map((_, i) => fd.get("c" + i) === "on");
        ui.draft.comment = comment; ui.draft.checklist = checklist;
        if (decision === "demonstrated" && checklist.some((x) => !x)) { ui.errors.review = "All four criteria must be met to record the skill as demonstrated. Request a revision instead."; return render(); }
        if (decision !== "demonstrated" && !comment) { ui.errors.review = "Add a comment that tells the student what to change."; return render(); }
        const review = { at: S.today, by: me().name, decision, comment: comment || "All criteria met.", checklist };
        sub.reviews.push(review); sub.status = decision;
        if (decision === "demonstrated") { const g = S.gaps.find((x) => x.skillId === sub.skillId && x.status === "open"); if (g) g.status = "closed"; sendP01(sub, review); S.handoffs.push({ id: nextId("HO-", S.handoffs), to: "P07", at: S.today, status: "sent", payload: readinessPayload() }); event(`Recorded ${sub.id} as demonstrated; sent to P01 and P07`); }
        else event(decision === "revision" ? `Requested a revision on ${sub.id}` : `Recorded ${sub.id} as not yet demonstrated`);
        ui.errors.review = null; ui.draft = {}; commit(decision === "demonstrated" ? `${sub.id} recorded as demonstrated and sent to P01` : decision === "revision" ? "Revision requested" : "Recorded as not yet demonstrated"); },
      "manual-gap": () => { const skill = fd.get("skill"), reason = (fd.get("reason") || "").trim(), op = (fd.get("op") || "").trim().toUpperCase();
        const dup = S.gaps.find((g) => g.skillId === skill && g.status === "open");
        if (dup) { ui.errors.gap = `Layla already has an open gap for ${skillOf(skill).name} (${dup.id}).`; return render(); }
        if (reason.length < 5) { ui.errors.gap = "Say why this gap matters."; return render(); }
        const id = nextId("GAP-", S.gaps); S.gaps.push({ id, studentId: "COOP-B001", skillId: skill, opportunityId: op || null, source: "manual", reason, createdAt: S.today, status: "open" });
        ui.errors.gap = null; event(`Entered skill gap ${id} manually`); commit(`${id} added to Layla’s plan`); },
      "goal": () => { const text = (fd.get("text") || "").trim(), los = fd.getAll("lo");
        if (text.length < 10) { ui.errors.goal = "Describe the goal in a full phrase."; return render(); }
        if (!los.length) { ui.errors.goal = "Map the goal to at least one learning outcome."; return render(); }
        S.agreement.goals.push({ id: "G" + (S.agreement.goals.length + 1), text, outcomes: los }); ui.errors.goal = null; commit("Goal added"); },
      "log": () => { const text = (fd.get("text") || "").trim(); if (words(text) < 8) { ui.errors.log = "Write at least eight words about what you did and learned."; return render(); }
        const ev = []; if (fd.get("ev")) ev.push(fd.get("ev"));
        const nt = (fd.get("newev") || "").trim(); if (nt) { const id = "EV-" + String(Math.max(100, ...S.evidence.map((x) => +x.id.slice(3))) + 1).padStart(4, "0"); S.evidence.push({ id, title: nt, date: S.today, source: "Student" }); ev.push(id); }
        const id = "LOG-" + String(S.logs.length + 1).padStart(2, "0");
        S.logs.push({ id, week: weekOf(S.today), date: S.today, goal: fd.get("goal"), status: "submitted", versions: [{ v: 1, at: S.today, text, evidence: ev }], feedback: [] });
        ui.errors.log = null; event(`Submitted log entry ${id}`); commit(`${id} sent to ${PEOPLE.supervisor.name}`); },
      "log-revise": () => { const l = S.logs.find((x) => x.id === f.dataset.id), text = (fd.get("text") || "").trim();
        if (text === l.versions.at(-1).text) { ui.errors["rev-" + l.id] = "Change the entry to respond to the feedback."; return render(); }
        l.versions.push({ v: l.versions.length + 1, at: S.today, text, evidence: l.versions.at(-1).evidence.slice() }); l.status = "revised"; ui.open["rev-" + l.id] = false; ui.errors["rev-" + l.id] = null;
        event(`Revised ${l.id}`); commit(`${l.id} revision sent`); },
      "log-request": () => { const l = S.logs.find((x) => x.id === f.dataset.id), text = (fd.get("text") || "").trim();
        if (words(text) < 4) { ui.errors["req-" + l.id] = "Tell Layla specifically what to add (at least four words)."; return render(); }
        l.status = "feedback"; l.feedback.push({ at: S.today, by: me().name, type: "request", text }); ui.open["req-" + l.id] = false; ui.errors["req-" + l.id] = null;
        event(`Requested more detail on ${l.id}`); commit(`Feedback request sent on ${l.id}`); },
      "judge": () => { const lo = f.dataset.lo, level = fd.get("level"), ev = fd.getAll("ev");
        if (level !== "none" && !ev.length) { ui.errors.judge = "Link at least one piece of evidence, or keep the outcome as not yet evidenced."; return render(); }
        S.judgements[lo] = { level, evidence: ev, by: me().name, at: S.today }; ui.open.editLO = null; ui.errors.judge = null; event(`Recorded judgement for ${lo}: ${LEVEL[level][1].toLowerCase()}`); commit(`${lo} updated`); },
      "action": () => { const text = (fd.get("text") || "").trim(), due = fd.get("due");
        if (text.length < 8 || !due) { ui.errors.action = "Every action needs a description, an owner and a due date."; return render(); }
        const id = nextId("ACT-", S.actions, 2); S.actions.push({ id, text, owner: fd.get("owner"), due, status: "open", closure: "", closedAt: null, createdAt: S.today, createdBy: me().name });
        ui.errors.action = null; event(`Added support action ${id}`); commit(`${id} added`); },
      "close-action": () => { const a = S.actions.find((x) => x.id === f.dataset.id), c = (fd.get("closure") || "").trim();
        if (c.length < 5) { ui.errors["close-" + a.id] = "Describe the evidence that shows this is done."; return render(); }
        a.status = "closed"; a.closure = c; a.closedAt = S.today; ui.open["close-" + a.id] = false; event(`Closed ${a.id} with closure evidence`); commit(`${a.id} closed`); },
      "employer": () => { const text = (fd.get("text") || "").trim(); if (words(text) < 10) { ui.errors.employer = "Write at least ten words of feedback."; return render(); }
        S.final.employer = { by: me().name, at: S.today, text, wouldHost: fd.get("host") }; ui.errors.employer = null; event("Submitted employer feedback for Period 1"); commit("Employer feedback recorded"); },
      "final": () => { const summary = (fd.get("summary") || "").trim(), next = (fd.get("next") || "").trim(), outcomes = {}; const er = {};
        OUTCOMES.forEach((o) => (outcomes[o.id] = fd.get(o.id)));
        if (words(summary) < 10) er.summary = "Write at least ten words."; if (next.length < 8) er.next = "Set one goal for the next period.";
        const bad = OUTCOMES.filter((o) => outcomes[o.id] === "achieved" && !((S.judgements[o.id] || { evidence: [] }).evidence.some((x) => inPeriod(evById(x)) || (evById(x) && evById(x).source === "P06"))));
        if (bad.length) er.rule = `${bad.map((o) => o.id).join(", ")} cannot be marked achieved without evidence from this period.`;
        if (Object.keys(er).length) { ui.errors.final = er; return render(); }
        S.final.advisor = { by: me().name, at: S.today, outcomes, summary, nextGoal: next, period: PERIOD.id }; ui.errors.final = null; event("Recorded the final review for Period 1"); commit("Final review recorded for Period 1"); },
      "ask": () => { const q = (fd.get("q") || "").trim(); if (q.length < 3) { ui.errors.ask = "Type a question first."; return render(); } ui.errors.ask = null; askQuestion(q); },
      "handoff-reply": () => { const h = S.handoffQ.find((x) => x.id === f.dataset.id), r = (fd.get("reply") || "").trim();
        if (words(r) < 4) { ui.errors["hr-" + h.id] = "Write a reply of at least four words."; return render(); }
        Object.assign(h, { status: "answered", reply: r, by: me().name, answeredAt: S.today }); ui.errors["hr-" + h.id] = null; event(`Answered handed-over question ${h.id}`); commit(`Reply sent for ${h.id}`); },
      "match-review": () => { const op = f.dataset.op, t = (fd.get("text") || "").trim();
        if (words(t) < 4) { ui.errors["mr-" + op] = "Say what looks wrong or what you want checked (at least four words)."; return render(); }
        const id = nextId("MR-", S.matchReviews); S.matchReviews.push({ id, studentId: "COOP-B001", opId: op, text: t, at: S.today, status: "open" });
        ui.open["mr-" + op] = false; ui.errors["mr-" + op] = null; event(`Asked the coordinator to review match ${op} (${id})`); commit(`${id} sent to ${PEOPLE.coordinator.name}`); },
      "match-decide": () => { const q = S.matchReviews.find((x) => x.id === f.dataset.id), r = (fd.get("reply") || "").trim(), dec = e.submitter ? e.submitter.value : "ok";
        if (words(r) < 4) { ui.errors["md-" + q.id] = "Explain the decision to the student (at least four words)."; return render(); }
        Object.assign(q, { status: "closed", decision: dec, reply: r, by: me().name, closedAt: S.today }); ui.errors["md-" + q.id] = null; event(`Reviewed match request ${q.id}: ${dec === "ok" ? "fine to apply" : "not suitable"}`); commit(`${q.id} answered`); },
      "date": () => { const v = fd.get("date"); if (v) { S.today = v; $("#settings").close(); commit(`Demo date set to ${d(v)}`); } }
    };
    if (handlers[kind]) handlers[kind]();
  });

  window.addEventListener("hashchange", () => { ui.errors = {}; render(); const m = $("#main"); if (m && !location.hash.includes("#task")) m.focus({ preventScroll: true }); window.scrollTo(0, 0); });
  render();
  if (location.hash.endsWith("#task")) { const t = document.getElementById("task"); if (t) t.scrollIntoView(); }
})();
