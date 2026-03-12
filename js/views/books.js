/* global $, window */
/* Books view — render + validate + mount */
(function () {
  const U   = () => window.LMS.utils;
  const S   = () => window.LMS.state.books;
  const rerender = () => window.LMS.app.renderCurrent();

  /* ── State helpers ── */
  function setError(msg) { window.LMS.state.books.error = msg || ""; }
  function goList()  { Object.assign(window.LMS.state.books, { mode:"list", editId:null, error:"", fieldErrors:{} }); }
  function goAdd()   { Object.assign(window.LMS.state.books, { mode:"add",  editId:null, error:"", fieldErrors:{} }); }
  function goEdit(bookId, db) {
    const found = db.books.find(b => b.id === bookId);
    if (!found) { setError("Book not found."); goList(); return; }
    Object.assign(window.LMS.state.books, { mode:"edit", editId:found.id, error:"", fieldErrors:{} });
  }

  /* ── Validation ── */
  function validate(input, db, { mode, editId }) {
    const { normalizeIsbn } = U();
    const fe = {};
    const title  = String(input.title  || "").trim();
    const author = String(input.author || "").trim();
    const isbn   = normalizeIsbn(input.isbn);
    const category = String(input.category || "").trim();
    const copiesTotal = Number(String(input.copiesTotal || "").trim());
    if (!title)    fe.title    = "Title is required.";
    if (!author)   fe.author   = "Author is required.";
    if (!isbn)     fe.isbn     = "ISBN is required.";
    if (isbn && !/^[0-9Xx-]+$/.test(isbn)) fe.isbn = "ISBN should contain only digits.";
    if (!category) fe.category = "Category is required.";
    if (!Number.isFinite(copiesTotal) || !Number.isInteger(copiesTotal) || copiesTotal <= 0)
      fe.copiesTotal = "Total copies must be a positive whole number.";
    if (Object.keys(fe).length) return { ok:false, message:"Please fix the highlighted fields.", fieldErrors:fe };
    const isbnTaken = db.books.some(b => (mode==="edit" && b.id===editId) ? false : normalizeIsbn(b.isbn)===isbn);
    if (isbnTaken) return { ok:false, message:"ISBN already exists.", fieldErrors:{ isbn:"ISBN already exists." } };
    return { ok:true, value:{ title, author, isbn, category, copiesTotal }, fieldErrors:{} };
  }

  /* ── Render ── */
  function render(db) {
    const { escapeHtml, norm, includesQ, renderFieldError, bookBorrowedCount } = U();
    const state = S();
    const q = norm(state.q);
    const categories = Array.from(new Set(db.books.map(b => String(b.category||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
    let books = [...db.books];
    if (state.availability === "available") books = books.filter(b => (Number(b.copiesAvailable)||0) > 0);
    if (state.availability === "out")       books = books.filter(b => (Number(b.copiesAvailable)||0) <= 0);
    if (state.category !== "all") books = books.filter(b => String(b.category||"").trim() === state.category);
    books = books.filter(b => includesQ(`${b.title||""} ${b.author||""} ${b.isbn||""} ${b.category||""}`, q));
    const sorters = {
      title_asc:  (a,b) => (a.title||"").localeCompare(b.title||""),
      author_asc: (a,b) => (a.author||"").localeCompare(b.author||""),
      copies_desc:(a,b) => (Number(b.copiesAvailable)||0)-(Number(a.copiesAvailable)||0),
      newest_desc:(a,b) => String(b.createdAt||"").localeCompare(String(a.createdAt||"")),
    };
    books.sort(sorters[state.sort] || sorters.title_asc);
    const editing   = state.mode==="edit" && state.editId ? db.books.find(b=>b.id===state.editId) : null;
    const formBook  = state.mode==="add" ? {title:"",author:"",isbn:"",category:"",copiesTotal:1} : editing || {title:"",author:"",isbn:"",category:"",copiesTotal:1};
    const showForm  = state.mode==="add" || state.mode==="edit";
    const borrowed  = editing ? bookBorrowedCount(editing) : 0;
    const fe        = state.fieldErrors || {};

    const formHtml = `
      <form id="bookForm" autocomplete="off"><div class="formGrid">
        <div class="col-6"><div class="field__label">Title *</div>
          <input class="input ${fe.title?"is-invalid":""}" name="title" placeholder="e.g. Atomic Habits" value="${escapeHtml(formBook.title)}" />
          ${renderFieldError(fe,"title")}</div>
        <div class="col-6"><div class="field__label">Author *</div>
          <input class="input ${fe.author?"is-invalid":""}" name="author" placeholder="e.g. James Clear" value="${escapeHtml(formBook.author)}" />
          ${renderFieldError(fe,"author")}</div>
        <div class="col-6"><div class="field__label">ISBN *</div>
          <input class="input ${fe.isbn?"is-invalid":""}" name="isbn" placeholder="numbers only" value="${escapeHtml(formBook.isbn)}" ${state.mode==="edit"?`data-original-isbn="${escapeHtml(formBook.isbn)}"`:""}/>
          <div class="field__hint">Must be unique.</div>${renderFieldError(fe,"isbn")}</div>
        <div class="col-3"><div class="field__label">Category *</div>
          <input class="input ${fe.category?"is-invalid":""}" name="category" placeholder="e.g. Programming" value="${escapeHtml(formBook.category)}" />
          ${renderFieldError(fe,"category")}</div>
        <div class="col-3"><div class="field__label">Total copies *</div>
          <input class="input ${fe.copiesTotal?"is-invalid":""}" name="copiesTotal" inputmode="numeric" placeholder="e.g. 3" value="${escapeHtml(formBook.copiesTotal)}" />
          ${state.mode==="edit"?`<div class="field__hint">Borrowed now: <span class="mono">${borrowed}</span></div>`:""}
          ${renderFieldError(fe,"copiesTotal")}</div>
        <div class="col-12"><div class="row">
          <div class="muted">${state.mode==="add"?"Adding sets available = total.":"Editing keeps borrowed copies safe."}</div>
          <div class="toolbar">
            <button type="button" class="btn btn--ghost" data-action="books-cancel">Cancel</button>
            <button type="submit" class="btn btn--primary">${state.mode==="add"?"Create book":"Save changes"}</button>
          </div></div></div>
      </div></form>`;

    const listHtml = `
      <div class="controlRow">
        <div class="controlLeft">
          <div class="pill pill--ok">Showing: <span class="mono">${books.length}</span></div>
          <span class="muted">Search with</span> <span class="kbd">Title</span> <span class="muted">/</span> <span class="kbd">Author</span> <span class="muted">/</span> <span class="kbd">ISBN</span>
        </div>
        <div class="controlRight"><button type="button" class="btn btn--ghost btn--sm" data-action="books-clear">Clear</button></div>
      </div>
      <div class="formGrid" style="margin-bottom:12px">
        <div class="col-6"><div class="field__label">Search</div><input class="input" data-books="q" placeholder="type to search…" value="${escapeHtml(state.q)}" /></div>
        <div class="col-3"><div class="field__label">Availability</div>
          <select class="select" data-books="availability">
            <option value="all" ${state.availability==="all"?"selected":""}>All</option>
            <option value="available" ${state.availability==="available"?"selected":""}>Available only</option>
            <option value="out" ${state.availability==="out"?"selected":""}>Out of stock</option>
          </select></div>
        <div class="col-3"><div class="field__label">Category</div>
          <select class="select" data-books="category">
            <option value="all" ${state.category==="all"?"selected":""}>All</option>
            ${categories.map(c=>`<option value="${escapeHtml(c)}" ${state.category===c?"selected":""}>${escapeHtml(c)}</option>`).join("")}
          </select></div>
        <div class="col-3"><div class="field__label">Sort</div>
          <select class="select" data-books="sort">
            <option value="title_asc"  ${state.sort==="title_asc" ?"selected":""}>Title (A→Z)</option>
            <option value="author_asc" ${state.sort==="author_asc"?"selected":""}>Author (A→Z)</option>
            <option value="copies_desc"${state.sort==="copies_desc"?"selected":""}>Available (high→low)</option>
            <option value="newest_desc"${state.sort==="newest_desc"?"selected":""}>Newest</option>
          </select></div>
      </div>
      <div class="tableWrap"><table aria-label="Books table"><thead><tr>
        <th style="min-width:240px">Title</th><th style="min-width:200px">Author</th>
        <th style="min-width:170px">ISBN</th><th style="min-width:160px">Category</th>
        <th class="right" style="min-width:130px">Copies</th><th class="right" style="min-width:180px">Actions</th>
      </tr></thead><tbody>
        ${books.length===0
          ? `<tr><td colspan="6" class="muted">No books yet. Click "Add book".</td></tr>`
          : books.map(b => {
              const avail = Number(b.copiesAvailable)||0;
              return `<tr>
                <td>${escapeHtml(b.title)}<span class="sub">Added: <span class="mono">${escapeHtml(String(b.createdAt||"").slice(0,10))}</span></span></td>
                <td>${escapeHtml(b.author)}</td><td class="mono">${escapeHtml(b.isbn)}</td><td>${escapeHtml(b.category)}</td>
                <td class="right"><span class="pill ${avail>0?"pill--ok":"pill--bad"}">${avail>0?"Available":"Out"}: <span class="mono">${avail}</span></span><span class="sub">Total: <span class="mono">${Number(b.copiesTotal)||0}</span></span></td>
                <td class="right"><div class="actions">
                  <button type="button" class="btn btn--sm" data-action="books-edit" data-id="${escapeHtml(b.id)}">Edit</button>
                  <button type="button" class="btn btn--sm btn--danger" data-action="books-delete" data-id="${escapeHtml(b.id)}">Delete</button>
                </div></td></tr>`;
            }).join("")}
      </tbody></table></div>`;

    return `
      <section class="card" id="booksScreen">
        <div class="card__header">
          <div><h1 class="card__title">Books</h1><div class="muted" style="margin-top:6px">Manage titles, authors, ISBN and copy counts.</div></div>
          <div class="toolbar">${showForm
            ? `<button type="button" class="btn btn--ghost" data-action="books-cancel">Back to list</button>`
            : `<button type="button" class="btn btn--primary" data-action="books-add">+ Add book</button>`}</div>
        </div>
        <div class="card__body">
          ${state.error ? `<div class="error" role="alert" style="margin-bottom:12px">${escapeHtml(state.error)}</div>` : ""}
          ${showForm ? formHtml : listHtml}
        </div>
      </section>`;
  }

  /* ── Mount ── */
  function mount($root) {
    $root.off("click.books").off("submit.books");
    $root.on("click.books","[data-action='books-add']",    () => { goAdd(); rerender(); });
    $root.on("click.books","[data-action='books-cancel']", () => { goList(); rerender(); });
    $root.on("click.books","[data-action='books-edit']", function () {
      goEdit(String($(this).data("id")||""), window.LMS.storage.readDb()); rerender();
    });
    $root.on("click.books","[data-action='books-delete']", function () {
      const { confirmDialog, toast } = U();
      const id = String($(this).data("id")||"");
      const db = window.LMS.storage.readDb();
      const book = db.books.find(b=>b.id===id); if (!book) return;
      if (db.loans.some(l=>l.bookId===id && !l.returnedAt)) { setError("Cannot delete: book has active loans."); rerender(); return; }
      confirmDialog({ title:"Delete book?", message:`Delete "${book.title}"? This cannot be undone.`, okText:"Delete", danger:true })
        .then(ok => { if (!ok) return; db.books=db.books.filter(b=>b.id!==id); window.LMS.storage.writeDb(db); toast("ok","Deleted","Book removed."); goList(); rerender(); });
    });
    $root.on("submit.books","#bookForm", function (e) {
      e.preventDefault();
      const { toast, firstKey } = U();
      const db = window.LMS.storage.readDb();
      const $f = $(this);
      const raw = { title:$f.find("[name='title']").val(), author:$f.find("[name='author']").val(), isbn:$f.find("[name='isbn']").val(), category:$f.find("[name='category']").val(), copiesTotal:$f.find("[name='copiesTotal']").val() };
      const { mode, editId } = window.LMS.state.books;
      const v = validate(raw, db, { mode, editId });
      if (!v.ok) { window.LMS.state.books.fieldErrors=v.fieldErrors||{}; setError(v.message); toast("bad","Fix errors",v.message); rerender(); const k=firstKey(window.LMS.state.books.fieldErrors); if(k) window.setTimeout(()=>$root.find(`[name='${k}']`).trigger("focus"),0); return; }
      setError(""); window.LMS.state.books.fieldErrors={};
      if (mode==="add") {
        db.books.push({ id:window.LMS.storage.uid("book"), ...v.value, copiesAvailable:v.value.copiesTotal, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
        window.LMS.storage.writeDb(db); toast("ok","Book added",`"${v.value.title}" created.`); goList(); rerender(); return;
      }
      if (mode==="edit" && editId) {
        const { bookBorrowedCount } = U();
        const idx=db.books.findIndex(b=>b.id===editId);
        if (idx===-1) { setError("Book not found."); goList(); rerender(); return; }
        const borrowed=bookBorrowedCount(db.books[idx]);
        if (v.value.copiesTotal<borrowed) { window.LMS.state.books.fieldErrors={copiesTotal:`Cannot be less than borrowed (${borrowed}).`}; setError(`Total copies < borrowed (${borrowed}).`); toast("bad","Fix errors","Total copies is too low."); rerender(); return; }
        db.books[idx]={ ...db.books[idx], ...v.value, copiesAvailable:Math.max(0,v.value.copiesTotal-borrowed), updatedAt:new Date().toISOString() };
        window.LMS.storage.writeDb(db); toast("ok","Saved","Book updated."); goList(); rerender();
      }
    });
    $root.on("input.books change.books","[data-books]", function () {
      const key=String($(this).data("books")); const val=String($(this).val()??"");
      if(key==="q") window.LMS.state.books.q=val;
      if(key==="availability") window.LMS.state.books.availability=val;
      if(key==="category") window.LMS.state.books.category=val;
      if(key==="sort") window.LMS.state.books.sort=val;
      rerender();
    });
    $root.on("click.books","[data-action='books-clear']", () => {
      Object.assign(window.LMS.state.books,{q:"",availability:"all",category:"all",sort:"title_asc"}); rerender();
    });
  }

  window.LMS = window.LMS || {};
  window.LMS.views = window.LMS.views || {};
  window.LMS.views.books = { render, mount, goList, goAdd, goEdit, setError };
})();
