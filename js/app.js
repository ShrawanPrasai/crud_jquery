/* global $, window */
(function () {
  const ROUTES = ["dashboard", "books", "members", "circulation"];

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

  function renderRoute(route, db) {
    if (route === "dashboard") return renderDashboard(db);
    if (route === "books") return renderPlaceholder("Books", "Phase 2: add / edit / delete books with validation + persistence.");
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

  function mount() {
    const db = window.LMS.storage.readDb();
    window.LMS.storage.writeDb(db);

    const route = getRouteFromHash();
    setActiveRoute(route);
    $("#appMain").html(renderRoute(route, window.LMS.storage.readDb()));

    $(".nav__btn").on("click", function () {
      go($(this).data("route"));
    });

    $(window).on("hashchange", function () {
      const r = getRouteFromHash();
      setActiveRoute(r);
      $("#appMain").html(renderRoute(r, window.LMS.storage.readDb()));
      $("#appMain").trigger("focus");
    });

    $("#resetDemoBtn").on("click", function () {
      if (!window.confirm("Reset demo data? This will overwrite current localStorage data.")) return;
      window.LMS.storage.resetDb();
      const r = getRouteFromHash();
      $("#appMain").html(renderRoute(r, window.LMS.storage.readDb()));
    });
  }

  window.LMS = window.LMS || {};
  window.LMS.app = { mount, go };

  $(mount);
})();

