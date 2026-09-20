/* =====================================================
   GES Pasco v1.0.2 - Firestore Sync
   Local-first reading position, bookmarks and preferences.
===================================================== */
(() => {
  "use strict";

  const READER_KEY = "ges-pasco-data";
  const BOOKMARKS_KEY = "ges-pasco-bookmarks";
  const PREF_META_KEY = "ges-pasco-preferences-meta";
  const SYNC_DELAY_MS = 2500;

  let currentUser = null;
  let positionTimer = null;
  let preferenceTimer = null;
  let pendingPosition = null;
  let pendingPreferences = null;
  let positionWriteInFlight = false;

  function parseDate(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  }

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
    catch (_) { return fallback; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn("Could not save local sync data:", error); }
  }

  function readerRef(user) {
    return gesPascoDb.collection("users").doc(user.uid)
      .collection("readerData").doc("default");
  }

  function preferencesRef(user) {
    return gesPascoDb.collection("users").doc(user.uid)
      .collection("readerData").doc("preferences");
  }

  function bookmarksRef(user) {
    return gesPascoDb.collection("users").doc(user.uid).collection("bookmarks");
  }

  function usablePosition(data) {
    return Boolean(data && typeof data.location === "string" && data.location.trim());
  }

  async function writePosition(data) {
    if (!currentUser || !usablePosition(data)) return;
    await readerRef(currentUser).set({
      location: data.location,
      progress: Number.isFinite(Number(data.progress)) ? Number(data.progress) : 0,
      chapter: data.chapter || "",
      lastRead: data.lastRead || new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function flushPosition() {
    if (positionWriteInFlight || !pendingPosition || !currentUser) return;
    const data = pendingPosition;
    pendingPosition = null;
    positionWriteInFlight = true;
    try { await writePosition(data); }
    catch (error) {
      pendingPosition = data;
      console.warn("Reading position cloud sync deferred:", error);
    } finally { positionWriteInFlight = false; }
  }

  function queue(data) {
    if (!currentUser || !usablePosition(data)) return;
    pendingPosition = { ...data };
    clearTimeout(positionTimer);
    positionTimer = setTimeout(flushPosition, SYNC_DELAY_MS);
  }

  async function preparePosition() {
    const local = readJSON(READER_KEY, {});
    try {
      const snap = await readerRef(currentUser).get();
      const cloud = snap.exists ? (snap.data() || {}) : {};
      const hasLocal = usablePosition(local), hasCloud = usablePosition(cloud);
      if (hasCloud && (!hasLocal || parseDate(cloud.lastRead) > parseDate(local.lastRead))) {
        const restored = {
          location: cloud.location,
          progress: Number(cloud.progress) || 0,
          lastRead: cloud.lastRead || new Date().toISOString(),
          chapter: cloud.chapter || ""
        };
        writeJSON(READER_KEY, restored);
        return;
      }
      if (hasLocal && (!hasCloud || parseDate(local.lastRead) > parseDate(cloud.lastRead))) {
        await writePosition(local);
      }
    } catch (error) {
      console.warn("Cloud reading position unavailable, using local copy:", error);
    }
  }

  function bookmarkId(cfi) {
    // Stable FNV-1a style id. Same CFI maps to the same cloud document.
    let h = 2166136261;
    const text = String(cfi || "");
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "b_" + (h >>> 0).toString(36);
  }

  function normalizeBookmark(b) {
    return {
      cfi: String((b && b.cfi) || ""),
      chapter: String((b && b.chapter) || ""),
      progress: Number((b && b.progress) || 0),
      date: (b && b.date) || new Date().toISOString()
    };
  }

  function mergeBookmarks(local, cloud) {
    const map = new Map();
    [...cloud, ...local].forEach(raw => {
      const b = normalizeBookmark(raw);
      if (!b.cfi) return;
      const old = map.get(b.cfi);
      if (!old || parseDate(b.date) >= parseDate(old.date)) map.set(b.cfi, b);
    });
    return Array.from(map.values()).sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }

  async function writeBookmarkSet(bookmarks) {
    if (!currentUser) return;
    const ref = bookmarksRef(currentUser);
    const snap = await ref.get();
    const wanted = new Map(bookmarks.filter(b => b && b.cfi).map(b => [bookmarkId(b.cfi), normalizeBookmark(b)]));
    const batch = gesPascoDb.batch();
    snap.docs.forEach(doc => { if (!wanted.has(doc.id)) batch.delete(doc.ref); });
    wanted.forEach((b, id) => {
      batch.set(ref.doc(id), { ...b, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  }

  async function prepareBookmarks() {
    const local = readJSON(BOOKMARKS_KEY, []);
    try {
      const snap = await bookmarksRef(currentUser).get();
      const cloud = snap.docs.map(doc => doc.data() || {}).filter(b => b.cfi);
      // Migration is union-based: existing local bookmarks are never overwritten.
      const merged = mergeBookmarks(Array.isArray(local) ? local : [], cloud);
      writeJSON(BOOKMARKS_KEY, merged);
      await writeBookmarkSet(merged);
    } catch (error) {
      console.warn("Bookmark cloud sync unavailable, keeping local bookmarks:", error);
    }
  }

  async function syncBookmarks(bookmarks) {
    if (!currentUser) return;
    try { await writeBookmarkSet(Array.isArray(bookmarks) ? bookmarks : []); }
    catch (error) { console.warn("Bookmark cloud sync deferred:", error); }
  }

  function readPreferences() {
    return {
      theme: localStorage.getItem("theme-v2") || "dark",
      fontSize: Number(localStorage.getItem("fontSize")) || 100,
      fontFamily: localStorage.getItem("fontFamily") || "serif",
      lastChanged: localStorage.getItem(PREF_META_KEY) || ""
    };
  }

  function writePreferencesLocal(p) {
    if (p.theme) localStorage.setItem("theme-v2", p.theme);
    if (Number.isFinite(Number(p.fontSize))) localStorage.setItem("fontSize", String(Number(p.fontSize)));
    if (p.fontFamily) localStorage.setItem("fontFamily", p.fontFamily);
    if (p.lastChanged) localStorage.setItem(PREF_META_KEY, p.lastChanged);
  }

  async function writePreferencesCloud(p) {
    if (!currentUser) return;
    await preferencesRef(currentUser).set({
      theme: p.theme || "dark",
      fontSize: Number(p.fontSize) || 100,
      fontFamily: p.fontFamily || "serif",
      lastChanged: p.lastChanged || new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function flushPreferences() {
    if (!pendingPreferences || !currentUser) return;
    const p = pendingPreferences;
    pendingPreferences = null;
    try { await writePreferencesCloud(p); }
    catch (error) {
      pendingPreferences = p;
      console.warn("Preference cloud sync deferred:", error);
    }
  }

  function queuePreferences(p) {
    const data = {
      theme: p.theme || "dark",
      fontSize: Number(p.fontSize) || 100,
      fontFamily: p.fontFamily || "serif",
      lastChanged: new Date().toISOString()
    };
    writePreferencesLocal(data);
    if (!currentUser) return;
    pendingPreferences = data;
    clearTimeout(preferenceTimer);
    preferenceTimer = setTimeout(flushPreferences, 1200);
  }

  async function preparePreferences() {
    const local = readPreferences();
    try {
      const snap = await preferencesRef(currentUser).get();
      if (!snap.exists) {
        const migrated = { ...local, lastChanged: local.lastChanged || new Date().toISOString() };
        writePreferencesLocal(migrated);
        await writePreferencesCloud(migrated);
        return;
      }
      const cloud = snap.data() || {};
      const localTime = parseDate(local.lastChanged);
      const cloudTime = parseDate(cloud.lastChanged) || parseDate(cloud.updatedAt);
      // Legacy local preferences have no timestamp. If cloud exists, cloud wins;
      // otherwise the legacy local values were migrated above.
      if (cloudTime >= localTime) {
        writePreferencesLocal({
          theme: cloud.theme || local.theme,
          fontSize: Number(cloud.fontSize) || local.fontSize,
          fontFamily: cloud.fontFamily || local.fontFamily,
          lastChanged: cloud.lastChanged || new Date(cloudTime || Date.now()).toISOString()
        });
      } else {
        await writePreferencesCloud(local);
      }
    } catch (error) {
      console.warn("Preference cloud sync unavailable, keeping local preferences:", error);
    }
  }

  async function prepare(user) {
    currentUser = user || null;
    pendingPosition = null;
    pendingPreferences = null;
    clearTimeout(positionTimer);
    clearTimeout(preferenceTimer);
    if (!currentUser) return;
    // Complete local restoration before app.js is loaded.
    await Promise.all([preparePosition(), prepareBookmarks(), preparePreferences()]);
  }

  async function flush() {
    await Promise.all([flushPosition(), flushPreferences()]);
  }

  function clearUser() {
    currentUser = null;
    pendingPosition = null;
    pendingPreferences = null;
    clearTimeout(positionTimer);
    clearTimeout(preferenceTimer);
  }

  window.addEventListener("online", () => { flush(); });
  window.addEventListener("pagehide", () => { flush(); });

  window.gesPascoReaderSync = {
    prepare,
    queue,
    flush,
    clearUser,
    syncBookmarks,
    queuePreferences
  };
})();
