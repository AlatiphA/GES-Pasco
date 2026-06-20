const viewer =
  document.getElementById(
    "viewer"
  );

const toc =
  document.getElementById(
    "toc"
  );

const progressText =
  document.getElementById(
    "progressText"
  );

const progressFill =
  document.getElementById(
    "progressFill"
  );

const sidebar =
  document.getElementById(
    "sidebar"
  );

const menuBtn =
  document.getElementById(
    "menuBtn"
  );

const bookmarkBtn =
  document.getElementById(
    "bookmarkBtn"
  );

const themeBtn =
  document.getElementById(
    "themeBtn"
  );

const nextPage =
  document.getElementById(
    "nextPage"
  );

const prevPage =
  document.getElementById(
    "prevPage"
  );

const bottomDecreaseFont =
  document.getElementById(
    "bottomDecreaseFont"
  );

const bottomIncreaseFont =
  document.getElementById(
    "bottomIncreaseFont"
  );

const bottomMenuBtn =
  document.getElementById(
    "bottomMenuBtn"
  );

const searchBtn =
  document.getElementById(
    "searchBtn"
  );

const searchModal =
  document.getElementById(
    "searchModal"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const closeSearch =
  document.getElementById(
    "closeSearch"
  );

const searchResults =
  document.getElementById(
    "searchResults"
  );

const header =
  document.querySelector(
    "header"
  );

const footer =
  document.querySelector(
    "footer"
  );

const leftZone =
  document.getElementById(
    "leftZone"
  );

const centerZone =
  document.getElementById(
    "centerZone"
  );

const rightZone =
  document.getElementById(
    "rightZone"
  );


/* OTHER GLOBALS */

let book;
let rendition;
let currentLocation = null;

let activeSearchHighlight =
  null;

let controlsVisible =
  true;

let fontSize =
  Number(
    localStorage.getItem(
      "fontSize-beta"
    )
  ) || 100;


/* =========================
   APP VERSION
   Change this on every release
========================= */
const APP_VERSION = "3.3.8";

const versionEl =
  document.getElementById(
    "appVersion"
  );
if (versionEl)
  versionEl.textContent =
    "v" + APP_VERSION;

const READER_DATA_KEY =
  "epub-beta-reader-data";

const BOOKMARKS_KEY =
  "epub-beta-bookmarks";


/* =========================
   SAVE READER DATA
========================= */

function saveReaderData(
  data
) {

  try {

    localStorage.setItem(

      READER_DATA_KEY,

      JSON.stringify(data)

    );

  }

  catch (error) {

    console.error(
      error
    );

  }

}

/* =========================
   LOAD READER DATA
========================= */

function loadReaderData() {

  try {

    const saved =
      localStorage.getItem(
        READER_DATA_KEY
      );

    if (!saved)
      return {};

    return JSON.parse(
      saved
    );

  }

  catch (error) {

    console.error(
      error
    );

    return {};

  }

}


/* ==================
   BOOKMARKS
================== */

/* SAVE BOOKMARK */
function saveBookmark() {

  if (
    !rendition ||
    !currentLocation
  ) {

    return;

  }

  const bookmarks =
    JSON.parse(
      localStorage.getItem(
        BOOKMARKS_KEY
      ) || "[]"
    );

  const chapterName =
    getCurrentChapter(
      currentLocation.start.href
    );

  const rawPct =
    book.locations.total > 0
      ? book.locations.percentageFromCfi(
          currentLocation.start.cfi
        )
      : 0;

  const percent =
    Math.floor((rawPct || 0) * 100);

  bookmarks.push({

    cfi:
      currentLocation.start.cfi,

    chapter:
      chapterName,

    progress:
      percent,

    date:
      new Date()
        .toISOString()

  });

  localStorage.setItem(
    BOOKMARKS_KEY,
    JSON.stringify(
      bookmarks
    )
  );

  loadBookmarks();

  /* Switch sidebar to Bookmarks tab */
  document.querySelectorAll(
    ".sidebarTab"
  ).forEach(t =>
    t.classList.remove("active")
  );
  document.querySelectorAll(
    ".tabPanel"
  ).forEach(p =>
    p.classList.remove("active")
  );
  const bTab = document.querySelector(
    '[data-tab="bookmarks"]'
  );
  const bPanel = document.getElementById(
    "bookmarksPanel"
  );
  if (bTab) bTab.classList.add("active");
  if (bPanel) bPanel.classList.add("active");

}

/* LOAD BOOKMARKS */
function loadBookmarks() {

  const list =
    document.getElementById(
      "bookmarksList"
    );

  if (!list)
    return;

  list.innerHTML = "";

  const bookmarks =
    JSON.parse(
      localStorage.getItem(
        BOOKMARKS_KEY
      ) || "[]"
    );

  if (!bookmarks.length) {
    list.innerHTML =
      '<div class="noBookmarks">No bookmarks yet.<br>Tap <i class="fa-solid fa-bookmark"></i> while reading to add one.</div>';
    return;
  }

  bookmarks.forEach(
    (bookmark, index) => {

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "bookmarkRow";

      /* Navigate link */
      const item =
        document.createElement(
          "a"
        );

      item.href = "#";

      item.className =
        "bookmarkLink";

      item.textContent =
        bookmark.chapter +
        " (" +
        bookmark.progress +
        "%)";

      item.addEventListener(
        "click",
        e => {

          e.preventDefault();

          rendition.display(
            bookmark.cfi
          );

          // closeSidebar();
          toggleSidebar();

          hideControls();

        }
      );

      /* Delete button */
      const del =
        document.createElement(
          "button"
        );

      del.className =
        "bookmarkDelete";

      del.title =
        "Delete bookmark";

      del.innerHTML = '<i class="fa-solid fa-trash"></i>';

      del.addEventListener(
        "click",
        e => {

          e.stopPropagation();

          const all =
            JSON.parse(
              localStorage.getItem(
                BOOKMARKS_KEY
              ) || "[]"
            );

          all.splice(index, 1);

          localStorage.setItem(
            BOOKMARKS_KEY,
            JSON.stringify(all)
          );

          loadBookmarks();

        }
      );

      row.appendChild(item);
      row.appendChild(del);
      list.appendChild(row);

    }
  );

}


/* ==============
   LOAD BOOK
============== */

async function loadBook() {

  try {

    const response =
      await fetch(
        "./library/sample.epub"
      );

    if (!response.ok) {

      throw new Error(
        "EPUB file not found."
      );

    }

    const blob =
      await response.blob();

    book = ePub(blob);

    startReader();

  }

  catch (error) {

    console.error(error);

    alert(
      "Failed to load EPUB."
    );

  }

}


/* =================
   CHAPTERS
================= */

function getCurrentChapter(
  href
) {

  if (
    !book ||
    !book.navigation ||
    !book.navigation.toc
  ) {

    return "";

  }

  let result = "";

  function search(
    items
  ) {

    items.forEach(
      item => {

        if (
          href.includes(
            item.href.split("#")[0]
          )
        ) {

          result =
            item.label;

        }

        if (
          item.subitems &&
          item.subitems.length
        ) {

          search(
            item.subitems
          );

        }

      }
    );

  }

  search(
    book.navigation.toc
  );

  return result;

}


/* =================
   BUILD TOC
================= */

function buildTOC(
  item,
  level = 0,
  parent = toc
) {

  const row =
    document.createElement(
      "div"
    );

  row.className =
    "tocItem";

  row.style.paddingLeft =
    (level * 20) + "px";

  const toggle =
    document.createElement(
      "span"
    );

  toggle.className =
    "tocToggle";

  const hasChildren =
    item.subitems &&
    item.subitems.length;

  toggle.innerHTML =
    hasChildren
      ? '<i class="fa-solid fa-chevron-right"></i>'
      : "";

  const link =
    document.createElement(
      "a"
    );

  link.textContent =
    item.label;

  link.href = "#";

  link.addEventListener(
    "click",
    e => {

      e.preventDefault();

      rendition.display(
        item.href
      );

      // closeSidebar();
        toggleSidebar();
      
      hideControls();

    }
  );

  row.appendChild(
    toggle
  );

  row.appendChild(
    link
  );

  parent.appendChild(
    row
  );

  if (hasChildren) {

    const children =
      document.createElement(
        "div"
      );

    children.className =
      "tocChildren";

    parent.appendChild(
      children
    );

    toggle.addEventListener(
      "click",
      e => {

        e.stopPropagation();

        children.classList.toggle(
          "open"
        );

        toggle.innerHTML =
          children.classList.contains(
            "open"
          )
            ? '<i class="fa-solid fa-chevron-down"></i>'
            : '<i class="fa-solid fa-chevron-right"></i>';

      }
    );

    item.subitems.forEach(
      child => {

        buildTOC(
          child,
          level + 1,
          children
        );

      }
    );

  }

}


/* =================
   START READER
================= */

/* =========================
   SLIDE PAGE ANIMATION
========================= */

let _sliding = false;

function slidePage(direction, action) {

  if (_sliding) return;
  _sliding = true;

  const viewer =
    document.getElementById("viewer");

  /* Slide out current page */
  viewer.style.transition =
    "transform 0.22s cubic-bezier(0.4,0,0.2,1)," +
    "opacity 0.22s ease";

  viewer.style.transform =
    direction === "next"
      ? "translateX(-100%)"
      : "translateX(100%)";

  viewer.style.opacity = "0";

  setTimeout(() => {

    /* Turn the page */
    action();

    /* Position new page on opposite side */
    viewer.style.transition = "none";
    viewer.style.transform =
      direction === "next"
        ? "translateX(100%)"
        : "translateX(-100%)";

    /* Force reflow */
    void viewer.offsetWidth;

    /* Slide in */
    viewer.style.transition =
      "transform 0.22s cubic-bezier(0.4,0,0.2,1)," +
      "opacity 0.22s ease";
    viewer.style.transform = "translateX(0)";
    viewer.style.opacity = "1";

    setTimeout(() => {
      viewer.style.transition = "";
      _sliding = false;
    }, 230);

  }, 220);

}

function pageNext() {
  if (!rendition || _sliding) return;
  slidePage("next", () => rendition.next());
}

function pagePrev() {
  if (!rendition || _sliding) return;
  slidePage("prev", () => rendition.prev());
}

function startReader() {

  rendition =
    book.renderTo(
      "viewer",
      {
        width: "100%",
        height: "100%",
        spread: "none",
        manager: "default",
        flow: "paginated",
        snap: true
      }
    );

  /* FONT & THEME */
  
  rendition.themes.fontSize(
    fontSize + "%"
  );

  applyTheme();

  setupNavigationZones();

  hideControls();

  /* DISPLAY IMMEDIATELY — don't wait for locations */

  const readerData = loadReaderData();
  const savedLocation = readerData.location;

  rendition
    .display(savedLocation || undefined)
    .catch(() => rendition.display());

  /* BACKGROUND SETUP — TOC + locations, never blocks rendering */

  book.ready.then(() => {

    toc.innerHTML = "";

    book.navigation.toc.forEach(item => {
      buildTOC(item);
    });
    loadBookmarks();

    /* Generate locations in background — progress works once ready */
    book.locations
      .generate(1000)
      .catch(err => console.warn("Locations:", err));

  });

  /* =========================
     LINKS, CONTENTS & FOOTNOTES
     Runs every time a page renders
  ========================= */

  rendition.on("rendered", (section, view) => {

    const doc =
      view?.document ||
      view?.iframe?.contentDocument;

    if (!doc || !doc.body) return;

    /* Disable text selection in iframe —
       browser menu won't appear at all */
    const noSelStyle =
      doc.getElementById("noSelStyle") ||
      doc.createElement("style");
    noSelStyle.id = "noSelStyle";
    noSelStyle.textContent =
      "body, * { " +
      "  -webkit-user-select: none !important;" +
      "  user-select: none !important;" +
      "}";
    if (!doc.getElementById("noSelStyle"))
      doc.head.appendChild(noSelStyle);

    /* Touch navigation inside iframe
       so taps reach links naturally */
    let _tx = null, _ty = null, _tt = null;

    doc.addEventListener("touchstart", e => {
      _tx = e.touches[0].clientX;
      _ty = e.touches[0].clientY;
      _tt = Date.now();
    }, { passive: true });

    doc.addEventListener("touchend", e => {
      const t = e.changedTouches[0];

      /* If sidebar is open, any tap on the
         reader area (inside iframe) closes it */
      if (sidebarIsOpen()) {
        // closeSidebar();
        toggleSidebar();
        _tx = null;
        return;
      }

      if (_tx === null) { _tx = null; return; }
      const dx = t.clientX - _tx;
      const dy = t.clientY - _ty;
      const dt = Date.now() - _tt;
      _tx = null;
      /* Ignore swipes or long press */
      if (Math.abs(dx) > 25 || Math.abs(dy) > 25 || dt > 500) return;
      /* Bail if tap was on a link — let click handle it */
      const el = doc.elementFromPoint(t.clientX, t.clientY);
      if (el && el.closest("a")) return;
      /* Use screen coords via getBoundingClientRect
         because iframe clientX is relative to iframe */
      const iframe = viewer.querySelector("iframe");
      const rect = iframe
        ? iframe.getBoundingClientRect()
        : { left: 0, width: window.innerWidth };
      const screenX = rect.left + t.clientX;
      const W = window.innerWidth;
      if (screenX < W * 0.3) { pagePrev(); hideControls(); }
      else if (screenX > W * 0.7) { pageNext(); hideControls(); }
      else { toggleControls(); }
    }, { passive: true });

    doc.querySelectorAll("a[href]")
      .forEach(anchor => {

        anchor.addEventListener("click", e => {

          e.preventDefault();
          e.stopPropagation();

          const href =
            anchor.getAttribute("href") || "";

          const epubType =
            anchor.getAttribute("epub:type") || "";

          const role =
            anchor.getAttribute("role") || "";

          /* Footnote ref */
          const isNote =
            epubType.includes("noteref") ||
            role.includes("doc-noteref") ||
            anchor.classList.contains("footnote") ||
            anchor.classList.contains("endnote");

          if (isNote && href.startsWith("#")) {
            const el = doc.getElementById(href.slice(1));
            if (el) { showFootnote(el); return; }
          }

          /* Fragment (#id) — treat as footnote */
          if (href.startsWith("#")) {
            const el = doc.getElementById(href.slice(1));
            if (el) showFootnote(el);
            return;
          }

          /* External */
          if (/^https?:\/\//.test(href)) {
            if (confirm("Open link?\n" + href))
              window.open(href, "_blank", "noopener");
            return;
          }

          /* Internal chapter nav */
          rendition.display(href)
            .catch(err => console.error(err));

        });

      });

  });

  /* Footnote popup */
  function showFootnote(el) {

    document.getElementById("fnPopup")?.remove();

    const clone = el.cloneNode(true);
    clone.querySelectorAll(
      'a.backlink'
    ).forEach(a => a.remove());

    const isDark =
      document.body.classList.contains("dark") ||
      document.body.classList.contains("night");

    const popup = document.createElement("div");
    popup.id = "fnPopup";
    Object.assign(popup.style, {
      position: "fixed",
      bottom: "70px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(480px, 90vw)",
      background: isDark ? "#1e1e1e" : "#fffdf6",
      color: isDark ? "#eee" : "#111",
      border: "1px solid #888",
      borderRadius: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      zIndex: "99999",
      overflow: "hidden",
      fontSize: "14px",
      fontFamily: "Arial, sans-serif",
    });
    popup.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'padding:8px 12px;border-bottom:1px solid #555;font-size:11px;' +
      'text-transform:uppercase;letter-spacing:.08em;color:#aaa;">' +
      '<span>Footnote</span>' +
      '<button id="fnClose" style="background:none;border:none;cursor:pointer;' +
      'color:inherit;font-size:18px;padding:2px 6px;">✕</button></div>' +
      '<div style="padding:12px 14px;max-height:200px;overflow-y:auto;line-height:1.6;">' +
      clone.innerHTML + '</div>';

    document.body.appendChild(popup);

    document.getElementById("fnClose")
      .addEventListener("click", () => popup.remove());

    setTimeout(() => {
      document.addEventListener("click", function h(e) {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener("click", h);
        }
      });
    }, 150);

  }

    /* SAVE LOCATION */

  rendition.on(
   "relocated",
   location => {

    try {

      currentLocation =
        location;

      /* =========================
         CALCULATE PROGRESS
      ========================= */

      const percentage =
        book.locations
          .percentageFromCfi(
            location.start.cfi
          );

      const percent =
        Math.floor(
          percentage * 100
        );

      /* =========================
         SAVE READER DATA
      ========================= */

      const readerData = {

        location:
          location.start.cfi,

        progress:
          percent,

        lastRead:
          new Date()
            .toISOString(),

        chapter:
          location.start.href

      };

      saveReaderData(
        readerData
      );

      /* =========================
         UPDATE UI
      ========================= */

      progressText.textContent =
        percent + "%";

      progressFill.style.width =
        percent + "%";
      
      const readingInfo =
        document.getElementById(
        "readingInfo"
      );

      if (readingInfo) {

      const chapterName =
        getCurrentChapter(
        location.start.href
      );

      readingInfo.textContent =
        chapterName +
        " • " +
        percent +
        "%";

    }
      
 }

      catch (error) {

       console.error(
        error
      );

    }

   }
    
 );

}  


