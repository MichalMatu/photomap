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

Samsung ARM64, Python 3.14.6, Node 26.4.0, npm 11.19.0, Git and SQLite are available. Around 158 GiB free storage and ~2.1 GiB available RAM were reported at initial preflight. The separate IleStoi HTTP readiness check passed before and after cloning. Rust and Cargo were **subsequently installed**, both version 1.99.1, from an isolated APT source pointing to `packages.termux.dev`; only `rust` and `rust-std-aarch64-linux-android` were added (no upgrades/removals). `proot-distro` was not installed.

## Build only in this repository

1. Run `bash scripts/termux-dev.sh requirements`. This creates `.dev/termux/requirements-native.txt`, replacing only `uvicorn[standard]` with base `uvicorn` in a **local generated copy**, leaving production requirements unchanged.
2. Use project-local `backend/.venv` and install from the generated requirements there. Other native packages, notably `pydantic-core` and Pillow, may still require compatible Android wheels, native source builds or isolated Debian `proot-distro`. Never change IleStoi's Python to make PhotoMap work.
3. After `npm ci` in `frontend/`, use `bash scripts/termux-dev.sh frontend-build`. The helper calls TypeScript and Vite via Node CLI, avoiding Termux npm script-shell ambiguity. If npm 11 flags esbuild installation scripts, review and approve the single dependency instead of globally disabling checks.
4. Once Python dependencies and the frontend build PASS, use `bash scripts/termux-dev.sh serve` to run the **single-process foreground server** (built frontend plus API) at `127.0.0.1:8010`; request `http://127.0.0.1:8010/health` and `/` from another shell. Stop the foreground process using Ctrl+C. This is designed for bounded Local Agent smoke tests and a future supervised runit entry, not as evidence of unattended persistence. The optional `start`/`stop` commands use the original two-process dev control path and are not yet native Termux accepted.

## Acceptance boundary

Require Python imports, successful Alembic migration against the separate SQLite, frontend build, later independent HTTP/PID check and unchanged IleStoi readiness at `127.0.0.1:8001`. Local Agent may terminate or lose background children after command completion, so a successful start request is **not** persistence evidence. Qualify a separate `photomap-dev` runit service if persistent hosting is subsequently requested.

Do not copy Pi SQLite or photographs until an explicit second-stage, consistent backup and integrity-checked media transfer. Do not mistake a build PASS for complete end-to-end browser tests on Android.

## Verified Android results and remaining blocker (2026-11-01)

- Frontend native build: **PASS** (TypeScript checks and Vite, 2235 modules transformed).
- Frontend Vitest: **101 test files, 364 tests PASS** on Samsung Termux.
- Rust/Cargo 1.99.1: **installed**; IleStoi readiness was **HTTP 200** after installation.
- Python backend: **not installed successfully**. Original `uvicorn[standard]` required native `watchfiles`. The isolated base-Uvicorn requirements get past that but then `pydantic-core` selects a source build, failing at `maturin`. Initial build of `maturin==1.16.0` without isolation failed because `setuptools-rust` was missing; a subsequent task to install it is **not yet confirmed**.
- Local agent outcome: no terminal result had been received for tasks `photomap-termux-native-maturin-20261101-v10`, `photomap-termux-sync-runtime-20261101-v7` and `photomap-termux-smoke-20261101-v8` at this checkpoint. Never retry uncertain effects without inspecting their durable claims and results.
- Do **not** claim running backend, API HTTP acceptance, SQLite migration acceptance, a persistent service, or successful Raspberry Pi data synchronization from the frontend PASS alone.

The next safe step is to recover the direct Termux task/result channel, read the pending task results, finish native dependencies in only `backend/.venv`, perform a bounded foreground API/frontend/SQLite smoke test on `127.0.0.1:8010`, and verify IleStoi readiness again. Do not add an external precompiled Rust wheel index without an explicit provenance and dependency review.
