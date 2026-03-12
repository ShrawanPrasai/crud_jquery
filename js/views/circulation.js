/* global $, window */
/* Circulation view — render + mount */
(function () {
  const U = () => window.LMS.utils;
  const S = () => window.LMS.state.circulation;
  const rerender = () => window.LMS.app.renderCurrent();

  /* ── State helpers ── */
  function setError(msg) { window.LMS.state.circulation.error = msg || ""; }

  /* ── Render ── */
  function render(db) {
    const { escapeHtml, norm, includesQ, isOverdue, isoToYmd, addDaysYmd, renderFieldError } = U();
    const state = S();
    const books = [...db.books].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    const members = [...db.members].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const q = norm(state.q);
    let activeLoans = db.loans.filter(l => !l.returnedAt);
    if (state.filter === "overdue") activeLoans = activeLoans.filter(l => isOverdue(l));

    activeLoans = activeLoans.filter(l => {
      const m = db.members.find(mx => mx.id === l.memberId);
      const b = db.books.find(bx => bx.id === l.bookId);
      return includesQ(`${m?.name || ""} ${m?.code || ""} ${b?.title || ""} ${b?.author || ""}`, q);
    });

    const loanSorters = {
      due_asc: (a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")),
      due_desc: (a, b) => String(b.dueAt || "").localeCompare(String(a.dueAt || "")),
      issued_desc: (a, b) => String(b.issuedAt || "").localeCompare(String(a.issuedAt || "")),
    };
    activeLoans.sort(loanSorters[state.sort] || loanSorters.due_asc);
    const overdueCount = db.loans.filter(l => !l.returnedAt && isOverdue(l)).length;
    const fe = state.fieldErrors || {};

    const noSetup = db.books.length === 0 || db.members.length === 0;
    const bookOptions = books.map(b => {
      const av = Number(b.copiesAvailable) || 0;
      return `<option value="${escapeHtml(b.id)}" ${av <= 0 ? "disabled" : ""}>${escapeHtml(b.title)} (avail: ${av})</option>`;
    }).join("");
    const memberOptions = members.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} (${m.code})</option>`).join("");

    return `
      <section class="card">
        <div class="card__header">
          <div><h1 class="card__title">Circulation</h1><div class="muted" style="margin-top:6px">Issue and return books.</div></div>
          <div class="toolbar">
            <span class="pill ${overdueCount > 0 ? "pill--bad" : "pill--ok"}">Overdue: ${overdueCount}</span>
            <span class="pill pill--warn">Active: ${activeLoans.length}</span>
          </div>
        </div>
        <div class="card__body">
          ${state.error ? `<div class="error" role="alert" style="margin-bottom:12px">${escapeHtml(state.error)}</div>` : ""}
          ${noSetup ? `<div class="error">Add a book and member first.</div>` : `
            <section class="card" style="margin-bottom:14px; background: rgba(0,0,0,0.10)">
              <div class="card__header" style="border-bottom:0"><div><div class="card__title" style="font-size:16px">Issue Book</div></div></div>
              <div class="card__body"><form id="issueForm" autocomplete="off"><div class="formGrid">
                <div class="col-6"><div class="field__label">Member *</div><select class="select" name="memberId"><option value="">Select...</option>${memberOptions}</select>${renderFieldError(fe, "memberId")}</div>
                <div class="col-6"><div class="field__label">Book *</div><select class="select" name="bookId"><option value="">Select...</option>${bookOptions}</select>${renderFieldError(fe, "bookId")}</div>
                <div class="col-4"><div class="field__label">Due Date *</div><input class="input" type="date" name="dueYmd" value="${addDaysYmd(14)}" />${renderFieldError(fe, "dueYmd")}</div>
                <div class="col-8"><div class="field__label">Note</div><input class="input" name="note" placeholder="Optional" /></div>
                <div class="col-12"><div class="toolbar" style="justify-content:flex-end"><button type="submit" class="btn btn--primary">Issue</button></div></div>
              </div></form></div></section>`}
          <div class="controlRow">
            <div class="controlLeft"><input class="input" style="width:240px" data-circ="q" placeholder="Search loans..." value="${escapeHtml(state.q)}" /></div>
            <div class="controlRight">
              <select class="select" style="width:140px" data-circ="filter"><option value="all">All Active</option><option value="overdue">Overdue</option></select>
              <select class="select" style="width:180px" data-circ="sort"><option value="due_asc">Due (soonest)</option><option value="issued_desc">Newest</option></select>
            </div>
          </div>
          <div class="tableWrap"><table style="min-width: 980px"><thead><tr>
            <th>Member</th><th>Book</th><th>Issued</th><th>Due</th><th>Status</th><th class="right">Action</th>
          </tr></thead><tbody>
            ${activeLoans.length === 0 ? `<tr><td colspan="6" class="muted">No active loans.</td></tr>` : activeLoans.map(l => {
              const m = db.members.find(mx => mx.id === l.memberId);
              const b = db.books.find(bx => bx.id === l.bookId);
              const ov = isOverdue(l);
              return `<tr>
                <td>${escapeHtml(m?.name || "Unknown")}<span class="sub">${m?.code || ""}</span></td>
                <td>${escapeHtml(b?.title || "Unknown")}<span class="sub">${b?.author || ""}</span></td>
                <td class="mono">${isoToYmd(l.issuedAt)}</td><td class="mono">${isoToYmd(l.dueAt)}</td>
                <td><span class="pill ${ov ? "pill--bad" : "pill--ok"}">${ov ? "Overdue" : "Active"}</span></td>
                <td class="right"><button class="btn btn--sm btn--primary" data-action="loan-return" data-id="${l.id}">Return</button></td></tr>`;
            }).join("")}
          </tbody></table></div>
        </div></section>`;
  }

  /* ── Mount ── */
  function mount($root) {
    $root.off("click.circ").off("submit.circ").off("input.circ change.circ");
    $root.on("submit.circ", "#issueForm", function (e) {
      e.preventDefault();
      const { toast } = U();
      const db = window.LMS.storage.readDb();
      const $f = $(this);
      const mid = String($f.find("[name='memberId']").val() || "");
      const bid = String($f.find("[name='bookId']").val() || "");
      const due = String($f.find("[name='dueYmd']").val() || "");
      const note = String($f.find("[name='note']").val() || "").trim();

      S().fieldErrors = {};
      if (!mid) S().fieldErrors.memberId = "Select member.";
      if (!bid) S().fieldErrors.bookId = "Select book.";
      if (!due) S().fieldErrors.dueYmd = "Required.";
      if (Object.keys(S().fieldErrors).length) { setError("Fix errors."); rerender(); return; }

      const bIdx = db.books.findIndex(b => b.id === bid);
      const b = db.books[bIdx];
      if ((Number(b.copiesAvailable) || 0) <= 0) { toast("bad", "Unavailable", "No copies."); return; }

      db.loans.push({ id: window.LMS.storage.uid("loan"), memberId: mid, bookId: bid, issuedAt: new Date().toISOString(), dueAt: new Date(`${due}T23:59:59Z`).toISOString(), returnedAt: null, note });
      db.books[bIdx].copiesAvailable = Math.max(0, (Number(b.copiesAvailable) || 0) - 1);
      window.LMS.storage.writeDb(db); toast("ok", "Issued", "Success."); rerender();
    });
    $root.on("click.circ", "[data-action='loan-return']", function () {
      const { confirmDialog, toast } = U();
      const lid = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      const lIdx = db.loans.findIndex(lx => lx.id === lid); if (lIdx === -1) return;
      confirmDialog({ title: "Return book?", message: "Mark as returned?" }).then(ok => {
        if (!ok) return;
        const l = db.loans[lIdx];
        const bIdx = db.books.findIndex(bx => bx.id === l.bookId);
        if (bIdx !== -1) db.books[bIdx].copiesAvailable = Math.min(db.books[bIdx].copiesTotal, (db.books[bIdx].copiesAvailable || 0) + 1);
        db.loans[lIdx].returnedAt = new Date().toISOString();
        window.LMS.storage.writeDb(db); toast("ok", "Returned", "Success."); rerender();
      });
    });
    $root.on("input.circ change.circ", "[data-circ]", function () {
      const k = String($(this).data("circ")); const v = String($(this).val() ?? "");
      if (k === "q") S().q = v; if (k === "filter") S().filter = v; if (k === "sort") S().sort = v;
      rerender();
    });
  }

  window.LMS = window.LMS || {};
  window.LMS.views = window.LMS.views || {};
  window.LMS.views.circulation = { render, mount, setError };
})();
