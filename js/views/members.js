/* global $, window */
/* Members view — render + validate + mount */
(function () {
  const U = () => window.LMS.utils;
  const S = () => window.LMS.state.members;
  const rerender = () => window.LMS.app.renderCurrent();

  /* ── State helpers ── */
  function setError(msg) { window.LMS.state.members.error = msg || ""; }
  function goList() { Object.assign(window.LMS.state.members, { mode: "list", editId: null, error: "", fieldErrors: {} }); }
  function goAdd() { Object.assign(window.LMS.state.members, { mode: "add", editId: null, error: "", fieldErrors: {} }); }
  function goEdit(memberId, db) {
    const found = db.members.find(m => m.id === memberId);
    if (!found) { setError("Member not found."); goList(); return; }
    Object.assign(window.LMS.state.members, { mode: "edit", editId: found.id, error: "", fieldErrors: {} });
  }

  /* ── Validation ── */
  function validate(input, db, { mode, editId }) {
    const { normalizeMemberCode, normalizeEmail } = U();
    const fe = {};
    const name = String(input.name || "").trim();
    const code = normalizeMemberCode(input.code);
    const email = normalizeEmail(input.email);
    const phone = String(input.phone || "").trim();

    if (!name) fe.name = "Full name is required.";
    if (!code) fe.code = "Member code is required.";
    if (!email) fe.email = "Email is required.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fe.email = "Invalid email format.";

    if (Object.keys(fe).length) return { ok: false, message: "Fix highlighted fields.", fieldErrors: fe };

    const codeTaken = db.members.some(m => (mode === "edit" && m.id === editId) ? false : normalizeMemberCode(m.code) === code);
    if (codeTaken) return { ok: false, message: "Code taken.", fieldErrors: { code: "Code taken." } };

    const emailTaken = db.members.some(m => (mode === "edit" && m.id === editId) ? false : normalizeEmail(m.email) === email);
    if (emailTaken) return { ok: false, message: "Email taken.", fieldErrors: { email: "Email taken." } };

    return { ok: true, value: { name, code, email, phone }, fieldErrors: {} };
  }

  /* ── Render ── */
  function render(db) {
    const { escapeHtml, norm, includesQ, renderFieldError } = U();
    const state = S();
    const q = norm(state.q);
    let members = [...db.members].filter(m => {
      const blob = `${m.name || ""} ${m.code || ""} ${m.email || ""} ${m.phone || ""}`;
      return includesQ(blob, q);
    });

    const sorters = {
      name_asc: (a, b) => (a.name || "").localeCompare(b.name || ""),
      code_asc: (a, b) => (a.code || "").localeCompare(b.code || ""),
      newest_desc: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    };
    members.sort(sorters[state.sort] || sorters.name_asc);

    const editing = state.mode === "edit" ? db.members.find(m => m.id === state.editId) : null;
    const formMem = state.mode === "add" ? { name: "", code: "", email: "", phone: "" } : editing || { name: "", code: "", email: "", phone: "" };
    const showForm = state.mode === "add" || state.mode === "edit";
    const fe = state.fieldErrors || {};

    const formHtml = `
      <form id="memberForm" autocomplete="off"><div class="formGrid">
        <div class="col-6"><div class="field__label">Full name *</div>
          <input class="input ${fe.name ? "is-invalid" : ""}" name="name" placeholder="e.g. Sita Karki" value="${escapeHtml(formMem.name)}" />
          ${renderFieldError(fe, "name")}</div>
        <div class="col-3"><div class="field__label">Code *</div>
          <input class="input ${fe.code ? "is-invalid" : ""}" name="code" placeholder="e.g. M-1003" value="${escapeHtml(formMem.code)}" />
          ${renderFieldError(fe, "code")}</div>
        <div class="col-3"><div class="field__label">Phone</div>
          <input class="input" name="phone" inputmode="tel" value="${escapeHtml(formMem.phone)}" /></div>
        <div class="col-6"><div class="field__label">Email *</div>
          <input class="input ${fe.email ? "is-invalid" : ""}" name="email" inputmode="email" value="${escapeHtml(formMem.email)}" />
          ${renderFieldError(fe, "email")}</div>
        <div class="col-6"><div class="field__label">Status</div><input class="input" disabled value="Active" /></div>
        <div class="col-12"><div class="row">
          <div class="muted">Phase 6+ improved UX.</div>
          <div class="toolbar">
            <button type="button" class="btn btn--ghost" data-action="members-cancel">Cancel</button>
            <button type="submit" class="btn btn--primary">${state.mode === "add" ? "Create member" : "Save changes"}</button>
          </div></div></div>
      </div></form>`;

    const listHtml = `
      <div class="controlRow">
        <div class="controlLeft"><div class="pill pill--ok">Showing: ${members.length}</div></div>
        <div class="controlRight"><button type="button" class="btn btn--ghost btn--sm" data-action="members-clear">Clear</button></div>
      </div>
      <div class="formGrid" style="margin-bottom:12px">
        <div class="col-6"><div class="field__label">Search</div><input class="input" data-members="q" placeholder="type to search…" value="${escapeHtml(state.q)}" /></div>
        <div class="col-3"><div class="field__label">Sort</div>
          <select class="select" data-members="sort">
            <option value="name_asc" ${state.sort === "name_asc" ? "selected" : ""}>Name (A→Z)</option>
            <option value="code_asc" ${state.sort === "code_asc" ? "selected" : ""}>Code (A→Z)</option>
            <option value="newest_desc" ${state.sort === "newest_desc" ? "selected" : ""}>Newest</option>
          </select></div>
         <div class="col-3"><div class="field__label">Action</div><button type="button" class="btn btn--primary btn--sm" data-action="members-add">+ Add member</button></div>
      </div>
      <div class="tableWrap"><table style="min-width: 820px"><thead><tr>
        <th>Name</th><th>Code</th><th>Email</th><th>Phone</th><th class="right">Actions</th>
      </tr></thead><tbody>
        ${members.length === 0 ? `<tr><td colspan="5" class="muted">No members found.</td></tr>` : members.map(m => {
          const activeCount = db.loans.filter(l => l.memberId === m.id && !l.returnedAt).length;
          return `<tr>
            <td>${escapeHtml(m.name)}<span class="sub">Active loans: <span class="pill ${activeCount > 0 ? "pill--warn" : "pill--ok"}">${activeCount}</span></span></td>
            <td class="mono">${escapeHtml(m.code)}</td><td>${escapeHtml(m.email)}</td><td class="mono">${escapeHtml(m.phone || "-")}</td>
            <td class="right"><div class="actions">
              <button type="button" class="btn btn--sm" data-action="members-edit" data-id="${escapeHtml(m.id)}">Edit</button>
              <button type="button" class="btn btn--sm btn--danger" data-action="members-delete" data-id="${escapeHtml(m.id)}">Delete</button>
            </div></td></tr>`;
        }).join("")}
      </tbody></table></div>`;

    return `
      <section class="card">
        <div class="card__header">
          <div><h1 class="card__title">Members</h1><div class="muted" style="margin-top:6px">Manage member profiles.</div></div>
          <div class="toolbar">${showForm ? `<button type="button" class="btn btn--ghost" data-action="members-cancel">Back</button>` : `<button type="button" class="btn btn--primary" data-action="members-add">+ Add</button>`}</div>
        </div>
        <div class="card__body">
          ${state.error ? `<div class="error" role="alert" style="margin-bottom:12px">${escapeHtml(state.error)}</div>` : ""}
          ${showForm ? formHtml : listHtml}
        </div>
      </section>`;
  }

  /* ── Mount ── */
  function mount($root) {
    $root.off("click.members").off("submit.members");
    $root.on("click.members", "[data-action='members-add']", () => { goAdd(); rerender(); });
    $root.on("click.members", "[data-action='members-cancel']", () => { goList(); rerender(); });
    $root.on("click.members", "[data-action='members-edit']", function () {
      goEdit(String($(this).data("id") || ""), window.LMS.storage.readDb()); rerender();
    });
    $root.on("click.members", "[data-action='members-delete']", function () {
      const { confirmDialog, toast } = U();
      const id = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      const mem = db.members.find(m => m.id === id); if (!mem) return;
      if (db.loans.some(l => l.memberId === id && !l.returnedAt)) { setError("Cannot delete member with active loans."); rerender(); return; }
      confirmDialog({ title: "Delete member?", message: `Delete "${mem.name}"?`, okText: "Delete", danger: true })
        .then(ok => { if (!ok) return; db.members = db.members.filter(m => m.id !== id); window.LMS.storage.writeDb(db); toast("ok", "Deleted", "Member removed."); goList(); rerender(); });
    });
    $root.on("submit.members", "#memberForm", function (e) {
      e.preventDefault();
      const { toast, firstKey } = U();
      const db = window.LMS.storage.readDb();
      const $f = $(this);
      const raw = { name: $f.find("[name='name']").val(), code: $f.find("[name='code']").val(), email: $f.find("[name='email']").val(), phone: $f.find("[name='phone']").val() };
      const { mode, editId } = S();
      const v = validate(raw, db, { mode, editId });
      if (!v.ok) { S().fieldErrors = v.fieldErrors; setError(v.message); toast("bad", "Error", v.message); rerender(); const k = firstKey(v.fieldErrors); if(k) $root.find(`[name='${k}']`).trigger("focus"); return; }
      setError(""); S().fieldErrors = {};
      if (mode === "add") {
        db.members.push({ id: window.LMS.storage.uid("mem"), ...v.value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        window.LMS.storage.writeDb(db); toast("ok", "Added", "Member created."); goList(); rerender();
      } else if (mode === "edit" && editId) {
        const idx = db.members.findIndex(m => m.id === editId);
        if (idx !== -1) { db.members[idx] = { ...db.members[idx], ...v.value, updatedAt: new Date().toISOString() }; window.LMS.storage.writeDb(db); toast("ok", "Saved", "Updated."); goList(); rerender(); }
      }
    });
    $root.on("input.members change.members", "[data-members]", function () {
      const k = String($(this).data("members")); const v = String($(this).val() ?? "");
      if (k === "q") S().q = v; if (k === "sort") S().sort = v; rerender();
    });
    $root.on("click.members", "[data-action='members-clear']", () => { Object.assign(S(), { q: "", sort: "name_asc" }); rerender(); });
  }

  window.LMS = window.LMS || {};
  window.LMS.views = window.LMS.views || {};
  window.LMS.views.members = { render, mount, goList, goAdd, goEdit, setError };
})();
