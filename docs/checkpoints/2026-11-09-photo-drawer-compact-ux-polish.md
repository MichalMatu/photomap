# PhotoMap — compact photo drawer UX polish (2026-11-09)

## User-reported defects
After the first fluid-drawer release on photomap.pl, the user observed an unattractive vertical-resize mouse cursor, an oversized empty strip above photos, and an intermittent full-width blue line along the grab area. Screenshot captured from production in Chrome Incognito.

## Fix
- Changed the handle and section label from `ns-resize` to `grab`/`grabbing`.
- Reduced the expanded desktop handle from 44 to 30 px while keeping a 44 px touch target on coarse pointer devices. The collapsed thumbnail strip remains 80 px.
- Removed redundant "Zdjęcia z mapy" heading when there are no docked photos; retained differentiated headings with a pinned collection.
- Reduced top content padding and used one CSS handle-height token to keep the actual scrollable content aligned with its visual handle.
- Restricted `:focus-visible` to the grabber/thumbnail area instead of the whole wide button; keyboard focus remains visible.
- Kept continuous dragging active outside the narrow handle by subscribing to document pointermove/up/cancel during pointer gestures. Pointer capture is retained when natively available.
- Improved the E2E test to wait for the map loading overlay to disappear before simulating a drag. The overlay was shown by tracing browser pointer events to mask the handle and collapse the drawer in the unguarded test.

## Tests and release quality
- Mac Local Agent, branch `fix/photo-drawer-compact-polish-20261109`.
- Prettier PASS; TypeScript, E2E types, ESLint PASS; Vite production build PASS; focused Vitest 3/3 PASS.
- Real Chrome Playwright: **5/5 PASS** with `--workers=1`: compact discovery layout, continuous mouse drag, swipe, pinned collection/reload, hold-to-remove.
- The first full Vitest run caused excessive host load and was interrupted. Do not treat it as a completed full-suite pass; only the scoped regression above is accepted.
- No backend, API, SQLite, Cloudflare, or app services altered by the code fix.

## Release boundary
The patch is ready for a frontend-only atomic release under `docs/deploy-pi-zero2w.md`, with an independent `dist-before` and SQLite snapshot. Follow the exact source SHA and confirm public new asset URLs and stable PIDs. The public HTML is dynamically changed by server SEO/CSP and Cloudflare; do not compare its raw hash to static `dist/index.html`.