/* ===================
   CONTROLS
=================== */

/* ===== HIDE HEADER ===== */

function hideHeader() {

  header.classList.add(
    "hideControls"
  );

}

/* ===== SHOW HEADER ===== */
function showHeader() {

  header.classList.remove(
    "hideControls"
  );

}

/* ===== HIDE FOOTER ===== */
function hideFooter() {

  footer.classList.add(
    "hideControls"
  );

}

/* ===== SHOW FOOTER ===== */
function showFooter() {

  footer.classList.remove(
    "hideControls"
  );

}

/* ===== HIDE CONTROLS ===== */
function hideControls() {

  hideHeader();

  hideFooter();

  controlsVisible = false;

  document.body.classList.add(
    "readingMode"
  );

}

/* ===== SHOW CONTROLS ===== */
function showControls() {

  showHeader();

  showFooter();

  controlsVisible = true;

  document.body.classList.remove(
    "readingMode"
  );

}

/* ===== TOGGLE CONTROLS - middle tap ===== */
function toggleControls() {

  controlsVisible
    ? hideControls()
    : showControls();

}


/* =========================
 GESTURES (Tap Next/Prev)
========================= */

/* GESTURES (Sidebar) */

function sidebarIsOpen() {

  return sidebar.classList.contains(
    "active"
  );

}

