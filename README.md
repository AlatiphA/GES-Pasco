# AlatiphA GES Pasco

GES Pasco is a mobile-first, installable EPUB reader PWA for GES Promotion Aptitude Test study material. It supports offline reading, search, bookmarks, reading-position restore, themes, font controls, chapter navigation, touch gestures, and PWA installation.

## Current build

- Reader build: **v3.4.6**
- Firebase-enabled line: **v1.0.0 will begin with the Authentication + Cloud Firestore migration**
- Firebase Storage: **not included at this stage**

The service worker has its own cache version. Cache-only deployment changes should normally bump `CACHE_VERSION` in `sw.js`. The reader version in `app.js` should be changed only when reader/application logic changes.

## Features

- EPUB rendering with epub.js
- Full-text EPUB search
- Contents and bookmarks sidebar
- Light, Dark, Sepia, and Night themes
- Adjustable font family and font size
- Reading progress and last-position restore
- Touch, keyboard, and page-button navigation
- Interactive EPUB links and footnotes
- Offline PWA support
- Install prompt for supported browsers
- Local supporter-key feature

## Project structure

```text
/
├── index.html
├── faq.html
├── style.css
├── app.js
├── install.js
├── sw.js
├── manifest.json
├── icon-192.png
├── icon-512.png
├── fonts/
│   └── OpenSans-VariableFont_wdth_wght.ttf
├── library/
│   └── sample.epub
└── screenshots/
```

## Local data

The current reader stores bookmarks, reading progress, theme, font preferences, supporter state, and install-prompt state in `localStorage`. The Clear App Data command removes only GES Pasco-owned keys and the app caches. It does not call `localStorage.clear()`.

In the Firebase v1.0.0 migration, local storage will remain useful for offline-first behavior while authenticated user data is synchronized with Cloud Firestore.

## PWA and offline support

`sw.js` precaches the core local app shell and the bundled EPUB. HTML, CSS, JavaScript, and JSON requests use a network-first strategy. Stable assets such as the EPUB, icons, and fonts use cache-first behavior.

The app currently loads Font Awesome, JSZip, and epub.js from CDNs. They work with the service-worker runtime cache after successful online retrieval, but a future cleanup can vendor these dependencies locally for stronger first-install offline reliability.

## Run locally

PWAs must be served over HTTP/HTTPS rather than opened directly from the file system.

Using Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

VS Code Live Server can also be used.

## Current Firebase migration plan

The first Firebase-enabled build will be **GES Pasco v1.0.0** and will initially use:

- Firebase Authentication
- Cloud Firestore
- Login
- Sign up
- Password reset
- User profile document
- Auth-state protection
- Later synchronization of reading progress, bookmarks, and preferences

Firebase Storage is intentionally excluded for now.

## Screenshots

Available screenshots are stored in `/screenshots/` and currently include the home screen, contents, search, dark mode, and full reading mode.

## License

MIT License. See `LICENSE`.

## Author

Abdul-Latif Ahmed [AlatiphA]
