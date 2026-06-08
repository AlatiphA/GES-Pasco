# AlatiphA GES Pasco

A fast, lightweight, installable EPUB Reader PWA built with HTML, CSS, JavaScript, and epub.js.

Designed for mobile-first reading with smooth navigation, offline support, multi-theme switching, bookmarks, search, chapter navigation, interactive footnotes and links, auto-hide controls, and touch gestures.

---

## Features

### Reading Experience
- EPUB rendering using epub.js
- Interactive links and footnotes — tap any link or superscript to navigate or view inline
- Adjustable font sizes (A− / A+)
- Reading progress bar with percentage tracking
- Auto-restore last reading position per book
- Auto-hide reading controls in reading mode

### Themes
- Four built-in themes: **Light**, **Dark**, **Sepia**, **Night (pure black)**
- Theme picker panel — tap 🎨 to open a floating swatch selector
- Theme preference saved automatically

### Navigation
- Chapter navigation via Table of Contents (with collapsible sub-chapters)
- Tap left / right zones or footer buttons to turn pages
- Keyboard navigation (desktop): Arrow keys
- Touch swipe gestures (mobile)

### Bookmarks
- Save bookmarks at any reading position (tap 🔖)
- Bookmarks panel with chapter name and progress percentage
- Delete individual bookmarks with 🗑
- Auto-switches sidebar to Bookmarks tab on save

### Sidebar
- Tabbed sidebar: **Contents** and **Bookmarks** in one panel
- Swipe left on sidebar to close
- Tap outside sidebar to close
- Flush layout — sidebar starts exactly where header ends (no gap)
- Fully functional on both mobile and desktop

### Search
- Full-text search inside the EPUB
- Results jump directly to matching sections with highlight
- Supports words, phrases, and partial matches

### PWA & Offline
- Installable Progressive Web App
- Offline reading via Service Worker caching
- Caches HTML, CSS, JavaScript, EPUB files, and icons after first load
- Standalone app experience on Android, iOS, and Desktop

---

## Screenshots

### Home Screen

<p align="center">
  <img src="./screenshots/home.jpg" width="300">
</p>

### Contents

<p align="center">
  <img src="./screenshots/contents.jpg" width="300">
</p>

### Bookmarks

<p align="center">
  <img src="./screenshots/bookmarks.jpg" width="300">
</p>

### Search

<p align="center">
  <img src="./screenshots/search.jpg" width="300">
</p>

### Theme Picker

<p align="center">
  <img src="./screenshots/themes.jpg" width="300">
</p>

### Full Reading Mode

<p align="center">
  <img src="./screenshots/full-mode.jpg" width="300">
</p>

---

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | App structure |
| CSS3 | Styling and themes |
| JavaScript (Vanilla JS) | App logic |
| [epub.js](https://github.com/futurepress/epub.js) | EPUB parsing and rendering |
| [JSZip](https://stuk.github.io/jszip/) | ZIP extraction (epub.js dependency) |
| Service Workers | Offline caching |
| Web App Manifest | PWA installability |
| localStorage | Bookmarks, reading position, theme, font size |

---

## Project Structure

```text
/
├── index.html              # App shell and layout
├── style.css               # All styles (themes, sidebar, footer, components)
├── app.js                  # App logic (reader, bookmarks, search, themes)
├── sw-beta.js              # Service Worker (offline caching)
├── manifest-beta.json      # PWA manifest
├── library/
│   └── sample.epub         # Default EPUB file
├── icons/
│   ├── icon-beta-192.png
│   └── icon-beta-512.png
└── screenshots/
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/AlatiphA/AlatiphA-EPUB-Beta.git
cd AlatiphA-EPUB-Beta
```

---

## Run Locally

PWAs require a local server — do not open `index.html` directly.

### VS Code Live Server

1. Install the **Live Server** extension
2. Right-click `index.html`
3. Select **Open with Live Server**

### Python Server

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

---

## PWA Installation

### Android
- Open in **Chrome**
- Tap the browser menu → **Install App**

### iOS
- Open in **Safari**
- Tap Share → **Add to Home Screen**

### Desktop
- Open in **Chrome** or **Edge**
- Click the **Install** icon in the address bar

---

## EPUB Support

Place EPUB files inside the `/library/` folder:

```text
/library/sample.epub
```

The app loads `sample.epub` by default. To use a different file, update the filename in `app.js`:

```js
await fetch("./library/your-book.epub")
```

---

## Touch Gestures

| Gesture | Action |
|---|---|
| Tap Left zone | Previous page |
| Tap Right zone | Next page |
| Tap Center zone | Toggle controls |
| Swipe left on sidebar | Close sidebar |
| Tap outside sidebar | Close sidebar |

---

## Keyboard Shortcuts (Desktop)

| Key | Action |
|---|---|
| `→` / `↓` | Next page |
| `←` / `↑` | Previous page |

---

## Themes

| Theme | Background | Best For |
|---|---|---|
| Light | `#f5f5f5` | Daytime reading |
| Dark | `#111111` | Low light |
| Sepia | `#f4ede0` | Comfortable long reads |
| Night | `#000000` | Pure dark / AMOLED screens |

---

## Bookmarks

- Tap **🔖** while reading to save a bookmark
- Sidebar automatically opens to the **Bookmarks** tab
- Each bookmark shows the chapter name and reading progress (%)
- Tap a bookmark to jump back to that position
- Tap **🗑** to delete a bookmark

---

## Search

- Tap **🔍** to open the search modal
- Type a word or phrase and press **Enter**
- Tap any result to jump to that section (highlighted in yellow)
- Supports partial matches across the full book

---

## Offline Support

After the first load, the Service Worker caches:
- App shell (HTML, CSS, JS)
- EPUB file
- Icons and manifest

The app works fully offline after the first visit.

---

## Known Limitations

- `window.close()` is restricted in installed PWAs
- Some EPUBs may contain unsupported CSS or non-standard formatting
- Very large EPUBs may search slower on low-end devices
- Reading progress percentage requires location generation (runs in background on first load)

---

## Changelog

### Latest
- Added **four-theme system**: Light, Dark, Sepia, Night
- Added **theme picker panel** (floating swatch popup)
- Added **Bookmarks** feature with save, navigate, and delete
- Added **tabbed sidebar**: Contents and Bookmarks share one panel
- Added **interactive footnotes and links** inside EPUB iframe
- Added **swipe left** and **tap outside** to close sidebar
- Fixed sidebar gap with header using CSS custom property `--header-height`
- Fixed TOC dropdowns and sidebar on desktop (were mobile-only in CSS)
- Fixed reading position restore on book open
- Fixed progress calculation crash when locations not yet generated

---

## License

This project is licensed under the **MIT License**.

See the full license text here: [https://opensource.org/licenses/MIT](https://opensource.org/licenses/MIT)

```
MIT License

Copyright (c) 2025 Abdul-Latif Ahmed (AlatiphA)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Credits

- [epub.js](https://github.com/futurepress/epub.js) — EPUB rendering engine
- [JSZip](https://stuk.github.io/jszip/) — ZIP extraction

---

## Author

**Abdul-Latif Ahmed [AlatiphA]**  
GitHub: [github.com/AlatiphA](https://github.com/AlatiphA)
