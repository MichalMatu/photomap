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

## Operational closeout / release pending activation (2026-11-09)
- Verified test gate: Prettier, lint, TypeScript, Vitest 3/3, build and Chrome E2E 7/7 PASS.
- GitHub `main@e6c3a877a24fdcc36508ec503f78e5d758b9195d` and Raspberry Pi source both contain the new code.
- Production index is **not yet activated**: live `frontend/dist/index.html` SHA256 `38199380ed27f6d007f9c2f638641564c8c9e73306c9386029b080ed03a6f955` (prior polished UI); staged `index.html.next` SHA256 `17ea840e90094fbb085a64ef5c90cde0a1f207b9d9fc37b5d3d7df503be2f1fe` (new UI). Hashed new assets have been synchronized without deleting prior assets.
- Backup of prior frontend exists at `.dev/deploy/2026-11-09-drawer-fit-e6c3a87/dist-before/`; prior verified SQLite snapshot retained at `.dev/deploy/2026-11-09-compact-drawer-ef1a903/app-before.db`. No DB/backend changes. Attempts to run an additional online SQLite backup and to activate the index were blocked by tool safety checks. No direct activation was claimed.
- Health check returned `{"status":"ok"}`, `photomap.service` and `cloudflared.service` stayed active.
- After an authorized method becomes available: verify Pi source, running PIDs, backup and staged checksum; atomically activate `index.html.next` as the active `index.html`; compare public HTML references with the new hashed JS/CSS, check public `/health`, `/api/places/map` and asset HTTP 200.
- 2026-11-09 retry: Pi preflight reconfirmed clean source at `e6c3a877a24fdcc36508ec503f78e5d758b9195d`, active previous HTML SHA `38199380ed27f6d007f9c2f638641564c8c9e73306c9386029b080ed03a6f955`, staged HTML SHA `17ea840e90094fbb085a64ef5c90cde0a1f207b9d9fc37b5d3d7df503be2f1fe`, existing rollback UI and DB snapshots, active backend/tunnel with PIDs `2669406`/`222848`, and healthy local endpoint. The second atomic activation request was blocked by the tool safety checks before dispatch; production still serves the previous UI.
- Branch cleanup retry **DONE**: three merged refs `feat/fluid-photo-drawer-20261109`, `fix/photo-drawer-compact-polish-20261109`, `fix/drawer-transition-content-fit-20261109` were deleted successfully from origin. Remote branches now: `main`, `agent-control`, and divergent `audit/photomap-repair-20261107`; keep the audit branch because it has unmerged work.
- Only remaining release action: authorized activation of the already staged index and public HTTP smoke check; do not claim the current UI is live until its public asset references match the new release.
