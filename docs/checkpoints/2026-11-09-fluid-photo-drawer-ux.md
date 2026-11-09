# PhotoMap — fluid bottom photo drawer UX (2026-11-09)

## Scope
Source branch: `feat/fluid-photo-drawer-20261109`, based on `main@356289656d66963fb7451b70eac2e1bcff015819`. Fast-forwarded to `main@90609f7733b178da9f2687e2133c64b47fb7338b` and deployed on 2026-11-09.

- The photo drawer handle and its section headers accept pointer dragging (mouse/touch). The drawer follows the pointer continuously, keeping intermediate heights after deliberate drags.
- A quick vertical flick (under 280 ms, at least 35 px) changes one semantic stage; click and ArrowUp/ArrowDown continue to cycle stages.
- Available heights are constrained to the existing viewport-responsive discovery maximum and the 80 px collapsed tray. Very small releases close the tray.
- The drawer, Leaflet map viewport, and OSM attribution now share the live CSS height variable during gestures. Existing dock/undock, pinned hold-to-remove, photo previews, and scrollable collections are preserved.
- Expanded handle hit target is 44 px; touch interaction is restricted to the handle and section labels so scrolling thumbnails is not intercepted.

## Verified on Mac Local Agent
- Prettier formatting on changed files: PASS.
- TypeScript and E2E typechecking, ESLint: PASS.
- Vitest focused drawer helper: 3/3 PASS.
- Vite production build: PASS.
- Playwright using installed Chrome 156 (`E2E_CHROME_EXECUTABLE`): 5/5 PASS for desktop discovery, incremental mouse resize, touch-style swipe, mobile dock/reload, and pinned removal.
- The initial browser run failed before test execution only because Playwright's bundled Chromium headless shell was not installed. Repeated with the already installed Chrome, without changing production or reinstalling a browser.

## Production deployment — PASS (2026-11-09)

- Source release: `main@90609f7733b178da9f2687e2133c64b47fb7338b`, built on Mac with `VITE_API_BASE_URL=`.
- Target: Raspberry Pi Zero 2W, `/home/michal/src/PhotoMaps`. Pi source updated with `git merge --ff-only origin/main`, working tree clean.
- New live `frontend/dist/index.html` SHA256: `fd9ccd24cd8638eae979b94b9f01e4cbbacd7a19ec3264f096df6df974cf74ae`.
- Public assets: `index-PEafTVoL.js`, `public-map-ZUEh_Tys.js`, `index-CoSvbh38.css` (HTTP 200).
- Backup: `.dev/deploy/2026-11-09-fluid-photo-drawer-90609f7/` with previous `dist-before/`, consistent online SQLite `app-before.db` (19,574,784 bytes; `PRAGMA integrity_check=ok`), previous SHA, prior index hash and service PIDs.
- Deployment: assets synchronized without deleting old hashed assets; `index.html.next` verified then activated via atomic `mv`. No backend restart, migrations, media changes, or Cloudflare restart.
- Verified: `https://photomap.pl/health` OK; `/api/places/map` HTTP 200; new app JS/map JS/CSS HTTP 200; Pi Git/index SHA and clean worktree matched; backend PID `2669406` and tunnel PID `222848` remained unchanged.
- Raw public HTML hashes differ intentionally from the static build because the running server inserts SEO markup and per-request CSP nonces, and Cloudflare injects its own runtime script. The public HTML referenced the exact new asset filenames, so direct static-index SHA comparison is not a valid external smoke assertion.
- Rollback (frontend only, if needed): atomically restore `dist-before/index.html` from this release backup; retain hashed assets. SQLite is a protective snapshot, not a migration rollback.
