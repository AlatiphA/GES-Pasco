/* =====================================================
   GES Pasco v1.0.1 - Reading Position Sync
   Local-first reader state with Firestore cloud backup.
===================================================== */
(() => {
  "use strict";

  const LOCAL_KEY = "ges-pasco-data";
  const SYNC_DELAY_MS = 2500;
  let currentUser = null;
  let syncTimer = null;
  let pendingData = null;
  let writeInFlight = false;

  function parseDate(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  }

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {};
    } catch (error) {
      console.warn("Could not read local reader position:", error);
      return {};
    }
  }

  function writeLocal(data) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Could not save restored reader position locally:", error);
    }
  }

  function usable(data) {
    return Boolean(data && typeof data.location === "string" && data.location.trim());
  }

  function readerRef(user) {
    return gesPascoDb.collection("users").doc(user.uid)
      .collection("readerData").doc("default");
  }

  async function writeCloud(data) {
    if (!currentUser || !usable(data)) return;
    await readerRef(currentUser).set({
      location: data.location,
      progress: Number.isFinite(Number(data.progress)) ? Number(data.progress) : 0,
      chapter: data.chapter || "",
      lastRead: data.lastRead || new Date().toISOString(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function flush() {
    if (writeInFlight || !pendingData || !currentUser) return;
    const data = pendingData;
    pendingData = null;
    writeInFlight = true;
    try {
      await writeCloud(data);
    } catch (error) {
      // Local storage is already authoritative offline. Keep the newest data
      // pending so a later page move / online event can retry it.
      pendingData = data;
      console.warn("Reading position cloud sync deferred:", error);
    } finally {
      writeInFlight = false;
    }
  }

  function queue(data) {
    if (!currentUser || !usable(data)) return;
    pendingData = { ...data };
    clearTimeout(syncTimer);
    syncTimer = setTimeout(flush, SYNC_DELAY_MS);
  }

  async function prepare(user) {
    currentUser = user || null;
    pendingData = null;
    clearTimeout(syncTimer);
    if (!currentUser) return { source: "none" };

    const local = readLocal();
    try {
      const snap = await readerRef(currentUser).get();
      const cloud = snap.exists ? (snap.data() || {}) : {};
      const hasLocal = usable(local);
      const hasCloud = usable(cloud);

      if (hasCloud && (!hasLocal || parseDate(cloud.lastRead) > parseDate(local.lastRead))) {
        const restored = {
          location: cloud.location,
          progress: Number(cloud.progress) || 0,
          lastRead: cloud.lastRead || new Date().toISOString(),
          chapter: cloud.chapter || ""
        };
        writeLocal(restored);
        return { source: "cloud", data: restored };
      }

      if (hasLocal && (!hasCloud || parseDate(local.lastRead) > parseDate(cloud.lastRead))) {
        await writeCloud(local);
        return { source: "local", data: local };
      }

      return { source: hasLocal ? "local" : (hasCloud ? "cloud" : "none"), data: hasLocal ? local : cloud };
    } catch (error) {
      console.warn("Cloud reading position unavailable, using local copy:", error);
      return { source: usable(local) ? "local" : "none", data: local };
    }
  }

  function clearUser() {
    currentUser = null;
    pendingData = null;
    clearTimeout(syncTimer);
  }

  window.addEventListener("online", () => {
    if (pendingData) flush();
  });

  window.addEventListener("pagehide", () => {
    // Best effort only. The local copy was already saved synchronously.
    if (pendingData) flush();
  });

  window.gesPascoReaderSync = { prepare, queue, flush, clearUser };
})();
