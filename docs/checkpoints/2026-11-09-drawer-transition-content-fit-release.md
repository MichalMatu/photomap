# PhotoMap — drawer transition + content-fit hotfix (2026-11-09)

## Defects fixed
- When dragging the collapsed photo tray upward, the three collapsed preview thumbnails could remain under/over the new compact handle. The drawer now switches to a clean grabber as soon as a drag starts, clips the handle, and paints its background solid.
- Discovery stage used a fixed 670 px / 72 dvh limit even when only two photo rows were present. The drawer now measures natural photo sections and caps the expanded height at the lesser of content fit and viewport limit, preserving a 72 px minimum resize range above collection height.
- Shared height variables synchronize gallery, Leaflet map inset and OSM attribution. A ResizeObserver on sections plus viewport resize recalculates when the number of rows or width changes.
- Normal click, keyboard navigation, touch flicks, intermediate drag heights, pin/dock/undock, thumbnail preview, and hold-to-remove remain supported.

## Mac QA
- Prettier changed files: PASS.
- TypeScript and E2E types, ESLint: PASS.
- Focused Vitest: 3/3 PASS.
- Vite production build: PASS.
- Chrome Playwright, one worker: 7/7 PASS across discovery, slow drag, touch swipe, collapsed-thumbnail-to-grabber transition, fitted height, mobile pin/reload, hold-to-remove.

## Deployment contract
- Frontend only; zero backend/API/schema changes.
- Use the atomic Pi Zero 2W procedure in `docs/deploy-pi-zero2w.md`: clean main, same-SHA build on Mac, backup previous dist + online SQLite, sync hashed assets before atomic index swap, verify public assets, health/API, unchanged backend and cloudflared PIDs.
- Preserve the prior release as rollback; no destructive cleanup of application data, audit branch, or historical backups.
