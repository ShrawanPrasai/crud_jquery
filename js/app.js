/* global $, window */
(function () {
  const ROUTES = ["dashboard", "books", "members", "circulation"];
  const UI = {
    books: {
      mode: "list", // list | add | edit
      editId: null,
      error: "",
      fieldErrors: {},
      q: "",
      sort: "title_asc",
      availability: "all", // all | available | out
      category: "all",
    },
    members: {
      mode: "list", // list | add | edit
      editId: null,
      error: "",
      fieldErrors: {},
      q: "",
      sort: "name_asc",
    },
    circulation: {
      error: "",
      fieldErrors: {},
      q: "",
      filter: "all", // all | overdue
      sort: "due_asc", // due_asc | due_desc | issued_desc
    },
  };

  function setActiveRoute(route) {
    $(".nav__btn").removeClass("is-active");
    $(`.nav__btn[data-route="${route}"]`).addClass("is-active");
  }

  function renderDashboard(db) {
    const totalTitles = db.books.length;
    const totalCopies = db.books.reduce((sum, b) => sum + (Number(b.copiesTotal) || 0), 0);
    const availableCopies = db.books.reduce((sum, b) => sum + (Number(b.copiesAvailable) || 0), 0);
    const members = db.members.length;
    const activeLoans = db.loans.filter((l) => !l.returnedAt).length;

    return `
      <section class="card">
        <div class="card__header">
          <h1 class="card__title">Dashboard</h1>
          <span class="pill pill--ok">localStorage connected</span>
        </div>
        <div class="card__body">
          <div class="grid">
            <div class="stat">
              <div class="stat__label">Book titles</div>
              <div class="stat__value">${totalTitles}</div>
            </div>
            <div class="stat">
              <div class="stat__label">Total copies</div>
              <div class="stat__value">${totalCopies}</div>
            </div>
            <div class="stat">
              <div class="stat__label">Available copies</div>
              <div class="stat__value">${availableCopies}</div>
            </div>
            <div class="stat">
              <div class="stat__label">Members</div>
              <div class="stat__value">${members}</div>
            </div>
          </div>

          <div class="row" style="margin-top:14px">
            <p class="muted" style="margin:0">
              Active loans: <span class="mono">${activeLoans}</span>
            </p>
            <span class="pill pill--warn">Phase 7: Import/Export backup</span>
          </div>

          <section class="card" style="margin-top:12px; background: rgba(0,0,0,0.10)">
            <div class="card__header" style="border-bottom-color: rgba(255,255,255,0.05)">
              <div>
                <div class="card__title" style="font-size:16px">Backup</div>
                <div class="muted" style="margin-top:6px">Export your data to JSON, or import it back later.</div>
              </div>
              <div class="toolbar">
                <button type="button" class="btn btn--primary" data-action="export-db">Export JSON</button>
              </div>
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
              <div class="muted" style="margin-top:10px">
                Tip: Use Export before big changes, so you can restore easily.
              </div>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function renderPlaceholder(title, hint) {
    return `
      <section class="card">
        <div class="card__header">
          <h1 class="card__title">${title}</h1>
          <span class="pill pill--warn">Phase 1 placeholder</span>
        </div>
        <div class="card__body">
          <p class="muted">${hint}</p>
        </div>
      </section>
    `;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(type, title, msg) {
    const $host = $("#toastHost");
    if ($host.length === 0) return;
    const cls = type === "ok" ? "toast--ok" : type === "warn" ? "toast--warn" : "toast--bad";
    const $t = $(`
      <div class="toast ${cls}" role="status">
        <div class="toast__title"></div>
        <div class="toast__msg"></div>
      </div>
    `);
    $t.find(".toast__title").text(title || "");
    $t.find(".toast__msg").text(msg || "");
    $host.append($t);
    window.setTimeout(() => {
      $t.fadeOut(160, () => $t.remove());
    }, 2600);
  }

  function confirmDialog({ title, message, okText, danger } = {}) {
    const $host = $("#modalHost");
    if ($host.length === 0) {
      return Promise.resolve(window.confirm(message || "Are you sure?"));
    }

    const $ok = $("#modalOkBtn");
    const $cancel = $("#modalCancelBtn");

    $("#modalTitle").text(title || "Confirm");
    $("#modalDesc").text(message || "Are you sure?");
    $ok.text(okText || "Confirm");
    $ok.toggleClass("btn--danger", Boolean(danger));
    $ok.toggleClass("btn--primary", !danger);

    $host.removeClass("is-hidden").attr("aria-hidden", "false");

    return new Promise((resolve) => {
      let done = false;
      function finish(v) {
        if (done) return;
        done = true;
        $host.addClass("is-hidden").attr("aria-hidden", "true");
        $host.off("click.modal keydown.modal");
        $ok.off("click.modal");
        $cancel.off("click.modal");
        resolve(v);
      }

      $ok.on("click.modal", () => finish(true));
      $cancel.on("click.modal", () => finish(false));
      $host.on("click.modal", "[data-action='modal-close']", () => finish(false));
      $host.on("keydown.modal", (e) => {
        if (e.key === "Escape") finish(false);
      });

      // Focus the safer option first
      window.setTimeout(() => $cancel.trigger("focus"), 0);
    });
  }

  function firstKey(obj) {
    if (!obj) return null;
    const keys = Object.keys(obj);
    return keys.length ? keys[0] : null;
  }

  function renderFieldError(errors, key) {
    const msg = errors && errors[key] ? String(errors[key]) : "";
    if (!msg) return "";
    return `<div class="fieldError" role="alert">${escapeHtml(msg)}</div>`;
  }

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function includesQ(haystack, q) {
    if (!q) return true;
    return norm(haystack).includes(q);
  }

  function bookBorrowedCount(book) {
    const total = Number(book.copiesTotal) || 0;
    const avail = Number(book.copiesAvailable) || 0;
    return Math.max(0, total - avail);
  }

  function renderBooks(db) {
    const state = UI.books;
    const q = norm(state.q);
    const categories = Array.from(new Set(db.books.map((b) => String(b.category || "").trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

    let books = [...db.books];

    if (state.availability === "available") books = books.filter((b) => (Number(b.copiesAvailable) || 0) > 0);
    if (state.availability === "out") books = books.filter((b) => (Number(b.copiesAvailable) || 0) <= 0);
    if (state.category !== "all") books = books.filter((b) => String(b.category || "").trim() === state.category);

    books = books.filter((b) => {
      const blob = `${b.title || ""} ${b.author || ""} ${b.isbn || ""} ${b.category || ""}`;
      return includesQ(blob, q);
    });

    const sorters = {
      title_asc: (a, b) => (a.title || "").localeCompare(b.title || ""),
      author_asc: (a, b) => (a.author || "").localeCompare(b.author || ""),
      copies_desc: (a, b) => (Number(b.copiesAvailable) || 0) - (Number(a.copiesAvailable) || 0),
      newest_desc: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    };
    books.sort(sorters[state.sort] || sorters.title_asc);
    const editing = state.mode === "edit" && state.editId ? db.books.find((b) => b.id === state.editId) : null;

    const formBook =
      state.mode === "add"
        ? { title: "", author: "", isbn: "", category: "", copiesTotal: 1 }
        : editing || { title: "", author: "", isbn: "", category: "", copiesTotal: 1 };

    const showForm = state.mode === "add" || state.mode === "edit";
    const borrowed = editing ? bookBorrowedCount(editing) : 0;
    const fe = state.fieldErrors || {};

    return `
      <section class="card" id="booksScreen">
        <div class="card__header">
          <div>
            <h1 class="card__title">Books</h1>
            <div class="muted" style="margin-top:6px">Manage titles, authors, ISBN and copy counts.</div>
          </div>
          <div class="toolbar">
            ${
              showForm
                ? `
                  <button type="button" class="btn btn--ghost" data-action="books-cancel">Back to list</button>
                `
                : `
                  <button type="button" class="btn btn--primary" data-action="books-add">+ Add book</button>
                `
            }
          </div>
        </div>

        <div class="card__body">
          ${
            state.error
              ? `<div class="error" role="alert" style="margin-bottom:12px">${escapeHtml(state.error)}</div>`
              : ""
          }

          ${
            showForm
              ? `
                <form id="bookForm" autocomplete="off">
                  <div class="formGrid">
                    <div class="col-6">
                      <div class="field__label">Title *</div>
                      <input class="input ${fe.title ? "is-invalid" : ""}" name="title" placeholder="e.g. Atomic Habits" value="${escapeHtml(
                        formBook.title
                      )}" />
                      ${renderFieldError(fe, "title")}
                    </div>
                    <div class="col-6">
                      <div class="field__label">Author *</div>
                      <input class="input ${fe.author ? "is-invalid" : ""}" name="author" placeholder="e.g. James Clear" value="${escapeHtml(
                        formBook.author
                      )}" />
                      ${renderFieldError(fe, "author")}
                    </div>
                    <div class="col-6">
                      <div class="field__label">ISBN *</div>
                      <input class="input ${fe.isbn ? "is-invalid" : ""}" name="isbn" placeholder="numbers only (no spaces)" value="${escapeHtml(
                        formBook.isbn
                      )}" ${state.mode === "edit" ? `data-original-isbn="${escapeHtml(formBook.isbn)}"` : ""} />
                      <div class="field__hint">Must be unique.</div>
                      ${renderFieldError(fe, "isbn")}
                    </div>
                    <div class="col-3">
                      <div class="field__label">Category *</div>
                      <input class="input ${fe.category ? "is-invalid" : ""}" name="category" placeholder="e.g. Programming" value="${escapeHtml(
                        formBook.category
                      )}" />
                      ${renderFieldError(fe, "category")}
                    </div>
                    <div class="col-3">
                      <div class="field__label">Total copies *</div>
                      <input class="input ${fe.copiesTotal ? "is-invalid" : ""}" name="copiesTotal" inputmode="numeric" placeholder="e.g. 3" value="${escapeHtml(
                        formBook.copiesTotal
                      )}" />
                      ${
                        state.mode === "edit"
                          ? `<div class="field__hint">Borrowed now: <span class="mono">${borrowed}</span></div>`
                          : ""
                      }
                      ${renderFieldError(fe, "copiesTotal")}
                    </div>

                    <div class="col-12">
                      <div class="row">
                        <div class="muted">
                          ${state.mode === "add" ? "Adding a new book creates available copies = total copies." : "Editing keeps borrowed copies safe."}
                        </div>
                        <div class="toolbar">
                          <button type="button" class="btn btn--ghost" data-action="books-cancel">Cancel</button>
                          <button type="submit" class="btn btn--primary">${state.mode === "add" ? "Create book" : "Save changes"}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              `
              : `
                <div class="controlRow">
                  <div class="controlLeft">
                    <div class="pill pill--ok">Showing: <span class="mono">${books.length}</span></div>
                    <span class="muted">Search with</span> <span class="kbd">Title</span> <span class="muted">/</span> <span class="kbd">Author</span> <span class="muted">/</span> <span class="kbd">ISBN</span>
                  </div>
                  <div class="controlRight">
                    <button type="button" class="btn btn--ghost btn--sm" data-action="books-clear">Clear</button>
                  </div>
                </div>

                <div class="formGrid" style="margin-bottom:12px">
                  <div class="col-6">
                    <div class="field__label">Search</div>
                    <input class="input" data-books="q" placeholder="type to search…" value="${escapeHtml(state.q)}" />
                  </div>
                  <div class="col-3">
                    <div class="field__label">Availability</div>
                    <select class="select" data-books="availability">
                      <option value="all" ${state.availability === "all" ? "selected" : ""}>All</option>
                      <option value="available" ${state.availability === "available" ? "selected" : ""}>Available only</option>
                      <option value="out" ${state.availability === "out" ? "selected" : ""}>Out of stock</option>
                    </select>
                  </div>
                  <div class="col-3">
                    <div class="field__label">Category</div>
                    <select class="select" data-books="category">
                      <option value="all" ${state.category === "all" ? "selected" : ""}>All</option>
                      ${categories
                        .map((c) => `<option value="${escapeHtml(c)}" ${state.category === c ? "selected" : ""}>${escapeHtml(c)}</option>`)
                        .join("")}
                    </select>
                  </div>
                  <div class="col-3">
                    <div class="field__label">Sort</div>
                    <select class="select" data-books="sort">
                      <option value="title_asc" ${state.sort === "title_asc" ? "selected" : ""}>Title (A→Z)</option>
                      <option value="author_asc" ${state.sort === "author_asc" ? "selected" : ""}>Author (A→Z)</option>
                      <option value="copies_desc" ${state.sort === "copies_desc" ? "selected" : ""}>Available (high→low)</option>
                      <option value="newest_desc" ${state.sort === "newest_desc" ? "selected" : ""}>Newest</option>
                    </select>
                  </div>
                </div>

                <div class="tableWrap">
                  <table aria-label="Books table">
                    <thead>
                      <tr>
                        <th style="min-width:240px">Title</th>
                        <th style="min-width:200px">Author</th>
                        <th style="min-width:170px">ISBN</th>
                        <th style="min-width:160px">Category</th>
                        <th class="right" style="min-width:130px">Copies</th>
                        <th class="right" style="min-width:180px">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        books.length === 0
                          ? `<tr><td colspan="6" class="muted">No books yet. Click “Add book”.</td></tr>`
                          : books
                              .map((b) => {
                                const total = Number(b.copiesTotal) || 0;
                                const avail = Number(b.copiesAvailable) || 0;
                                const statusClass = avail > 0 ? "pill--ok" : "pill--bad";
                                const statusText = avail > 0 ? "Available" : "Out";
                                return `
                                  <tr>
                                    <td>
                                      ${escapeHtml(b.title)}
                                      <span class="sub">Added: <span class="mono">${escapeHtml(
                                        String(b.createdAt || "").slice(0, 10)
                                      )}</span></span>
                                    </td>
                                    <td>${escapeHtml(b.author)}</td>
                                    <td class="mono">${escapeHtml(b.isbn)}</td>
                                    <td>${escapeHtml(b.category)}</td>
                                    <td class="right">
                                      <span class="pill ${statusClass}">${statusText}: <span class="mono">${avail}</span></span>
                                      <span class="sub">Total: <span class="mono">${total}</span></span>
                                    </td>
                                    <td class="right">
                                      <div class="actions">
                                        <button type="button" class="btn btn--sm" data-action="books-edit" data-id="${escapeHtml(
                                          b.id
                                        )}">Edit</button>
                                        <button type="button" class="btn btn--sm btn--danger" data-action="books-delete" data-id="${escapeHtml(
                                          b.id
                                        )}">Delete</button>
                                      </div>
                                    </td>
                                  </tr>
                                `;
                              })
                              .join("")
                      }
                    </tbody>
                  </table>
                </div>
              `
          }
        </div>
      </section>
    `;
  }

  function renderMembers(db) {
    const state = UI.members;
    const q = norm(state.q);
    let members = [...db.members].filter((m) => {
      const blob = `${m.name || ""} ${m.code || ""} ${m.email || ""} ${m.phone || ""}`;
      return includesQ(blob, q);
    });

    const sorters = {
      name_asc: (a, b) => (a.name || "").localeCompare(b.name || ""),
      code_asc: (a, b) => (a.code || "").localeCompare(b.code || ""),
      newest_desc: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    };
    members.sort(sorters[state.sort] || sorters.name_asc);
    const editing = state.mode === "edit" && state.editId ? db.members.find((m) => m.id === state.editId) : null;

    const formMember =
      state.mode === "add"
        ? { name: "", code: "", email: "", phone: "" }
        : editing || { name: "", code: "", email: "", phone: "" };

    const showForm = state.mode === "add" || state.mode === "edit";
    const fe = state.fieldErrors || {};

    return `
      <section class="card" id="membersScreen">
        <div class="card__header">
          <div>
            <h1 class="card__title">Members</h1>
            <div class="muted" style="margin-top:6px">Manage member profiles and identifiers.</div>
          </div>
          <div class="toolbar">
            ${
              showForm
                ? `
                  <button type="button" class="btn btn--ghost" data-action="members-cancel">Back to list</button>
                `
                : `
                  <button type="button" class="btn btn--primary" data-action="members-add">+ Add member</button>
                `
            }
          </div>
        </div>

        <div class="card__body">
          ${
            state.error
              ? `<div class="error" role="alert" style="margin-bottom:12px">${escapeHtml(state.error)}</div>`
              : ""
          }

          ${
            showForm
              ? `
                <form id="memberForm" autocomplete="off">
                  <div class="formGrid">
                    <div class="col-6">
                      <div class="field__label">Full name *</div>
                      <input class="input ${fe.name ? "is-invalid" : ""}" name="name" placeholder="e.g. Sita Karki" value="${escapeHtml(
                        formMember.name
                      )}" />
                      ${renderFieldError(fe, "name")}
                    </div>
                    <div class="col-3">
                      <div class="field__label">Member code *</div>
                      <input class="input ${fe.code ? "is-invalid" : ""}" name="code" placeholder="e.g. M-1003" value="${escapeHtml(
                        formMember.code
                      )}" />
                      <div class="field__hint">Must be unique.</div>
                      ${renderFieldError(fe, "code")}
                    </div>
                    <div class="col-3">
                      <div class="field__label">Phone</div>
                      <input class="input" name="phone" inputmode="tel" placeholder="e.g. 98xxxxxxxx" value="${escapeHtml(
                        formMember.phone
                      )}" />
                    </div>

                    <div class="col-6">
                      <div class="field__label">Email *</div>
                      <input class="input ${fe.email ? "is-invalid" : ""}" name="email" inputmode="email" placeholder="e.g. user@example.com" value="${escapeHtml(
                        formMember.email
                      )}" />
                      <div class="field__hint">Must be unique.</div>
                      ${renderFieldError(fe, "email")}
                    </div>
                    <div class="col-6">
                      <div class="field__label">Notes</div>
                      <input class="input" disabled value="Phase 6: improved UX + richer profiles" />
                    </div>

                    <div class="col-12">
                      <div class="row">
                        <div class="muted">
                          ${state.mode === "add" ? "Add a member so you can issue books in Phase 4." : "Update member details safely."}
                        </div>
                        <div class="toolbar">
                          <button type="button" class="btn btn--ghost" data-action="members-cancel">Cancel</button>
                          <button type="submit" class="btn btn--primary">${state.mode === "add" ? "Create member" : "Save changes"}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              `
              : `
                <div class="controlRow">
                  <div class="controlLeft">
                    <div class="pill pill--ok">Showing: <span class="mono">${members.length}</span></div>
                    <span class="muted">Search by</span> <span class="kbd">Name</span> <span class="muted">/</span> <span class="kbd">Code</span> <span class="muted">/</span> <span class="kbd">Email</span>
                  </div>
                  <div class="controlRight">
                    <button type="button" class="btn btn--ghost btn--sm" data-action="members-clear">Clear</button>
                  </div>
                </div>

                <div class="formGrid" style="margin-bottom:12px">
                  <div class="col-6">
                    <div class="field__label">Search</div>
                    <input class="input" data-members="q" placeholder="type to search…" value="${escapeHtml(state.q)}" />
                  </div>
                  <div class="col-3">
                    <div class="field__label">Sort</div>
                    <select class="select" data-members="sort">
                      <option value="name_asc" ${state.sort === "name_asc" ? "selected" : ""}>Name (A→Z)</option>
                      <option value="code_asc" ${state.sort === "code_asc" ? "selected" : ""}>Code (A→Z)</option>
                      <option value="newest_desc" ${state.sort === "newest_desc" ? "selected" : ""}>Newest</option>
                    </select>
                  </div>
                  <div class="col-3">
                    <div class="field__label">Quick actions</div>
                    <button type="button" class="btn btn--primary btn--sm" data-action="members-add">+ Add member</button>
                  </div>
                </div>

                <div class="tableWrap">
                  <table aria-label="Members table" style="min-width: 820px">
                    <thead>
                      <tr>
                        <th style="min-width:220px">Name</th>
                        <th style="min-width:140px">Code</th>
                        <th style="min-width:220px">Email</th>
                        <th style="min-width:160px">Phone</th>
                        <th class="right" style="min-width:180px">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        members.length === 0
                          ? `<tr><td colspan="5" class="muted">No members yet. Click “Add member”.</td></tr>`
                          : members
                              .map((m) => {
                                const activeLoans = db.loans.filter((l) => l.memberId === m.id && !l.returnedAt).length;
                                const pillClass = activeLoans > 0 ? "pill--warn" : "pill--ok";
                                return `
                                  <tr>
                                    <td>
                                      ${escapeHtml(m.name)}
                                      <span class="sub">Active loans: <span class="pill ${pillClass}"><span class="mono">${activeLoans}</span></span></span>
                                    </td>
                                    <td class="mono">${escapeHtml(m.code)}</td>
                                    <td>${escapeHtml(m.email)}</td>
                                    <td class="mono">${escapeHtml(m.phone || "-")}</td>
                                    <td class="right">
                                      <div class="actions">
                                        <button type="button" class="btn btn--sm" data-action="members-edit" data-id="${escapeHtml(
                                          m.id
                                        )}">Edit</button>
                                        <button type="button" class="btn btn--sm btn--danger" data-action="members-delete" data-id="${escapeHtml(
                                          m.id
                                        )}">Delete</button>
                                      </div>
                                    </td>
                                  </tr>
                                `;
                              })
                              .join("")
                      }
                    </tbody>
                  </table>
                </div>
              `
          }
        </div>
      </section>
    `;
  }

  function isoToYmd(iso) {
    if (!iso) return "";
    return String(iso).slice(0, 10);
  }

  function addDaysYmd(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function isOverdue(loan) {
    if (!loan || loan.returnedAt) return false;
    const due = new Date(loan.dueAt);
    return Number.isFinite(due.getTime()) && due.getTime() < Date.now();
  }

  function renderCirculation(db) {
    const err = UI.circulation.error;
    const books = [...db.books].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    const members = [...db.members].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const q = norm(UI.circulation.q);
    let activeLoans = db.loans.filter((l) => !l.returnedAt);
    if (UI.circulation.filter === "overdue") activeLoans = activeLoans.filter((l) => isOverdue(l));

    activeLoans = activeLoans.filter((l) => {
      const member = db.members.find((m) => m.id === l.memberId);
      const book = db.books.find((b) => b.id === l.bookId);
      const blob = `${member ? member.name : ""} ${member ? member.code : ""} ${book ? book.title : ""} ${book ? book.author : ""}`;
      return includesQ(blob, q);
    });

    const loanSorters = {
      due_asc: (a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")),
      due_desc: (a, b) => String(b.dueAt || "").localeCompare(String(a.dueAt || "")),
      issued_desc: (a, b) => String(b.issuedAt || "").localeCompare(String(a.issuedAt || "")),
    };
    activeLoans.sort(loanSorters[UI.circulation.sort] || loanSorters.due_asc);
    const overdueCount = activeLoans.filter((l) => isOverdue(l)).length;

    const noSetup = db.books.length === 0 || db.members.length === 0;
    const fe = UI.circulation.fieldErrors || {};

    const bookOptions = books
      .map((b) => {
        const avail = Number(b.copiesAvailable) || 0;
        const disabled = avail <= 0 ? "disabled" : "";
        return `<option value="${escapeHtml(b.id)}" ${disabled}>${escapeHtml(b.title)} — ${escapeHtml(
          b.author
        )} (avail: ${avail})</option>`;
      })
      .join("");

    const memberOptions = members
      .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} (${escapeHtml(m.code)})</option>`)
      .join("");

    return `
      <section class="card" id="circulationScreen">
        <div class="card__header">
          <div>
            <h1 class="card__title">Circulation</h1>
            <div class="muted" style="margin-top:6px">Issue and return books. Tracks active + overdue loans.</div>
          </div>
          <div class="toolbar">
            <span class="pill ${overdueCount > 0 ? "pill--bad" : "pill--ok"}">Overdue: <span class="mono">${overdueCount}</span></span>
            <span class="pill pill--warn">Active loans: <span class="mono">${activeLoans.length}</span></span>
          </div>
        </div>

        <div class="card__body">
          ${err ? `<div class="error" role="alert" style="margin-bottom:12px">${escapeHtml(err)}</div>` : ""}

          ${
            noSetup
              ? `
                <div class="error" role="alert">
                  You need at least <strong>1 book</strong> and <strong>1 member</strong> before issuing.
                  Go to <span class="mono">Books</span> and <span class="mono">Members</span> tabs first.
                </div>
              `
              : `
                <section class="card" style="margin-bottom:14px; background: rgba(0,0,0,0.10)">
                  <div class="card__header" style="border-bottom-color: rgba(255,255,255,0.05)">
                    <div>
                      <div class="card__title" style="font-size:16px">Issue a book</div>
                      <div class="muted" style="margin-top:6px">Creates a loan and decreases available copies.</div>
                    </div>
                  </div>
                  <div class="card__body">
                    <form id="issueForm" autocomplete="off">
                      <div class="formGrid">
                        <div class="col-6">
                          <div class="field__label">Member *</div>
                          <select class="select ${fe.memberId ? "is-invalid" : ""}" name="memberId">
                            <option value="">Select member…</option>
                            ${memberOptions}
                          </select>
                          ${renderFieldError(fe, "memberId")}
                        </div>
                        <div class="col-6">
                          <div class="field__label">Book (only available shown) *</div>
                          <select class="select ${fe.bookId ? "is-invalid" : ""}" name="bookId">
                            <option value="">Select book…</option>
                            ${bookOptions}
                          </select>
                          ${renderFieldError(fe, "bookId")}
                        </div>
                        <div class="col-4">
                          <div class="field__label">Due date *</div>
                          <input class="input ${fe.dueYmd ? "is-invalid" : ""}" type="date" name="dueYmd" value="${escapeHtml(
                            addDaysYmd(14)
                          )}" />
                          ${renderFieldError(fe, "dueYmd")}
                        </div>
                        <div class="col-8">
                          <div class="field__label">Note</div>
                          <input class="input" name="note" placeholder="optional" />
                        </div>
                        <div class="col-12">
                          <div class="row">
                            <div class="muted">Rule: cannot issue if available copies = 0.</div>
                            <div class="toolbar">
                              <button type="submit" class="btn btn--primary">Issue</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </section>
              `
          }

          <div class="controlRow">
            <div class="controlLeft">
              <div class="pill pill--warn">Showing: <span class="mono">${activeLoans.length}</span></div>
              <button type="button" class="btn btn--ghost btn--sm" data-action="circulation-clear-error">Clear message</button>
            </div>
            <div class="controlRight">
              <button type="button" class="btn btn--ghost btn--sm" data-action="circulation-clear">Clear</button>
            </div>
          </div>

          <div class="formGrid" style="margin-bottom:12px">
            <div class="col-6">
              <div class="field__label">Search</div>
              <input class="input" data-circ="q" placeholder="member / book…" value="${escapeHtml(UI.circulation.q)}" />
            </div>
            <div class="col-3">
              <div class="field__label">Filter</div>
              <select class="select" data-circ="filter">
                <option value="all" ${UI.circulation.filter === "all" ? "selected" : ""}>All active</option>
                <option value="overdue" ${UI.circulation.filter === "overdue" ? "selected" : ""}>Overdue only</option>
              </select>
            </div>
            <div class="col-3">
              <div class="field__label">Sort</div>
              <select class="select" data-circ="sort">
                <option value="due_asc" ${UI.circulation.sort === "due_asc" ? "selected" : ""}>Due date (soonest)</option>
                <option value="due_desc" ${UI.circulation.sort === "due_desc" ? "selected" : ""}>Due date (latest)</option>
                <option value="issued_desc" ${UI.circulation.sort === "issued_desc" ? "selected" : ""}>Issued (newest)</option>
              </select>
            </div>
          </div>

          <div class="tableWrap">
            <table aria-label="Loans table" style="min-width: 980px">
              <thead>
                <tr>
                  <th style="min-width:210px">Member</th>
                  <th style="min-width:320px">Book</th>
                  <th style="min-width:140px">Issued</th>
                  <th style="min-width:140px">Due</th>
                  <th style="min-width:140px">Status</th>
                  <th class="right" style="min-width:180px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${
                  activeLoans.length === 0
                    ? `<tr><td colspan="6" class="muted">No active loans.</td></tr>`
                    : activeLoans
                        .map((l) => {
                          const member = db.members.find((m) => m.id === l.memberId);
                          const book = db.books.find((b) => b.id === l.bookId);
                          const overdue = isOverdue(l);
                          return `
                            <tr>
                              <td>
                                ${escapeHtml(member ? member.name : "Unknown")}
                                <span class="sub">${escapeHtml(member ? member.code : "")}</span>
                              </td>
                              <td>
                                ${escapeHtml(book ? book.title : "Unknown")}
                                <span class="sub">${escapeHtml(book ? book.author : "")}</span>
                              </td>
                              <td class="mono">${escapeHtml(isoToYmd(l.issuedAt))}</td>
                              <td class="mono">${escapeHtml(isoToYmd(l.dueAt))}</td>
                              <td>
                                <span class="pill ${overdue ? "pill--bad" : "pill--ok"}">${overdue ? "Overdue" : "Active"}</span>
                              </td>
                              <td class="right">
                                <div class="actions">
                                  <button type="button" class="btn btn--sm btn--primary" data-action="loan-return" data-id="${escapeHtml(
                                    l.id
                                  )}">Return</button>
                                </div>
                              </td>
                            </tr>
                          `;
                        })
                        .join("")
                }
              </tbody>
            </table>
          </div>

          <p class="muted" style="margin-top:12px">
            Phase 6 will improve UX (toasts, confirmations, inline validation). Phase 7 adds import/export backup.
          </p>
        </div>
      </section>
    `;
  }

  function booksSetError(msg) {
    UI.books.error = msg || "";
  }

  function booksGoList() {
    UI.books.mode = "list";
    UI.books.editId = null;
    booksSetError("");
    UI.books.fieldErrors = {};
  }

  function booksGoAdd() {
    UI.books.mode = "add";
    UI.books.editId = null;
    booksSetError("");
    UI.books.fieldErrors = {};
  }

  function booksGoEdit(bookId, db) {
    const found = db.books.find((b) => b.id === bookId);
    if (!found) {
      booksSetError("Book not found.");
      booksGoList();
      return;
    }
    UI.books.mode = "edit";
    UI.books.editId = found.id;
    booksSetError("");
    UI.books.fieldErrors = {};
  }

  function membersSetError(msg) {
    UI.members.error = msg || "";
  }

  function membersGoList() {
    UI.members.mode = "list";
    UI.members.editId = null;
    membersSetError("");
    UI.members.fieldErrors = {};
  }

  function membersGoAdd() {
    UI.members.mode = "add";
    UI.members.editId = null;
    membersSetError("");
    UI.members.fieldErrors = {};
  }

  function membersGoEdit(memberId, db) {
    const found = db.members.find((m) => m.id === memberId);
    if (!found) {
      membersSetError("Member not found.");
      membersGoList();
      return;
    }
    UI.members.mode = "edit";
    UI.members.editId = found.id;
    membersSetError("");
    UI.members.fieldErrors = {};
  }

  function normalizeIsbn(isbnRaw) {
    return String(isbnRaw || "")
      .replaceAll(/\s+/g, "")
      .replaceAll(/-/g, "");
  }

  function normalizeEmail(emailRaw) {
    return String(emailRaw || "").trim().toLowerCase();
  }

  function normalizeMemberCode(codeRaw) {
    return String(codeRaw || "").trim().toUpperCase();
  }

  function validateBookInput(input, db, { mode, editId }) {
    const fieldErrors = {};
    const title = String(input.title || "").trim();
    const author = String(input.author || "").trim();
    const isbn = normalizeIsbn(input.isbn);
    const category = String(input.category || "").trim();
    const copiesTotal = Number(String(input.copiesTotal || "").trim());

    if (!title) fieldErrors.title = "Title is required.";
    if (!author) fieldErrors.author = "Author is required.";
    if (!isbn) fieldErrors.isbn = "ISBN is required.";
    if (isbn && !/^[0-9Xx-]+$/.test(isbn)) fieldErrors.isbn = "ISBN should contain only digits (optionally X or -).";
    if (!category) fieldErrors.category = "Category is required.";
    if (!Number.isFinite(copiesTotal) || !Number.isInteger(copiesTotal) || copiesTotal <= 0)
      fieldErrors.copiesTotal = "Total copies must be a positive whole number.";
    if (Object.keys(fieldErrors).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

    const isbnTaken = db.books.some((b) => {
      if (mode === "edit" && b.id === editId) return false;
      return normalizeIsbn(b.isbn) === isbn;
    });
    if (isbnTaken) return { ok: false, message: "ISBN already exists. Use a unique ISBN.", fieldErrors: { isbn: "ISBN already exists." } };

    return { ok: true, value: { title, author, isbn, category, copiesTotal }, fieldErrors: {} };
  }

  function validateMemberInput(input, db, { mode, editId }) {
    const fieldErrors = {};
    const name = String(input.name || "").trim();
    const code = normalizeMemberCode(input.code);
    const email = normalizeEmail(input.email);
    const phone = String(input.phone || "").trim();

    if (!name) fieldErrors.name = "Full name is required.";
    if (!code) fieldErrors.code = "Member code is required.";
    if (!email) fieldErrors.email = "Email is required.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Please enter a valid email address.";
    if (Object.keys(fieldErrors).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

    const codeTaken = db.members.some((m) => {
      if (mode === "edit" && m.id === editId) return false;
      return normalizeMemberCode(m.code) === code;
    });
    if (codeTaken) return { ok: false, message: "Member code already exists. Use a unique code.", fieldErrors: { code: "Member code already exists." } };

    const emailTaken = db.members.some((m) => {
      if (mode === "edit" && m.id === editId) return false;
      return normalizeEmail(m.email) === email;
    });
    if (emailTaken) return { ok: false, message: "Email already exists. Use a unique email.", fieldErrors: { email: "Email already exists." } };

    return { ok: true, value: { name, code, email, phone }, fieldErrors: {} };
  }

  function mountBooks($root) {
    // Delegate handlers within the screen to survive rerenders.
    $root.off("click.books");
    $root.off("submit.books");

    $root.on("click.books", "[data-action='books-add']", function () {
      booksGoAdd();
      renderCurrent();
    });

    $root.on("click.books", "[data-action='books-cancel']", function () {
      booksGoList();
      renderCurrent();
    });

    $root.on("click.books", "[data-action='books-edit']", function () {
      const id = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      booksGoEdit(id, db);
      renderCurrent();
    });

    $root.on("click.books", "[data-action='books-delete']", function () {
      const id = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      const book = db.books.find((b) => b.id === id);
      if (!book) return;

      const hasActiveLoan = db.loans.some((l) => l.bookId === id && !l.returnedAt);
      if (hasActiveLoan) {
        booksSetError("Cannot delete: this book has active loans.");
        renderCurrent();
        return;
      }

      confirmDialog({
        title: "Delete book?",
        message: `Delete "${book.title}"? This cannot be undone.`,
        okText: "Delete",
        danger: true,
      }).then((ok) => {
        if (!ok) return;
        db.books = db.books.filter((b) => b.id !== id);
        window.LMS.storage.writeDb(db);
        toast("ok", "Deleted", "Book removed.");
        booksGoList();
        renderCurrent();
      });
    });

    $root.on("submit.books", "#bookForm", function (e) {
      e.preventDefault();
      const db = window.LMS.storage.readDb();
      const $form = $(this);
      const raw = {
        title: $form.find("[name='title']").val(),
        author: $form.find("[name='author']").val(),
        isbn: $form.find("[name='isbn']").val(),
        category: $form.find("[name='category']").val(),
        copiesTotal: $form.find("[name='copiesTotal']").val(),
      };

      const mode = UI.books.mode;
      const editId = UI.books.editId;
      const v = validateBookInput(raw, db, { mode, editId });
      if (!v.ok) {
        UI.books.fieldErrors = v.fieldErrors || {};
        booksSetError(v.message);
        toast("bad", "Fix errors", v.message);
        renderCurrent();
        const k = firstKey(UI.books.fieldErrors);
        if (k) window.setTimeout(() => $root.find(`[name='${k}']`).trigger("focus"), 0);
        return;
      }

      booksSetError("");
      UI.books.fieldErrors = {};

      if (mode === "add") {
        const book = {
          id: window.LMS.storage.uid("book"),
          title: v.value.title,
          author: v.value.author,
          isbn: v.value.isbn,
          category: v.value.category,
          copiesTotal: v.value.copiesTotal,
          copiesAvailable: v.value.copiesTotal,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.books.push(book);
        window.LMS.storage.writeDb(db);
        toast("ok", "Book added", `"${book.title}" created.`);
        booksGoList();
        renderCurrent();
        return;
      }

      if (mode === "edit" && editId) {
        const idx = db.books.findIndex((b) => b.id === editId);
        if (idx === -1) {
          booksSetError("Book not found.");
          booksGoList();
          renderCurrent();
          return;
        }
        const existing = db.books[idx];
        const borrowed = bookBorrowedCount(existing);
        if (v.value.copiesTotal < borrowed) {
          UI.books.fieldErrors = { copiesTotal: `Cannot be less than borrowed (${borrowed}).` };
          booksSetError(`Total copies cannot be less than borrowed (${borrowed}).`);
          toast("bad", "Fix errors", "Total copies is too low.");
          renderCurrent();
          return;
        }

        const newAvail = Math.max(0, v.value.copiesTotal - borrowed);
        db.books[idx] = {
          ...existing,
          title: v.value.title,
          author: v.value.author,
          isbn: v.value.isbn,
          category: v.value.category,
          copiesTotal: v.value.copiesTotal,
          copiesAvailable: newAvail,
          updatedAt: new Date().toISOString(),
        };
        window.LMS.storage.writeDb(db);
        toast("ok", "Saved", "Book updated.");
        booksGoList();
        renderCurrent();
      }
    });

    $root.on("input.books change.books", "[data-books]", function () {
      const key = String($(this).data("books"));
      const val = String($(this).val() ?? "");
      if (key === "q") UI.books.q = val;
      if (key === "availability") UI.books.availability = val;
      if (key === "category") UI.books.category = val;
      if (key === "sort") UI.books.sort = val;
      renderCurrent();
    });

    $root.on("click.books", "[data-action='books-clear']", function () {
      UI.books.q = "";
      UI.books.availability = "all";
      UI.books.category = "all";
      UI.books.sort = "title_asc";
      renderCurrent();
    });
  }

  function mountMembers($root) {
    $root.off("click.members");
    $root.off("submit.members");

    $root.on("click.members", "[data-action='members-add']", function () {
      membersGoAdd();
      renderCurrent();
    });

    $root.on("click.members", "[data-action='members-cancel']", function () {
      membersGoList();
      renderCurrent();
    });

    $root.on("click.members", "[data-action='members-edit']", function () {
      const id = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      membersGoEdit(id, db);
      renderCurrent();
    });

    $root.on("click.members", "[data-action='members-delete']", function () {
      const id = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      const member = db.members.find((m) => m.id === id);
      if (!member) return;

      const hasActiveLoan = db.loans.some((l) => l.memberId === id && !l.returnedAt);
      if (hasActiveLoan) {
        membersSetError("Cannot delete: this member has active loans.");
        renderCurrent();
        return;
      }

      confirmDialog({
        title: "Delete member?",
        message: `Delete "${member.name}"? This cannot be undone.`,
        okText: "Delete",
        danger: true,
      }).then((ok) => {
        if (!ok) return;
        db.members = db.members.filter((m) => m.id !== id);
        window.LMS.storage.writeDb(db);
        toast("ok", "Deleted", "Member removed.");
        membersGoList();
        renderCurrent();
      });
    });

    $root.on("submit.members", "#memberForm", function (e) {
      e.preventDefault();
      const db = window.LMS.storage.readDb();
      const $form = $(this);
      const raw = {
        name: $form.find("[name='name']").val(),
        code: $form.find("[name='code']").val(),
        email: $form.find("[name='email']").val(),
        phone: $form.find("[name='phone']").val(),
      };

      const mode = UI.members.mode;
      const editId = UI.members.editId;
      const v = validateMemberInput(raw, db, { mode, editId });
      if (!v.ok) {
        UI.members.fieldErrors = v.fieldErrors || {};
        membersSetError(v.message);
        toast("bad", "Fix errors", v.message);
        renderCurrent();
        const k = firstKey(UI.members.fieldErrors);
        if (k) window.setTimeout(() => $root.find(`[name='${k}']`).trigger("focus"), 0);
        return;
      }

      membersSetError("");
      UI.members.fieldErrors = {};

      if (mode === "add") {
        const member = {
          id: window.LMS.storage.uid("mem"),
          name: v.value.name,
          code: v.value.code,
          email: v.value.email,
          phone: v.value.phone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.members.push(member);
        window.LMS.storage.writeDb(db);
        toast("ok", "Member added", `"${member.name}" created.`);
        membersGoList();
        renderCurrent();
        return;
      }

      if (mode === "edit" && editId) {
        const idx = db.members.findIndex((m) => m.id === editId);
        if (idx === -1) {
          membersSetError("Member not found.");
          membersGoList();
          renderCurrent();
          return;
        }
        const existing = db.members[idx];
        db.members[idx] = {
          ...existing,
          name: v.value.name,
          code: v.value.code,
          email: v.value.email,
          phone: v.value.phone,
          updatedAt: new Date().toISOString(),
        };
        window.LMS.storage.writeDb(db);
        toast("ok", "Saved", "Member updated.");
        membersGoList();
        renderCurrent();
      }
    });

    $root.on("input.members change.members", "[data-members]", function () {
      const key = String($(this).data("members"));
      const val = String($(this).val() ?? "");
      if (key === "q") UI.members.q = val;
      if (key === "sort") UI.members.sort = val;
      renderCurrent();
    });

    $root.on("click.members", "[data-action='members-clear']", function () {
      UI.members.q = "";
      UI.members.sort = "name_asc";
      renderCurrent();
    });
  }

  function circulationSetError(msg) {
    UI.circulation.error = msg || "";
  }

  function mountCirculation($root) {
    $root.off("click.circ");
    $root.off("submit.circ");

    $root.on("click.circ", "[data-action='circulation-clear-error']", function () {
      circulationSetError("");
      renderCurrent();
    });

    $root.on("input.circ change.circ", "[data-circ]", function () {
      const key = String($(this).data("circ"));
      const val = String($(this).val() ?? "");
      if (key === "q") UI.circulation.q = val;
      if (key === "filter") UI.circulation.filter = val;
      if (key === "sort") UI.circulation.sort = val;
      renderCurrent();
    });

    $root.on("click.circ", "[data-action='circulation-clear']", function () {
      UI.circulation.q = "";
      UI.circulation.filter = "all";
      UI.circulation.sort = "due_asc";
      renderCurrent();
    });

    $root.on("submit.circ", "#issueForm", function (e) {
      e.preventDefault();
      const db = window.LMS.storage.readDb();
      const $form = $(this);
      const memberId = String($form.find("[name='memberId']").val() || "");
      const bookId = String($form.find("[name='bookId']").val() || "");
      const dueYmd = String($form.find("[name='dueYmd']").val() || "");
      const note = String($form.find("[name='note']").val() || "").trim();

      UI.circulation.fieldErrors = {};
      const member = db.members.find((m) => m.id === memberId);
      if (!member) {
        UI.circulation.fieldErrors.memberId = "Select a member.";
        circulationSetError("Please select a member.");
        toast("bad", "Fix errors", "Member is required.");
        renderCurrent();
        return;
      }

      const bookIdx = db.books.findIndex((b) => b.id === bookId);
      if (bookIdx === -1) {
        UI.circulation.fieldErrors.bookId = "Select a book.";
        circulationSetError("Please select a book.");
        toast("bad", "Fix errors", "Book is required.");
        renderCurrent();
        return;
      }

      const book = db.books[bookIdx];
      const avail = Number(book.copiesAvailable) || 0;
      if (avail <= 0) {
        UI.circulation.fieldErrors.bookId = "No available copies.";
        circulationSetError("This book is not available right now.");
        toast("bad", "Not available", "No available copies for this book.");
        renderCurrent();
        return;
      }

      const dueAt = new Date(`${dueYmd}T23:59:59.000Z`).toISOString();
      if (!dueYmd || Number.isNaN(new Date(dueAt).getTime())) {
        UI.circulation.fieldErrors.dueYmd = "Choose a valid due date.";
        circulationSetError("Please choose a valid due date.");
        toast("bad", "Fix errors", "Due date is required.");
        renderCurrent();
        return;
      }

      const loan = {
        id: window.LMS.storage.uid("loan"),
        memberId,
        bookId,
        issuedAt: new Date().toISOString(),
        dueAt,
        returnedAt: null,
        note,
      };

      db.loans.push(loan);
      db.books[bookIdx] = {
        ...book,
        copiesAvailable: Math.max(0, avail - 1),
        updatedAt: new Date().toISOString(),
      };

      window.LMS.storage.writeDb(db);
      circulationSetError("");
      UI.circulation.fieldErrors = {};
      toast("ok", "Issued", "Loan created and availability updated.");
      renderCurrent();
    });

    $root.on("click.circ", "[data-action='loan-return']", function () {
      const loanId = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      const loanIdx = db.loans.findIndex((l) => l.id === loanId);
      if (loanIdx === -1) return;
      const loan = db.loans[loanIdx];
      if (loan.returnedAt) return;

      confirmDialog({
        title: "Return book?",
        message: "Mark this loan as returned and increase available copies?",
        okText: "Return",
        danger: false,
      }).then((ok) => {
        if (!ok) return;
        const bookIdx = db.books.findIndex((b) => b.id === loan.bookId);
        if (bookIdx !== -1) {
          const book = db.books[bookIdx];
          const total = Number(book.copiesTotal) || 0;
          const avail = Number(book.copiesAvailable) || 0;
          db.books[bookIdx] = {
            ...book,
            copiesAvailable: Math.min(total, avail + 1),
            updatedAt: new Date().toISOString(),
          };
        }

        db.loans[loanIdx] = {
          ...loan,
          returnedAt: new Date().toISOString(),
        };

        window.LMS.storage.writeDb(db);
        circulationSetError("");
        toast("ok", "Returned", "Loan closed and availability updated.");
        renderCurrent();
      });
    });
  }

  function renderRoute(route, db) {
    if (route === "dashboard") return renderDashboard(db);
    if (route === "books") return renderBooks(db);
    if (route === "members") return renderMembers(db);
    if (route === "circulation") return renderCirculation(db);
    return renderPlaceholder("Not found", "Unknown route.");
  }

  function normalizeRoute(route) {
    if (ROUTES.includes(route)) return route;
    return "dashboard";
  }

  function getRouteFromHash() {
    const raw = (window.location.hash || "").replace("#", "").trim();
    return normalizeRoute(raw || "dashboard");
  }

  function go(route) {
    const safe = normalizeRoute(route);
    window.location.hash = safe;
  }

  function afterRender(route) {
    const $main = $("#appMain");
    if (route === "books") mountBooks($main);
    if (route === "members") mountMembers($main);
    if (route === "circulation") mountCirculation($main);
    if (route === "dashboard") mountDashboard($main);
  }

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
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
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

  function mountDashboard($root) {
    $root.off("click.dash");
    $root.on("click.dash", "[data-action='export-db']", function () {
      const db = window.LMS.storage.readDb();
      const name = `lms_backup_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(name, db);
      toast("ok", "Exported", "Backup JSON downloaded.");
    });

    $root.on("click.dash", "[data-action='import-db']", function () {
      const fileInput = $("#importFile").get(0);
      const mode = String($("#importMode").val() || "replace");
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;

      if (!file) {
        toast("bad", "Import failed", "Please choose a JSON file first.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          const v = validateDbShape(parsed);
          if (!v.ok) {
            toast("bad", "Import failed", v.message);
            return;
          }

          const ok = await confirmDialog({
            title: "Import backup?",
            message: mode === "replace" ? "Replace your current data with this backup?" : "Merge this backup into your current data?",
            okText: "Import",
            danger: mode === "replace",
          });
          if (!ok) return;

          const current = window.LMS.storage.readDb();
          let next = parsed;

          if (mode === "merge") {
            next = {
              ...current,
              books: mergeById(current.books, parsed.books),
              members: mergeById(current.members, parsed.members),
              loans: mergeById(current.loans, parsed.loans),
              schemaVersion: 1,
              createdAt: current.createdAt || parsed.createdAt,
            };
          }

          window.LMS.storage.writeDb(next);
          toast("ok", "Imported", mode === "replace" ? "Data replaced from backup." : "Backup merged successfully.");
          renderCurrent();
        } catch {
          toast("bad", "Import failed", "File is not valid JSON.");
        }
      };
      reader.readAsText(file);
    });
  }

  function renderCurrent() {
    const route = getRouteFromHash();
    setActiveRoute(route);
    $("#appMain").html(renderRoute(route, window.LMS.storage.readDb()));
    afterRender(route);
  }

  function mount() {
    const db = window.LMS.storage.readDb();
    window.LMS.storage.writeDb(db);

    renderCurrent();

    $(".nav__btn").on("click", function () {
      go($(this).data("route"));
    });

    $(window).on("hashchange", function () {
      renderCurrent();
      $("#appMain").trigger("focus");
    });

    $("#resetDemoBtn").on("click", function () {
      confirmDialog({
        title: "Reset demo data?",
        message: "This will overwrite current localStorage data for the app.",
        okText: "Reset",
        danger: true,
      }).then((ok) => {
        if (!ok) return;
        window.LMS.storage.resetDb();
        booksGoList();
        membersGoList();
        UI.circulation.fieldErrors = {};
        toast("warn", "Reset", "Demo data restored.");
        renderCurrent();
      });
    });
  }

  window.LMS = window.LMS || {};
  window.LMS.app = { mount, go };

  $(mount);
})();

