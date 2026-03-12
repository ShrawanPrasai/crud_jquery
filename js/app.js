/* global $, window */
(function () {
  const ROUTES = ["dashboard", "books", "members", "circulation"];
  const UI = {
    books: {
      mode: "list", // list | add | edit
      editId: null,
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

  function normalizeIsbn(isbnRaw) {
    return String(isbnRaw || "")
      .replaceAll(/\s+/g, "")
      .replaceAll(/-/g, "");
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

  function renderRoute(route, db) {
    if (route === "dashboard") return renderDashboard(db);
    if (route === "books") return renderBooks(db);
    if (route === "members") return renderPlaceholder("Members", "Phase 3: add / edit / delete members with validation + persistence.");
    if (route === "circulation")
      return renderPlaceholder("Circulation", "Phase 4: issue/return books and track active/overdue loans.");
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