/* GESTURES (Navigation) */

function setupNavigationZones() {

  /* Desktop mouse clicks on zones */
  leftZone.addEventListener("click", () => {
    if (sidebarIsOpen()) return;
    pagePrev();
    hideControls();
  });

  rightZone.addEventListener("click", () => {
    if (sidebarIsOpen()) return;
    pageNext();
    hideControls();
  });

  centerZone.addEventListener("click", () => {
    if (sidebarIsOpen()) return;
    toggleControls();
  });

  /* Keyboard (desktop) */
  document.addEventListener("keydown", e => {
    if (!rendition) return;
    if (document.activeElement === searchInput) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault(); pageNext();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault(); pagePrev();
    }
  });

}


/* =========================
   THEME ENGINE
========================= */

const THEMES = {
  light: {
    bg:    "#f5f5f5",
    color: "#111111",
    link:  "#1565c0",
  },
  dark: {
    bg:    "#111111",
    color: "#eeeeee",
    link:  "#4dabff",
  },
  sepia: {
    bg:    "#f4ede0",
    color: "#2c1a0e",
    link:  "#7a4a1a",
  },
  night: {
    bg:    "#000000",
    color: "#bbbbbb",
    link:  "#4dabff",
  },
};

function applyTheme(theme) {

  if (!theme) {
    theme = localStorage.getItem(
      "theme-v2"
    ) || "dark";
  }

  localStorage.setItem(
    "theme-v2", theme
  );

  /* Remove all theme classes */
  document.body.classList.remove(
    "dark", "sepia", "night"
  );

  if (theme !== "light") {
    document.body.classList.add(theme);
  }

  /* Mark active option */
  document.querySelectorAll(
    ".themeOption"
  ).forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.theme === theme
    );
  });

  if (!rendition) return;

  const t = THEMES[theme] || THEMES.dark;

  rendition.themes.default({
    body: {
      background:   t.bg,
      color:        t.color,
      padding:      "20px",
      "line-height":"1.7",
      "font-family":"Arial, sans-serif",
    },
    a: { color: t.link },
  });

  rendition.themes.fontSize(
    fontSize + "%"
  );

}


