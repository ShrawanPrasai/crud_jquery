/* global window */
(function () {
  const DB_KEY = "lms_db_v1";

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function defaultDb() {
    const book1 = {
      id: uid("book"),
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "9780132350884",
      category: "Programming",
      copiesTotal: 3,
      copiesAvailable: 3,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const book2 = {
      id: uid("book"),
      title: "The Pragmatic Programmer",
      author: "Andrew Hunt, David Thomas",
      isbn: "9780201616224",
      category: "Programming",
      copiesTotal: 2,
      copiesAvailable: 2,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const member1 = {
      id: uid("mem"),
      name: "Asha Sharma",
      email: "asha@example.com",
      code: "M-1001",
      phone: "9800000001",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const member2 = {
      id: uid("mem"),
      name: "Ravi Gupta",
      email: "ravi@example.com",
      code: "M-1002",
      phone: "9800000002",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    return {
      schemaVersion: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      books: [book1, book2],
      members: [member1, member2],
      loans: [],
    };
  }

  function readDb() {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) return defaultDb();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 1) return defaultDb();
      return parsed;
    } catch {
      return defaultDb();
    }
  }

  function writeDb(db) {
    const safe = { ...db, updatedAt: nowIso() };
    window.localStorage.setItem(DB_KEY, JSON.stringify(safe));
    return safe;
  }

  function resetDb() {
    const db = defaultDb();
    writeDb(db);
    return db;
  }

  window.LMS = window.LMS || {};
  window.LMS.storage = {
    DB_KEY,
    uid,
    readDb,
    writeDb,
    resetDb,
  };
})();

