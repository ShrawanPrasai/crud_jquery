/* global $, window */
/* Dashboard view — render + mount */
(function () {
  const U = () => window.LMS.utils;
  const S = () => window.LMS.state;
  const rerender = () => window.LMS.app.renderCurrent();

  /* ── Import / Export helpers ── */
  function validateDbShape(db) {
    if (!db || typeof db !== "object") return { ok: false, message: "Invalid JSON (not an object)." };
    if (db.schemaVersion !== 1) return { ok: false, message: "Unsupported schema version." };
    if (!Array.isArray(db.books) || !Array.isArray(db.members) || !Array.isArray(db.loans))
      return { ok: false, message: "Invalid data shape (missing arrays)." };
    return { ok: true };
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function mergeById(existingArr, incomingArr) {
    const map = new Map(existingArr.map((x) => [x.id, x]));
    for (const item of incomingArr) {
      if (!item || !item.id) continue;
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values());
  }

  /* ── Render ── */
  function render(db) {
    const { escapeHtml, isOverdue, isoToYmd } = U();
    const totalTitles     = db.books.length;
    const totalCopies     = db.books.reduce((s, b) => s + (Number(b.copiesTotal)     || 0), 0);
    const availableCopies = db.books.reduce((s, b) => s + (Number(b.copiesAvailable) || 0), 0);
    const borrowedCopies  = totalCopies - availableCopies;
    const totalMembers    = db.members.length;
    const activeLoans     = db.loans.filter(l => !l.returnedAt);
    const overdueCount    = activeLoans.filter(l => isOverdue(l)).length;
    const activeCount     = activeLoans.length;
    const utilisationPct  = totalCopies > 0 ? Math.round((borrowedCopies / totalCopies) * 100) : 0;

    // Most-issued top 3
    const loanCountById = {};
    for (const l of db.loans) loanCountById[l.bookId] = (loanCountById[l.bookId] || 0) + 1;
    const topBooks = [...db.books]
      .map(b => ({ book: b, count: loanCountById[b.id] || 0 }))
      .filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);

    // Recent loans feed (last 5)
    const recentLoans = [...db.loans]
      .sort((a, b) => String(b.issuedAt || "").localeCompare(String(a.issuedAt || ""))).slice(0, 5);

    function statCard(icon, label, value, accent, sub) {
      return `<div class="dash-stat" style="--dash-accent:${accent}">
        <div class="dash-stat__icon">${icon}</div>
        <div class="dash-stat__body">
          <div class="dash-stat__label">${label}</div>
          <div class="dash-stat__value">${value}</div>
          ${sub ? `<div class="dash-stat__sub">${sub}</div>` : ""}
        </div></div>`;
    }

    const medals = ["🥇","🥈","🥉"];
    const lbRows = topBooks.length === 0
      ? `<div class="muted" style="padding:10px 0">No loans recorded yet.</div>`
      : topBooks.map((x, i) => `
          <div class="lb-row">
            <span class="lb-medal">${medals[i]}</span>
            <div class="lb-info">
              <div class="lb-title">${escapeHtml(x.book.title)}</div>
              <div class="lb-author muted">${escapeHtml(x.book.author)}</div>
            </div>
            <span class="pill pill--ok lb-count"><span class="mono">${x.count}</span> loans</span>
          </div>`).join("");

    const feedRows = recentLoans.length === 0
      ? `<div class="muted" style="padding:10px 0">No loan history yet.</div>`
      : recentLoans.map(l => {
          const member = db.members.find(m => m.id === l.memberId);
          const book   = db.books.find(b => b.id === l.bookId);
          const status = l.returnedAt
            ? `<span class="pill pill--ok" style="font-size:11px">Returned</span>`
            : isOverdue(l)
              ? `<span class="pill pill--bad" style="font-size:11px">Overdue</span>`
              : `<span class="pill pill--warn" style="font-size:11px">Active</span>`;
          return `<div class="feed-row">
            <div class="feed-info">
              <div class="feed-title">${escapeHtml(book ? book.title : "Unknown")}</div>
              <div class="feed-meta muted">${escapeHtml(member ? member.name : "Unknown")} · Issued ${escapeHtml(isoToYmd(l.issuedAt))} · Due ${escapeHtml(isoToYmd(l.dueAt))}</div>
            </div>${status}</div>`;
        }).join("");

    const barColor = utilisationPct > 80 ? "var(--danger)" : utilisationPct > 50 ? "var(--warning)" : "var(--accent2)";

    return `
      <section class="card">
        <div class="card__header">
          <div>
            <h1 class="card__title">Dashboard</h1>
            <div class="muted" style="margin-top:6px">Library at a glance — live from localStorage.</div>
          </div>
          <span class="pill pill--ok">localStorage connected</span>
        </div>
        <div class="card__body">
          <div class="dash-grid">
            ${statCard("📚","Book Titles",     totalTitles,     "var(--accent)",  `${totalCopies} total copies`)}
            ${statCard("🗂️","Available Copies",availableCopies, "var(--accent2)", `${borrowedCopies} currently out`)}
            ${statCard("👥","Active Members",  totalMembers,    "#7eb8ff",        `${totalMembers} registered`)}
            ${statCard("🔖","Active Loans",    activeCount,     "var(--warning)", `${db.loans.length} loans total`)}
            ${statCard("⚠️","Overdue",         overdueCount,    overdueCount > 0 ? "var(--danger)" : "var(--accent2)", overdueCount > 0 ? "Needs attention" : "All on time")}
            ${statCard("📊","Utilisation",     utilisationPct+"%","#c084fc",     `${borrowedCopies}/${totalCopies} copies out`)}
          </div>
          <div class="util-bar-wrap" style="margin-top:16px">
            <div class="util-bar-label">
              <span class="muted" style="font-size:12px">Collection utilisation</span>
              <span class="mono" style="font-size:12px">${utilisationPct}%</span>
            </div>
            <div class="util-bar-track"><div class="util-bar-fill" style="width:${utilisationPct}%;background:${barColor}"></div></div>
          </div>
          <div class="dash-panels" style="margin-top:16px">
            <div class="dash-panel"><div class="dash-panel__head">🏆 Most Issued Books</div>${lbRows}</div>
            <div class="dash-panel"><div class="dash-panel__head">🕒 Recent Loan Activity</div>${feedRows}</div>
          </div>
          <section class="card" style="margin-top:14px;background:rgba(0,0,0,0.10)">
            <div class="card__header" style="border-bottom-color:rgba(255,255,255,0.05)">
              <div>
                <div class="card__title" style="font-size:16px">Backup</div>
                <div class="muted" style="margin-top:6px">Export your data to JSON, or import it back later.</div>
              </div>
              <div class="toolbar"><button type="button" class="btn btn--primary" data-action="export-db">Export JSON</button></div>
            </div>
            <div class="card__body">
              <div class="formGrid">
                <div class="col-6">
                  <div class="field__label">Import JSON file</div>
                  <input class="input" type="file" id="importFile" accept="application/json" />
                  <div class="field__hint">Choose a file exported from this app.</div>
                </div>
                <div class="col-3">
                  <div class="field__label">Mode</div>
                  <select class="select" id="importMode">
                    <option value="replace">Replace (overwrite)</option>
                    <option value="merge">Merge (keep existing)</option>
                  </select>
                </div>
                <div class="col-3">
                  <div class="field__label">Import</div>
                  <button type="button" class="btn btn--ghost" data-action="import-db">Import</button>
                </div>
              </div>
              <div class="muted" style="margin-top:10px">Tip: Export before big changes so you can restore easily.</div>
            </div>
          </section>
        </div>
      </section>`;
  }

  /* ── Mount ── */
  function mount($root) {
    $root.off("click.dash");
    $root.on("click.dash", "[data-action='export-db']", function () {
      const db = window.LMS.storage.readDb();
      downloadJson(`lms_backup_${new Date().toISOString().slice(0,10)}.json`, db);
      U().toast("ok", "Exported", "Backup JSON downloaded.");
    });
    $root.on("click.dash", "[data-action='import-db']", function () {
      const fileInput = $("#importFile").get(0);
      const mode = String($("#importMode").val() || "replace");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!file) { U().toast("bad", "Import failed", "Please choose a JSON file first."); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          const v = validateDbShape(parsed);
          if (!v.ok) { U().toast("bad", "Import failed", v.message); return; }
          const ok = await U().confirmDialog({
            title: "Import backup?",
            message: mode === "replace" ? "Replace current data with this backup?" : "Merge backup into current data?",
            okText: "Import", danger: mode === "replace",
          });
          if (!ok) return;
          const current = window.LMS.storage.readDb();
          const next = mode === "merge"
            ? { ...current, books: mergeById(current.books, parsed.books), members: mergeById(current.members, parsed.members), loans: mergeById(current.loans, parsed.loans), schemaVersion: 1, createdAt: current.createdAt || parsed.createdAt }
            : parsed;
          window.LMS.storage.writeDb(next);
          U().toast("ok", "Imported", mode === "replace" ? "Data replaced." : "Backup merged.");
          rerender();
        } catch { U().toast("bad", "Import failed", "File is not valid JSON."); }
      };
      reader.readAsText(file);
    });
  }

  window.LMS = window.LMS || {};
  window.LMS.views = window.LMS.views || {};
  window.LMS.views.dashboard = { render, mount };
})();