/* =========================
   THEME OPTION CLICKS
========================= */

document.querySelectorAll(
  ".themeOption"
).forEach(btn => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.theme);
    closeThemePicker();
  });
});

/* =============
   SEARCH BOOK
============= */

async function searchBook(
  query
) {

  searchResults.innerHTML =
    "Searching...";

  const results = [];

  try {

    for (
      const item of book.spine.spineItems
    ) {

      await item.load(
        book.load.bind(book)
      );

      const doc =
        item.document;

      const walker =
        doc.createTreeWalker(
          doc.body,
          NodeFilter.SHOW_TEXT
        );

      let node;

      while (
        (node = walker.nextNode())
      ) {

        const text =
          node.textContent;

        const lowerText =
          text.toLowerCase();

        const lowerQuery =
          query.toLowerCase();

        const index =
          lowerText.indexOf(
            lowerQuery
          );

        if (index !== -1) {

          const range =
            doc.createRange();

          range.setStart(
            node,
            index
          );

          range.setEnd(
            node,
            index +
            query.length
          );

          const cfi =
            item.cfiFromRange(
              range
            );

          const snippet =
            text.substring(
              Math.max(
                0,
                index - 40
              ),
              index + 80
            );

          results.push({

            cfi,

            excerpt:
              snippet

          });

        }

      }

      item.unload();

    }

    renderSearchResults(
      results
    );

  }

  catch (error) {

    console.error(error);

    searchResults.innerHTML =
      "Search failed.";

  }

}


