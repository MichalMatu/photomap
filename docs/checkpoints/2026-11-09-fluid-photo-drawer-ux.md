# PhotoMap — fluid bottom photo drawer UX (2026-11-09)

## Scope
Source branch: `feat/fluid-photo-drawer-20261109`, based on `main@356289656d66963fb7451b70eac2e1bcff015819`. Production at photomap.pl is unchanged.

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

## Release boundary
Not merged into `main` and not deployed to Raspberry Pi. Merge/release only after visual acceptance; use the documented atomic frontend deployment and rollback path. No backend, API, data, or service changes were made.
