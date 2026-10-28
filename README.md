# AlatiphA GES Pasco

GES Pasco is a mobile-first, installable EPUB reader PWA for GES Promotion Aptitude Test study material. It supports offline reading, search, bookmarks, reading-position restore, themes, font controls, chapter navigation, touch gestures, and PWA installation.

## Current build

- Unified release: **v1.0.19** (reader and service-worker cache).
- Single version source: `version.js`. Change its value for every release, including cache-only updates.
- Account menu: **Check for updates** finds a waiting release; **Install update** activates it and reloads the app. Local reading data is preserved.
- Firebase Authentication and Firestore synchronization are included; Firebase Storage is not initialized.

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


## v1.0.2 Reading Position Synchronization

Reading position remains local-first in `localStorage` and synchronizes to `users/{uid}/readerData/default` in Cloud Firestore. On authenticated startup, the newest copy by `lastRead` is selected. Page changes save locally immediately and cloud writes are debounced. Offline reading continues normally and pending position data retries when connectivity returns.

## Firestore security hardening
The included `firestore.rules` now limits each authenticated user to their own profile, reading position, preferences, and bookmarks. User-controlled writes cannot change `role`, `accountStatus`, or `createdAt`, and synchronization documents are schema/type/range validated. Unknown collections and documents are denied by default.


## v1.0.3 Pull to refresh
Installed PWA users can refresh by pulling downward from the top edge of the reader and releasing. The gesture does not cancel touch events, so existing tap navigation, horizontal page swipes, sidebar gestures, bookmarks, synchronization, and reader controls retain their existing handlers. Reading state is saved locally before reload.


## v1.0.5 gesture compatibility fix
- Restored the EPUB touch gesture timer used by swipe/tap navigation.
- Pull-to-refresh remains enabled.
- Previous/next horizontal swipes and middle-tap header/footer toggle are preserved.
- Service worker cache version: v1.0.18.


## v1.0.8 account isolation and durable sync (cache v1.0.20)

Reading position, bookmarks, and reader preferences are now stored separately per Firebase account. Existing unassigned data is retained; the app asks before importing it into an account. Cancel leaves that data unassigned. Sync status and Retry are available in the account menu. Pending changes survive a restart and retry on reconnection; bookmark deletions use durable tombstones instead of deleting whole remote sets.

Deploy the included firestore.rules together with this app. The rules accept legacy bookmark writes without deleted and validate deleted as a boolean when present. Publish these transition rules before releasing the reader. Existing records remain readable. Refresh all devices to v1.0.8 after release: older readers do not understand tombstones and can show or reintroduce deleted bookmarks. Do not roll back the reader without also reviewing these rules. No Firebase project configuration changes are required.

Validation: node --test tests/sync.test.cjs. Tests use an in-memory Firestore substitute; they do not replace Firebase emulator or mobile browser testing. Before release, test two accounts on one browser, two devices adding/deleting bookmarks offline, airplane-mode restart, and pinch/swipe/footer/pull-to-refresh on a phone.


## Offline reader (v1.0.18)

Account → Offline reading checks that the EPUB, app files, icon fonts, EPUB libraries and Firebase SDKs are saved in the active release cache. Download / repair fetches a complete set before replacing cached files; it never clears account data, bookmarks or reading progress. Sign in online first and keep the browser signed in. Signing in or resetting a password still requires internet. Browser storage eviction can remove downloads; check readiness before travelling.

Verification includes simulated cache/network failure tests and checks of the external dependency URLs. Physical-device airplane-mode startup remains a release smoke test.


## Practice tests (introduced v1.0.17)

Open Practice tests from the sidebar or account panel. The bundled bank contains 662 multiple-choice questions across 15 Section A exam sets from the bundled GES Pasco EPUB. Only questions with exactly one clear bold-marked answer were imported; ambiguous markings and other question formats are excluded. Scoring follows the historical book, not an independent review of current policy. Source exam and question references appear in answer review. Rebuild the bank with `python tools/build-practice-bank.py`.

Choose a question count and optional time limit (0 is untimed). Question and option order are randomized. Attempts save per account on this browser; a timed attempt keeps its deadline while closed. Results include unanswered questions, source references and mistake revision. Up to 20 result summaries remain locally; no results are uploaded to Firestore. Offline caching includes the bank and practice scripts. Clearing browser data removes these attempts and results.


## Revision dashboard (v1.0.18)

Open Revision dashboard from the sidebar, account panel, practice setup or results. It shows weighted accuracy, completed attempts, recent score trends and per-exam-set performance from up to 20 completed results on this browser. Unanswered questions count as incorrect. Comparisons use equally sized groups of up to 3 recent tests; repeated questions and mistake revision count again. The book has no detailed topic labels, so results are grouped by exam set rather than inferred subjects.

New result records include question IDs and outcomes. The latest saved completed attempt can upgrade its old summary without double counting; older score-only summaries remain in totals. Missed-question practice uses the latest recorded outcome per question, so later correct answers remove a question from the mistake list. Practice and revision stay isolated by signed-in account and remain local; no Firestore schema or rules changes are required.


## Update verification and menu icons (v1.0.19)

Check for updates now fetches fresh release metadata from version.js with a unique query and no-store request. The service worker never serves a cached release-check response. The UI compares the running page, active worker and published release before saying up to date. An older page with newer active files offers Reload app; a waiting worker offers Install update. Failed verification does not claim the page is current. Practice tests and Revision dashboard use the same inline outline icon and chevron layout as the account settings rows.