/* =============
   SEARCH RESULTS 
============= */ 

function renderSearchResults(
  results
) {

  searchResults.innerHTML =
    "";

  if (!results.length) {

    searchResults.innerHTML =
      "No results found.";

    return;

  }

  results.forEach(
    result => {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "searchItem";

      div.textContent =
        result.excerpt;

      div.addEventListener(
       "click",
        async () => {

      try {

      /* OPEN LOCATION */

      await rendition.display(
        result.cfi
      );

      /* REMOVE OLD HIGHLIGHT */

      if (
        activeSearchHighlight
      ) {

        rendition.annotations.remove(
          activeSearchHighlight,
          "highlight"
        );

      }

      /* ADD HIGHLIGHT */

      rendition.annotations.highlight(

        result.cfi,

        {},

        null,

        "search-highlight",

        {

          fill: "yellow",

          "fill-opacity": "0.35"

        }

      );

      /* SAVE ACTIVE */

      activeSearchHighlight =
        result.cfi;

      /* CLOSE SEARCH */

      searchModal.classList.remove(
        "active"
      );

    }

    catch (error) {

      console.error(
        error
      );

      alert(
        "Could not open result."
      );

     }

    }
  );

      searchResults.appendChild(
        div
      );

    }
  );

}


/* =========================
   UPDATE MENU ICONS
========================= */

