# PhotoMap — Termux development copy

This setup is independent of PhotoMap production on Raspberry Pi and the existing IleStoi service on Samsung.

## Isolation

- Clone: `$HOME/Projects/PhotoMap` (private Termux HOME).
- DB: `.dev/termux/data/app.db` (never the Pi production SQLite).
- Media: `.dev/termux/storage/{private,public}`.
- Process logs/PIDs: `.dev/termux/process`.
- Backend: `127.0.0.1:8010`; Vite: `127.0.0.1:5178`.
- No Cloudflare, production SSH keys, or Pi media transfer in this stage.

## Confirmed preflight, 2026-11-01

Samsung ARM64, Python 3.14.6, Node 26.4.0, npm 11.19.0, Git and SQLite are available. Around 158 GiB free storage and ~2.1 GiB available RAM were reported at initial preflight. The separate IleStoi HTTP readiness check passed before and after cloning. Rust and Cargo were **subsequently installed**, both version 1.99.1, from an isolated APT source pointing to `packages.termux.dev`; only `rust` and `rust-std-aarch64-linux-android` were added (no upgrades/removals). `proot-distro` was absent at initial preflight and was subsequently installed for the isolated Debian backend.

## Build only in this repository

1. Run `bash scripts/termux-dev.sh requirements`. This creates `.dev/termux/requirements-native.txt`, replacing only `uvicorn[standard]` with base `uvicorn` in a **local generated copy**, leaving production requirements unchanged.
2. Use project-local `backend/.venv` and install from the generated requirements there. Other native packages, notably `pydantic-core` and Pillow, may still require compatible Android wheels, native source builds or isolated Debian `proot-distro`. Never change IleStoi's Python to make PhotoMap work.
3. After `npm ci` in `frontend/`, use `bash scripts/termux-dev.sh frontend-build`. The helper calls TypeScript and Vite via Node CLI, avoiding Termux npm script-shell ambiguity. If npm 11 flags esbuild installation scripts, review and approve the single dependency instead of globally disabling checks.
4. The accepted Debian path is `bash scripts/termux-dev.sh serve-debian` for a **foreground API + built frontend** at `127.0.0.1:8010`. It validates Python inside the PRoot guest and explicitly sets `DATABASE_URL=sqlite:////mnt/.dev/termux/data/app.db`, because `backend/alembic.ini` otherwise defaults to an unrelated relative SQLite path. `serve` and the two-process native `start`/`stop` are not the accepted Debian path.

## Acceptance boundary

Require Python imports, successful Alembic migration against the separate SQLite, frontend build, later independent HTTP/PID check and unchanged IleStoi readiness at `127.0.0.1:8001`. Local Agent may terminate or lose background children after command completion, so a successful start request is **not** persistence evidence. Qualify a separate `photomap-dev` runit service if persistent hosting is subsequently requested.

Do not copy Pi SQLite or photographs until an explicit second-stage, consistent backup and integrity-checked media transfer. Do not mistake a build PASS for complete end-to-end browser tests on Android.

## Accepted Samsung-only test server (2026-11-01)

Scope is **development/testing only** on Samsung S22+ Termux, with no public
Cloudflare endpoint, no Raspberry Pi SQLite/media copied, and no changes to
the existing IleStoi service. PhotoMap uses a private checkout on `main`,
its own Debian Bookworm 12 ARM64 PRoot container `photomap-dev`, Python
3.11.2, and separate `.dev/termux/data/app.db` plus media/log directories.

Verified Local Agent evidence:

- Frontend: TypeScript/Vite build **PASS**, Vitest **366/366 PASS in 101 files**
  on the earlier `c0be509` main frontend. Later Termux changes did not modify
  frontend source.
- Runtime: Debian and its ARM64 binary-wheel dependencies **PASS**, including
  FastAPI, SQLModel, Alembic, Pillow and `pydantic-core`. Native Android
  `maturin` source compilation previously timed out after 2000 seconds; it
  is no longer required and must not be repeated blindly.
- Backend: Debian `pytest -q` **344 passed, 2 dependency deprecation
  warnings, 0 failures** in 307.09 seconds. Test tools (pytest, httpx,
  ruff, coverage, schemathesis) installed in Debian only.
- Source: local Samsung checkout clean and fast-forwarded to exact
  `cbeadcdc3b8cf3b2d91ca804e9c4628083f886f0` before SQLite and HTTP
  acceptance. Fixes in `scripts/termux-dev.sh`: check the Python executable
  *inside* Debian, and set an explicit SQLite `DATABASE_URL` in that guest.
- SQLite: standalone Alembic `upgrade head` **PASS** on the separate test
  database; `integrity_check=ok`, **11 tables**, **0 foreign-key errors**,
  **1 Alembic version row**.
- Foreground smoke: `/health`, `/` (HTML) and `/openapi.json` all
  **HTTP 200** on `127.0.0.1:8010`. The smoke-created foreground process
  was stopped cleanly afterward.
- Persistent test instance: a separately named private runit service
  `$PREFIX/var/service/photomap-dev` supervises `serve-debian` and logs
  under `.dev/termux/process/log`. Local Agent start receipt **PASS** with
  three HTTP 200 endpoints. An independent Mac-to-Samsung SSH readback
  observed `sv status` **run** after 77 seconds, with the frontend and API
  both HTTP 200; this is supervised live acceptance, not an unattended
  reboot/endurance test.
- IleStoi readiness remained **HTTP 200** before and after the migration,
  foreground smoke and test service start. No source or data was transferred
  from Raspberry Pi.

### Operate the isolated test instance

On Samsung **Termux**, use:

```sh
sv status "$PREFIX/var/service/photomap-dev"
curl -fsS http://127.0.0.1:8010/health
sv down "$PREFIX/var/service/photomap-dev"  # only to intentionally stop the test service
sv up "$PREFIX/var/service/photomap-dev"    # only to intentionally resume it
```

The last two commands are lifecycle controls, not a requirement for a health
check. The test service listens on loopback only. Do not attach it to
Cloudflare, alter IleStoi runit/services or import production PhotoMap data
without a separate explicit assignment. Existing failed/timeout/UNKNOWN
Local Agent receipts are preserved and are not reclassified as PASS.
