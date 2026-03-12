/* global $, window */
/* Shared pure helpers — exposed as window.LMS.utils */
(function () {
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
    window.setTimeout(() => $t.fadeOut(160, () => $t.remove()), 2600);
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
      $host.on("keydown.modal", (e) => { if (e.key === "Escape") finish(false); });
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

  function norm(s) { return String(s || "").trim().toLowerCase(); }

  function includesQ(haystack, q) {
    if (!q) return true;
    return norm(haystack).includes(q);
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

  function bookBorrowedCount(book) {
    const total = Number(book.copiesTotal) || 0;
    const avail = Number(book.copiesAvailable) || 0;
    return Math.max(0, total - avail);
  }

  function normalizeIsbn(raw) {
    return String(raw || "").replaceAll(/\s+/g, "").replaceAll(/-/g, "");
  }

  function normalizeEmail(raw) { return String(raw || "").trim().toLowerCase(); }

  function normalizeMemberCode(raw) { return String(raw || "").trim().toUpperCase(); }

  window.LMS = window.LMS || {};
  window.LMS.utils = {
    escapeHtml, toast, confirmDialog, firstKey, renderFieldError,
    norm, includesQ, isoToYmd, addDaysYmd, isOverdue, bookBorrowedCount,
    normalizeIsbn, normalizeEmail, normalizeMemberCode,
  };
})();