function updateMenuButtons() {

  const isOpen =
    sidebar.classList.contains(
      "active"
    );

  const icon =
    isOpen
      ? "✕"
      : "☰";

  menuBtn.textContent =
    icon;

  bottomMenuBtn.textContent =
    icon;

}

/* TOGGLE SIDEBAR */

function toggleSidebar() {

  const isOpen =
    sidebar.classList.contains(
      "active"
    );

  if (isOpen) {

    /* X pressed */

    sidebar.classList.remove(
      "active"
    );

    updateMenuButtons();

    hideControls();

  }

  else {

    /* ☰ pressed */

    sidebar.classList.add(
      "active"
    );

    updateMenuButtons();

    showHeader();

    hideFooter();

  }

}


/* CLOSE SIDEBAR */

function closeSidebar() {
  sidebar.classList.remove("active");
  
  updateMenuButtons();
  
  hideHeader();

}

/* MENU EVENTS */

menuBtn.addEventListener(
  "click",
  toggleSidebar
);

bottomMenuBtn.addEventListener(
  "click",
  toggleSidebar
);


/* ==========
   OTHER EVENTS
========== */

/* Theme button — toggle picker panel */
const themePicker =
  document.getElementById(
    "themePicker"
  );

function toggleThemePicker() {
  themePicker.classList.toggle("open");
}

function closeThemePicker() {
  themePicker.classList.remove("open");
}

themeBtn.addEventListener(
  "click",
  e => {
    e.stopPropagation();
    toggleThemePicker();
  }
);

/* Close picker when nav zones are tapped */
[leftZone, centerZone, rightZone].forEach(
  zone => zone.addEventListener(
    "click",
    () => closeThemePicker()
  )
);

