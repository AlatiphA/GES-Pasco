# AlatiphA GES Pasco

A fast, lightweight, installable EPUB Reader PWA built with HTML, CSS, JavaScript, and epub.js.

Designed for mobile-first reading with smooth navigation, offline support, dark mode, search, chapter navigation, auto-hide controls, and touch gestures.

---

## Features

- Installable Progressive Web App (PWA)
- Offline reading support
- EPUB rendering using epub.js
- Dark mode / Light mode
- Adjustable font sizes
- Chapter navigation (Table of Contents)
- Reading progress tracking
- Auto-hide reading controls
- Mobile touch gestures
- Search inside EPUB
- Responsive mobile UI
- Service Worker caching
- Standalone app experience

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

### Search

<p align="center">
  <img src="./screenshots/search.jpg" width="300">
</p>

### Dark Mode

<p align="center">
  <img src="./screenshots/dark-mode.jpg" width="300">
</p>

### Full Mode

<p align="center">
  <img src="./screenshots/full-mode.jpg" width="300">
</p>


```md
![Home](./screenshots/home.png)
```

---

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- epub.js
- JSZip
- Service Workers
- Web App Manifest

---

## Project Structure

```text
/
├── index.html
├── style.css
├── app.js
├── sw.js
├── manifest.json
├── library/
│   └── sample.epub
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── screenshots/
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/AlatiphA/AlatiphA-EPUB-Beta.git
```

---

## Run Locally

Because PWAs require a local server, do not open `index.html` directly.

Use one of these methods:

### VS Code Live Server

Install:
- Live Server extension

Then:
- Right click `index.html`
- Open with Live Server

---

### Python Server

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

---

## PWA Installation

### Android

- Open app in Chrome
- Tap "Install App"

### Desktop

- Open in Chrome/Edge
- Click Install icon in address bar

---

## EPUB Support

Place EPUB files inside:

```text
/library/
```

Default file:

```text
sample.epub
```

---

## Touch Gestures

| Gesture | Action |
|---|---|
| Tap Left | Previous Page |
| Tap Right | Next Page |
| Tap Center | Show Controls |

---

## Search

Search supports:
- words
- phrases
- partial matches

Results jump directly to matching sections.

---

## Dark Mode

Theme preference is saved automatically using Local Storage.

---

## Offline Support

The app caches:
- HTML
- CSS
- JavaScript
- EPUB files
- icons

after first load.

---

## Known Limitations

- `window.close()` is restricted in installed PWAs
- Some EPUBs may contain unsupported CSS
- Very large EPUBs may search slower on low-end devices

---

## Future Improvements

- Book library system
- Multi-book support
- Notes and highlights
- Bookmarks
- Text-to-speech
- Reading statistics
- Sync across devices

---

## License

MIT License

---

## Credits

- epub.js
- JSZip

---

## Author

Abdul-Latif Ahmed [AlatiphA] 
