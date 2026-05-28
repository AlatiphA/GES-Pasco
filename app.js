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

const bottomThemeBtn =
  document.getElementById(
    "bottomThemeBtn"
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

let rendition;
let book;

let controlsVisible =
  true;

let fontSize =
  Number(
    localStorage.getItem(
      "fontSize"
    )
  ) || 100;


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
   START READER
================= */

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

  /* RESTORE SAVED LOCATION */

  const savedLocation =
    localStorage.getItem(
      "epub-location"
    );

  rendition.display(
    savedLocation || undefined
  );

  /* BACKGROUND SETUP */

  book.ready
    .then(async () => {

      /* TOC */

      toc.innerHTML = "";

      const navigation =
        book.navigation;

      navigation.toc.forEach(
        chapter => {

          const link =
            document.createElement(
              "a"
            );

          link.textContent =
            chapter.label;

          link.href = "#";

          link.addEventListener(
            "click",
            e => {

              e.preventDefault();

              rendition.display(
                chapter.href
              );

              sidebar.classList.remove(
                "active"
              );

              showControls();

            }
          );

          toc.appendChild(
            link
          );

        }
      );

      /* GENERATE LOCATIONS */

      await book.locations.generate(
        1000
      );

    });

  /* SAVE LOCATION */

  rendition.on(
    "relocated",
    location => {

      try {

        localStorage.setItem(
          "epub-location",
          location.start.cfi
        );

        if (
          book.locations.length()
        ) {

          const percentage =
            book.locations
              .percentageFromCfi(
                location.start.cfi
              );

          const percent =
            Math.floor(
              percentage * 100
            );

          progressText.textContent =
            percent + "%";

          progressFill.style.width =
            percent + "%";

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
   TOGGLE CONTROLS
=================== */

function toggleControls() {

  controlsVisible =
    !controlsVisible;

  if (controlsVisible) {

    header.classList.remove(
      "hideControls"
    );

    footer.classList.remove(
      "hideControls"
    );

  }

  else {

    header.classList.add(
      "hideControls"
    );

    footer.classList.add(
      "hideControls"
    );

  }

}


/* =========================
 GESTURES (Tap Next/Prev)
========================= */

/* =========================
 GESTURES (Sidebar)
========================= */

function sidebarIsOpen() {

  return sidebar.classList.contains(
    "active"
  );

}


/* =========================
 GESTURES (Tap Navigation)
========================= */

function setupNavigationZones() {

  function zonesDisabled() {

    if (
      sidebarIsOpen()
    ) {

      return true;

    }

    const iframe =
      viewer.querySelector(
        "iframe"
      );

    if (!iframe) {

      return false;

    }

    try {

      const active =
        iframe.contentDocument
          .activeElement;

      if (!active) {

        return false;

      }

      const tag =
        active.tagName;

      return (
        tag === "A" ||
        tag === "BUTTON" ||
        tag === "INPUT"
      );

    }

    catch {

      return false;

    }

  }

  leftZone.addEventListener(
    "click",
    e => {

      if (
        zonesDisabled()
      ) return;

      const iframe =
        viewer.querySelector(
          "iframe"
        );

      if (!iframe) return;

      try {

        const doc =
          iframe.contentDocument;

        const selection =
          doc.getSelection();

        if (
          selection &&
          selection.toString()
        ) {

          return;

        }

      }

      catch {}

      e.stopPropagation();

      rendition.prev();

    }
  );

  rightZone.addEventListener(
    "click",
    e => {

      if (
        zonesDisabled()
      ) return;

      const iframe =
        viewer.querySelector(
          "iframe"
        );

      if (!iframe) return;

      try {

        const doc =
          iframe.contentDocument;

        const selection =
          doc.getSelection();

        if (
          selection &&
          selection.toString()
        ) {

          return;

        }

      }

      catch {}

      e.stopPropagation();

      rendition.next();

    }
  );

  centerZone.addEventListener(
    "click",
    e => {

      if (
        zonesDisabled()
      ) return;

      e.stopPropagation();

      toggleControls();

    }
  );

}


/* =========================
   APPLY THEME 
========================= */

function applyTheme() {

  const darkMode =
    localStorage.getItem(
      "darkMode"
    ) === "true";

  document.body.classList.toggle(
    "dark",
    darkMode
  );

  /* UPDATE ICONS */

  themeBtn.textContent =
    darkMode
      ? "🌙"
      : "☀️";

  bottomThemeBtn.textContent =
    darkMode
      ? "🌙"
      : "☀️";

  /* SAFETY */

  if (!rendition)
    return;

  /* FORCE EPUB REFRESH */

  rendition.themes.default({

    body: {

      background:
        darkMode
          ? "#111111"
          : "#ffffff",

      color:
        darkMode
          ? "#ffffff"
          : "#111111",

      padding: "20px",

      "line-height": "1.7",

      "font-family":
        "Arial, sans-serif"

    },

    a: {

      color:
        darkMode
          ? "#4dabff"
          : "#1565c0"

    }

  });

  /* RE-APPLY FONT SIZE */

  rendition.themes.fontSize(
    fontSize + "%"
  );

}


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

            await rendition.display(
              result.cfi
            );

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


/* ====================
   UPDATE MENU ICONS
==================== */

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

/* =================
   TOGGLE SIDEBAR
================= */

function toggleSidebar() {

  sidebar.classList.toggle(
    "active"
  );

  updateMenuButtons();

  showControls();

}

/* ==============
   MENU EVENTS
============== */

menuBtn.addEventListener(
  "click",
  toggleSidebar
);

bottomMenuBtn.addEventListener(
  "click",
  toggleSidebar
);


/* =============
   OTHER EVENTS
============= */

themeBtn.addEventListener(
  "click",
  () => {

    const darkMode =
      localStorage.getItem(
        "darkMode"
      ) == "true";

    localStorage.setItem(
      "darkMode",
      (!darkMode).toString()
    );

    applyTheme();

  }
);

nextPage.addEventListener(
  "click",
  () => {

    rendition.next();

  }
);

prevPage.addEventListener(
  "click",
  () => {

    rendition.prev();

  }
);

bottomThemeBtn.addEventListener(
  "click",
  () => {

    themeBtn.click();

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
      "fontSize",
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
      "fontSize",
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

  }
);

closeSearch.addEventListener(
  "click",
  () => {

    searchModal.classList.remove(
      "active"
    );

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
            "./sw.js"
          );

      }

      catch (error) {

        console.error(error);

      }

    }
  );

}

loadBook();