nextPage.addEventListener(
  "click",
  () => {

    pageNext();

    hideHeader();

  }
);

prevPage.addEventListener(
  "click",
  () => {

    pagePrev();
    
    hideHeader();

  }
);

bookmarkBtn.addEventListener(
  "click",
  () => {

    saveBookmark();

    alert(
      "Bookmark saved"
    );

  }
);

bottomDecreaseFont.addEventListener(
  "click",
  () => {

    if (fontSize <= 70)
      return;

    fontSize -= 10;

    rendition.themes.fontSize(
      fontSize + "%"
    );

    localStorage.setItem(
      "fontSize-beta",
      fontSize
    );

  }
);

bottomIncreaseFont.addEventListener(
  "click",
  () => {

    fontSize += 10;

    rendition.themes.fontSize(
      fontSize + "%"
    );

    localStorage.setItem(
      "fontSize-beta",
      fontSize
    );

  }
);

searchBtn.addEventListener(
  "click",
  () => {

    searchModal.classList.add(
      "active"
    );

    searchInput.focus();

    hideControls();

  }
);

closeSearch.addEventListener(
  "click",
  () => {

    searchModal.classList.remove(
      "active"
    );

    hideControls();

  }
);

searchInput.addEventListener(
  "keydown",
  e => {

    if (
      e.key === "Enter"
    ) {

      const query =
        searchInput.value.trim();

      if (!query)
        return;

      searchBook(query);

    }

  }
);


/* ================
   SERVICE WORKER
================ */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    async () => {

      try {

        await navigator
          .serviceWorker
          .register(
            "./sw-beta.js"
          );

      }

      catch (error) {

        console.error(error);

      }

    }
  );

}

/* =========================
   SIDEBAR TAB SWITCHING
========================= */

document.querySelectorAll(".sidebarTab")
  .forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".sidebarTab")
        .forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".tabPanel")
        .forEach(p => p.classList.remove("active"));
      const target = document.getElementById(
        tab.dataset.tab === "toc"
          ? "tocPanel"
          : "bookmarksPanel"
      );
      if (target) target.classList.add("active");
    });
  });

/* =========================
   SIDEBAR GESTURES
   Tap outside + swipe left to close
========================= */

/* 1. Click outside — desktop */
document.addEventListener("click", e => {
  if (
    sidebar.classList.contains("active") &&
    !sidebar.contains(e.target) &&
    e.target !== menuBtn &&
    e.target !== bottomMenuBtn
  ) {
    toggleSidebar();
  }
});

/* 2. Swipe left ON SIDEBAR — mobile
   Attached to sidebar so it doesn't
   compete with iframe touch handlers */
let swipeStartX = null;
let swipeStartY = null;

sidebar.addEventListener("touchstart", e => {
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, { passive: true });

sidebar.addEventListener("touchend", e => {
  if (swipeStartX === null) return;
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  swipeStartX = null;
  swipeStartY = null;
  if (dx < -50 && Math.abs(dx) > Math.abs(dy)) {
    toggleSidebar();
  }
}, { passive: true });

/* 3. Tap outside — mobile
   Track touchstart at document level
   so we know where the finger started
   regardless of what the iframe does */
let _tapStartX = null, _tapStartY = null;

document.addEventListener("touchstart", e => {
  if (!sidebar.classList.contains("active")) return;
  _tapStartX = e.touches[0].clientX;
  _tapStartY = e.touches[0].clientY;
}, { passive: true, capture: true });

document.addEventListener("touchend", e => {
  if (!sidebar.classList.contains("active")) {
    _tapStartX = null; return;
  }
  if (_tapStartX === null) return;

  const t  = e.changedTouches[0];
  const dx = Math.abs(t.clientX - _tapStartX);
  const dy = Math.abs(t.clientY - _tapStartY);
  _tapStartX = null;

  /* Only act on short taps, not swipes */
  if (dx > 15 || dy > 15) return;

  /* Use capture-phase coordinates to
     find element before iframe consumes */
  const el = document.elementFromPoint(
    t.clientX, t.clientY
  );

  if (
    el &&
    !sidebar.contains(el) &&
    !menuBtn.contains(el) &&
    !bottomMenuBtn.contains(el)
  ) {
    toggleSidebar();
  }
}, { passive: true, capture: true });

loadBook();

