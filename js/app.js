/* global $, window */
/* Main app entry — Router and global state */
(function () {
  const ROUTES = ["dashboard", "books", "members", "circulation"];
  
  // Shared UI state
  window.LMS.state = {
    books: { mode: "list", editId: null, error: "", fieldErrors: {}, q: "", sort: "title_asc", availability: "all", category: "all" },
    members: { mode: "list", editId: null, error: "", fieldErrors: {}, q: "", sort: "name_asc" },
    circulation: { error: "", fieldErrors: {}, q: "", filter: "all", sort: "due_asc" }
  };

  function setActiveRoute(route) {
    $(".nav__btn").removeClass("is-active");
    $(`.nav__btn[data-route="${route}"]`).addClass("is-active");
  }

  function renderRoute(route, db) {
    const view = window.LMS.views[route];
    if (view) return view.render(db);
    return `<section class="card"><div class="card__body">Page not found.</div></section>`;
  }

  function normalizeRoute(route) {
    return ROUTES.includes(route) ? route : "dashboard";
  }

  function getRouteFromHash() {
    const raw = (window.location.hash || "").replace("#", "").trim();
    return normalizeRoute(raw || "dashboard");
  }

  function go(route) {
    window.location.hash = normalizeRoute(route);
  }

  function afterRender(route) {
    const view = window.LMS.views[route];
    if (view && view.mount) view.mount($("#appMain"));
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

    $(".nav__btn").on("click", function () { go($(this).data("route")); });
    $(window).on("hashchange", () => { renderCurrent(); $("#appMain").trigger("focus"); });

    $("#resetDemoBtn").on("click", function () {
      window.LMS.utils.confirmDialog({ title: "Reset?", message: "Overwrite all data?", danger: true }).then(ok => {
        if (!ok) return;
        window.LMS.storage.resetDb();
        window.LMS.views.books.goList();
        window.LMS.views.members.goList();
        window.LMS.views.circulation.setError("");
        window.LMS.utils.toast("warn", "Reset", "Demo data restored.");
        renderCurrent();
      });
    });
  }

  window.LMS.app = { mount, go, renderCurrent };
  $(mount);
})();
