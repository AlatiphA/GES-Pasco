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


/* OTHER GLOBALS */

let rendition;
let book;
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


const READER_DATA_KEY =
  "epub-beta-reader-data";

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

  toggle.textContent =
    hasChildren
      ? "▶"
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

      closeSidebar();
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

        toggle.textContent =
          children.classList.contains(
            "open"
          )
            ? "▼"
            : "▶";

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


  /* RESTORE SAVED LOCATION */
  
  const readerData =
   loadReaderData();

  const savedLocation =
   readerData.location;

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
        item => {

          buildTOC(
            item
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
  
/*
       readingInfo.textContent =
         "[" +
       chapterName +
         "] " +
       location.start.href;
       */

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

    document.body.classList.remove(
      "readingMode"
    );
    
  }

  else {

    header.classList.add(
      "hideControls"
    );

    footer.classList.add(
      "hideControls"
    );

    document.body.classList.add(
      "readingMode"
    );
    
  }

}


/* =========================
 HIDE CONTROLS 
========================= */

function hideControlsHeader() {
  
  header.classList.add(
    "hideControls"
  );
}

function hideControlsFooter() {
  
  footer.classList.add( 
    "hideControls"
  );
  
  controlsVisible = false;
  
  document.body.classList.add( 
    "readingMode"
  );
}

function hideControls() {
  hideControlsHeader();
  hideControlsFooter();
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

      hideControls();

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

      hideControls();

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
   THEME
========================= */

function applyTheme() {

  const darkMode =
    localStorage.getItem(
      "darkMode-beta"
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

  sidebar.classList.toggle(
    "active"
  );

  updateMenuButtons();

  hideControlsFooter();

}

/* CLOSE SIDEBAR */

function closeSidebar() {
  sidebar.classList.remove("active");
  updateMenuButtons();

  showControls();
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



/*
menuBtn.addEventListener(
  "click",
  () => {

    if (
      sidebar.classList.contains(
        "active"
      )
    ) {

      closeSidebar();

    }

    else {

      openSidebar();

    }

  }
);
*/




/* ==========
   OTHER EVENTS
========== */

themeBtn.addEventListener(
  "click",
  () => {

    const darkMode =
      localStorage.getItem(
        "darkMode-beta"
      ) === "true";

    localStorage.setItem(
      "darkMode-beta",
      (!darkMode).toString()
    );

    applyTheme();
    updateMenuButtons();

  }
);

nextPage.addEventListener(
  "click",
  () => {

    rendition.next();

    // hideControls();

    hideControlsHeader();

  }
);

prevPage.addEventListener(
  "click",
  () => {

    rendition.prev();
    
    hideControlsHeader();

  }
);


/*
bottomMenuBtn.addEventListener(
  "click",
  () => {

    menuBtn.click();

  }
);

*/


bottomThemeBtn.addEventListener(
  "click",
  () => {

    themeBtn.click();
    updateMenuButtons();

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
            "./sw-beta.js"
          );

      }

      catch (error) {

        console.error(error);

      }

    }
  );

}

loadBook();
