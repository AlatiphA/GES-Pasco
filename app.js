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

const increaseFont =
  document.getElementById(
    "increaseFont"
  );

const decreaseFont =
  document.getElementById(
    "decreaseFont"
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

const closeAppBtn =
  document.getElementById(
    "closeAppBtn"
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

async function startReader() {

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

  /* =========================
     THEMES & FONT
  ========================= */

  rendition.themes.fontSize(
    fontSize + "%"
  );

  applyTheme();

  setupNavigationZones();

  /* =========================
     WAIT FOR BOOK
  ========================= */

  await book.ready;

  /* =========================
     GENERATE LOCATIONS
  ========================= */

  await book.locations.generate(
    1000
  );

  /* =========================
     RESTORE LAST LOCATION
  ========================= */

  const savedLocation =
    localStorage.getItem(
      "epub-location"
    );

  try {

    if (savedLocation) {

      await rendition.display(
        savedLocation
      );

    }

    else {

      await rendition.display();

    }

  }

  catch (error) {

    console.error(
      "Failed to restore location:",
      error
    );

    await rendition.display();

  }

  /* =========================
     BUILD TOC
  ========================= */

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

  /* =========================
     SAVE LOCATION
  ========================= */

  rendition.on(
    "relocated",
    location => {

      try {

        localStorage.setItem(
          "epub-location",
          location.start.cfi
        );

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

      catch (error) {

        console.error(
          error
        );

      }

    }
  );

}


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

function sidebarIsOpen() {

  return sidebar.classList.contains(
    "active"
  );

}

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

function applyTheme() {

  const darkMode =
    localStorage.getItem(
      "darkMode"
    ) === "true";

  document.body.classList.toggle(
    "dark",
    darkMode
  );

  if (rendition) {

    rendition.themes.default({

      body: {

        background:
          darkMode
            ? "#111"
            : "#fff",

        color:
          darkMode
            ? "#fff"
            : "#000",

        padding: "20px",

        "line-height": "1.7",

        "font-family":
          "Arial, sans-serif"

      }

    });

  }

}

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

menuBtn.addEventListener(
  "click",
  () => {

    sidebar.classList.toggle(
      "active"
    );

  }
);

themeBtn.addEventListener(
  "click",
  () => {

    const darkMode =
      localStorage.getItem(
        "darkMode"
      ) === "true";

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

increaseFont.addEventListener(
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

decreaseFont.addEventListener(
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

bottomThemeBtn.addEventListener(
  "click",
  () => {

    themeBtn.click();

  }
);

bottomDecreaseFont.addEventListener(
  "click",
  () => {

    decreaseFont.click();

  }
);

bottomIncreaseFont.addEventListener(
  "click",
  () => {

    increaseFont.click();

  }
);

bottomMenuBtn.addEventListener(
  "click",
  () => {

    menuBtn.click();

  }
);

closeAppBtn.addEventListener(
  "click",
  () => {

    if (
      window.history.length > 1
    ) {

      history.back();

    }

    else {

      window.close();

    }

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
