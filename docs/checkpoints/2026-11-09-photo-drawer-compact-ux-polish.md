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

## Production release — PASS (2026-11-09)
- Released source: `main@ef1a903a74dfd3df588f7598fa378126c55865c6`; Raspberry Pi `main` fast-forwarded without force/reset.
- Atomically switched `frontend/dist/index.html` to SHA256 `38199380ed27f6d007f9c2f638641564c8c9e73306c9386029b080ed03a6f955`.
- Public HTML references new assets `index-CgV_TFTO.js` and `index-BeBTM2BB.css`; both HTTP 200, as is `public-map-CcCrSDoE.js`. Public `/health` is OK and `/api/places/map` returns HTTP 200.
- Raspberry Pi backup: `.dev/deploy/2026-11-09-compact-drawer-ef1a903/` includes previous `dist-before/`, online SQLite snapshot `app-before.db` (19,574,784 bytes; integrity OK), source SHA, index hash and service PIDs.
- No backend migration, server restart or Cloudflare restart. Backend PID `2669406` and tunnel PID `222848` unchanged.
- Rollback if required: atomically restore `dist-before/index.html` from this backup without removing hashed assets; database snapshot is protection only, no data migrations were performed.
- The public HTML is dynamically changed by server SEO/CSP and Cloudflare; compare referenced hashed assets, not raw HTML hashes.
