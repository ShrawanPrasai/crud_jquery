/* global $, window */
(function () {
  const ROUTES = ["dashboard", "books", "members", "circulation"];
  const UI = {
    books: {
      mode: "list", // list | add | edit
      editId: null,
      error: "",
    },
    members: {
      mode: "list", // list | add | edit
      editId: null,
      error: "",
    },
    circulation: {
      error: "",
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

          <p class="muted" style="margin-top:14px">
            Next: Phase 2 builds full <span class="mono">Books</span> CRUD screens.
          </p>
          <p class="muted">
            Active loans: <span class="mono">${activeLoans}</span>
          </p>
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

  function bookBorrowedCount(book) {
    const total = Number(book.copiesTotal) || 0;
    const avail = Number(book.copiesAvailable) || 0;
    return Math.max(0, total - avail);
  }

  function renderBooks(db) {
    const state = UI.books;
    const books = [...db.books].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    const editing = state.mode === "edit" && state.editId ? db.books.find((b) => b.id === state.editId) : null;

    const formBook =
      state.mode === "add"
        ? { title: "", author: "", isbn: "", category: "", copiesTotal: 1 }
        : editing || { title: "", author: "", isbn: "", category: "", copiesTotal: 1 };

    const showForm = state.mode === "add" || state.mode === "edit";
    const borrowed = editing ? bookBorrowedCount(editing) : 0;

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
                      <input class="input" name="title" placeholder="e.g. Atomic Habits" value="${escapeHtml(
                        formBook.title
                      )}" />
                    </div>
                    <div class="col-6">
                      <div class="field__label">Author *</div>
                      <input class="input" name="author" placeholder="e.g. James Clear" value="${escapeHtml(
                        formBook.author
                      )}" />
                    </div>
                    <div class="col-6">
                      <div class="field__label">ISBN *</div>
                      <input class="input" name="isbn" placeholder="numbers only (no spaces)" value="${escapeHtml(
                        formBook.isbn
                      )}" ${state.mode === "edit" ? `data-original-isbn="${escapeHtml(formBook.isbn)}"` : ""} />
                      <div class="field__hint">Must be unique.</div>
                    </div>
                    <div class="col-3">
                      <div class="field__label">Category *</div>
                      <input class="input" name="category" placeholder="e.g. Programming" value="${escapeHtml(
                        formBook.category
                      )}" />
                    </div>
                    <div class="col-3">
                      <div class="field__label">Total copies *</div>
                      <input class="input" name="copiesTotal" inputmode="numeric" placeholder="e.g. 3" value="${escapeHtml(
                        formBook.copiesTotal
                      )}" />
                      ${
                        state.mode === "edit"
                          ? `<div class="field__hint">Borrowed now: <span class="mono">${borrowed}</span></div>`
                          : ""
                      }
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
                <div class="row" style="margin-bottom:12px">
                  <div class="pill pill--ok">Titles: <span class="mono">${books.length}</span></div>
                  <div class="muted">Tip: Phase 5 will add search, filters and sorting.</div>
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
    const members = [...db.members].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const editing = state.mode === "edit" && state.editId ? db.members.find((m) => m.id === state.editId) : null;

    const formMember =
      state.mode === "add"
        ? { name: "", code: "", email: "", phone: "" }
        : editing || { name: "", code: "", email: "", phone: "" };

    const showForm = state.mode === "add" || state.mode === "edit";

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
                      <input class="input" name="name" placeholder="e.g. Sita Karki" value="${escapeHtml(formMember.name)}" />
                    </div>
                    <div class="col-3">
                      <div class="field__label">Member code *</div>
                      <input class="input" name="code" placeholder="e.g. M-1003" value="${escapeHtml(formMember.code)}" />
                      <div class="field__hint">Must be unique.</div>
                    </div>
                    <div class="col-3">
                      <div class="field__label">Phone</div>
                      <input class="input" name="phone" inputmode="tel" placeholder="e.g. 98xxxxxxxx" value="${escapeHtml(
                        formMember.phone
                      )}" />
                    </div>

                    <div class="col-6">
                      <div class="field__label">Email *</div>
                      <input class="input" name="email" inputmode="email" placeholder="e.g. user@example.com" value="${escapeHtml(
                        formMember.email
                      )}" />
                      <div class="field__hint">Must be unique.</div>
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
                <div class="row" style="margin-bottom:12px">
                  <div class="pill pill--ok">Members: <span class="mono">${members.length}</span></div>
                  <div class="muted">Tip: Phase 5 will add search and filtering.</div>
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

    const activeLoans = db.loans.filter((l) => !l.returnedAt);
    const overdueCount = activeLoans.filter((l) => isOverdue(l)).length;

    const noSetup = db.books.length === 0 || db.members.length === 0;

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
                          <select class="select" name="memberId">
                            <option value="">Select member…</option>
                            ${memberOptions}
                          </select>
                        </div>
                        <div class="col-6">
                          <div class="field__label">Book (only available shown) *</div>
                          <select class="select" name="bookId">
                            <option value="">Select book…</option>
                            ${bookOptions}
                          </select>
                        </div>
                        <div class="col-4">
                          <div class="field__label">Due date *</div>
                          <input class="input" type="date" name="dueYmd" value="${escapeHtml(addDaysYmd(14))}" />
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

          <div class="row" style="margin-bottom:10px">
            <div class="muted">Active loans</div>
            <button type="button" class="btn btn--ghost btn--sm" data-action="circulation-clear-error">Clear message</button>
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
                        .slice()
                        .sort((a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")))
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
            Phase 5 will add search/filtering and show full loan history.
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
  }

  function booksGoAdd() {
    UI.books.mode = "add";
    UI.books.editId = null;
    booksSetError("");
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
  }

  function membersSetError(msg) {
    UI.members.error = msg || "";
  }

  function membersGoList() {
    UI.members.mode = "list";
    UI.members.editId = null;
    membersSetError("");
  }

  function membersGoAdd() {
    UI.members.mode = "add";
    UI.members.editId = null;
    membersSetError("");
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
    const title = String(input.title || "").trim();
    const author = String(input.author || "").trim();
    const isbn = normalizeIsbn(input.isbn);
    const category = String(input.category || "").trim();
    const copiesTotal = Number(String(input.copiesTotal || "").trim());

    if (!title) return { ok: false, message: "Title is required." };
    if (!author) return { ok: false, message: "Author is required." };
    if (!isbn) return { ok: false, message: "ISBN is required." };
    if (!/^[0-9Xx-]+$/.test(isbn)) return { ok: false, message: "ISBN should contain only digits (optionally X or -)." };
    if (!category) return { ok: false, message: "Category is required." };
    if (!Number.isFinite(copiesTotal) || !Number.isInteger(copiesTotal) || copiesTotal <= 0)
      return { ok: false, message: "Total copies must be a positive whole number." };

    const isbnTaken = db.books.some((b) => {
      if (mode === "edit" && b.id === editId) return false;
      return normalizeIsbn(b.isbn) === isbn;
    });
    if (isbnTaken) return { ok: false, message: "ISBN already exists. Use a unique ISBN." };

    return { ok: true, value: { title, author, isbn, category, copiesTotal } };
  }

  function validateMemberInput(input, db, { mode, editId }) {
    const name = String(input.name || "").trim();
    const code = normalizeMemberCode(input.code);
    const email = normalizeEmail(input.email);
    const phone = String(input.phone || "").trim();

    if (!name) return { ok: false, message: "Full name is required." };
    if (!code) return { ok: false, message: "Member code is required." };
    if (!email) return { ok: false, message: "Email is required." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Please enter a valid email address." };

    const codeTaken = db.members.some((m) => {
      if (mode === "edit" && m.id === editId) return false;
      return normalizeMemberCode(m.code) === code;
    });
    if (codeTaken) return { ok: false, message: "Member code already exists. Use a unique code." };

    const emailTaken = db.members.some((m) => {
      if (mode === "edit" && m.id === editId) return false;
      return normalizeEmail(m.email) === email;
    });
    if (emailTaken) return { ok: false, message: "Email already exists. Use a unique email." };

    return { ok: true, value: { name, code, email, phone } };
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

      if (!window.confirm(`Delete "${book.title}"?`)) return;
      db.books = db.books.filter((b) => b.id !== id);
      window.LMS.storage.writeDb(db);
      booksGoList();
      renderCurrent();
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
        booksSetError(v.message);
        renderCurrent();
        return;
      }

      booksSetError("");

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
          booksSetError(`Total copies cannot be less than borrowed (${borrowed}).`);
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
        booksGoList();
        renderCurrent();
      }
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

      if (!window.confirm(`Delete member "${member.name}"?`)) return;
      db.members = db.members.filter((m) => m.id !== id);
      window.LMS.storage.writeDb(db);
      membersGoList();
      renderCurrent();
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
        membersSetError(v.message);
        renderCurrent();
        return;
      }

      membersSetError("");

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
        membersGoList();
        renderCurrent();
      }
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

    $root.on("submit.circ", "#issueForm", function (e) {
      e.preventDefault();
      const db = window.LMS.storage.readDb();
      const $form = $(this);
      const memberId = String($form.find("[name='memberId']").val() || "");
      const bookId = String($form.find("[name='bookId']").val() || "");
      const dueYmd = String($form.find("[name='dueYmd']").val() || "");
      const note = String($form.find("[name='note']").val() || "").trim();

      const member = db.members.find((m) => m.id === memberId);
      if (!member) {
        circulationSetError("Please select a member.");
        renderCurrent();
        return;
      }

      const bookIdx = db.books.findIndex((b) => b.id === bookId);
      if (bookIdx === -1) {
        circulationSetError("Please select a book.");
        renderCurrent();
        return;
      }

      const book = db.books[bookIdx];
      const avail = Number(book.copiesAvailable) || 0;
      if (avail <= 0) {
        circulationSetError("This book is not available right now.");
        renderCurrent();
        return;
      }

      const dueAt = new Date(`${dueYmd}T23:59:59.000Z`).toISOString();
      if (!dueYmd || Number.isNaN(new Date(dueAt).getTime())) {
        circulationSetError("Please choose a valid due date.");
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
      renderCurrent();
    });

    $root.on("click.circ", "[data-action='loan-return']", function () {
      const loanId = String($(this).data("id") || "");
      const db = window.LMS.storage.readDb();
      const loanIdx = db.loans.findIndex((l) => l.id === loanId);
      if (loanIdx === -1) return;
      const loan = db.loans[loanIdx];
      if (loan.returnedAt) return;

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
      renderCurrent();
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
      if (!window.confirm("Reset demo data? This will overwrite current localStorage data.")) return;
      window.LMS.storage.resetDb();
      booksGoList();
      renderCurrent();
    });
  }

  window.LMS = window.LMS || {};
  window.LMS.app = { mount, go };

  $(mount);
})();

