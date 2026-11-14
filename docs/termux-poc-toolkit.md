# PhotoMap — reusable Samsung Termux POC toolkit

Status: historical, opt-in tools retained in GitHub. **Do not autostart these tools on any device.**

The Samsung S22 experiment proved that PhotoMap runs against an isolated copy of real production data on Termux. It was **not** a production deployment. The live service stays on Raspberry Pi Zero 2 W; its backup is separate and remains untouched.

## Preserved reusable source

- `scripts/termux-dev.sh` — guarded native Termux/PRoot entrypoint, frontend build, and isolated Debian backend start on loopback `127.0.0.1:8010`.
- `scripts/termux_health_check.py` — **new portable single-shot monitor probe**. Read-only `/health` check, state of optional `photomap-dev` runit service, JSON output, exit code. It does not start or restart services, install a scheduler, or contact the Internet.
- `ops/termux/photomap-dev.run` and `ops/termux/photomap-dev-log.run` — source-controlled versions of the small, original S22 runit launcher and `svlogd` pattern. Not installed or registered anywhere by adding them to GitHub. To reuse, explicitly configure executable permissions, ownership, service path and local dependency installation first.
- `scripts/diagnose_local_data.py` and `scripts/diagnose_architecture.py` — portable data integrity and architecture diagnostics.
- `scripts/backup_local_data.sh` — native application backup of SQLite and media. For live SQLite use the online backup API, not a raw uncoordinated copy.
- `scripts/devctl.sh`, `scripts/serverctl.sh` and `scripts/dev/process.sh` — service ownership, explicit stop/start/status and log access.

On an explicitly prepared Termux installation, run the standalone health probe manually:

```sh
python3 scripts/termux_health_check.py
```

Output reports the local HTTP status and optional runit state. Exit `0` means PhotoMap's isolated `/health` returned exactly `{"status":"ok"}`; exit `1` means unhealthy/unreachable, and `2` means the host is not the expected private Termux environment. A stopped, unregistered POC should normally report unhealthy; that is not an S22 incident.

## Techniques worth reusing

1. **Isolation:** `proot-distro` Debian 12 ARM64 with a dedicated Python environment; bind only the PhotoMap checkout, data, and storage. Never expose the POC over WAN or attach it to the Cloudflare production tunnel.
2. **Dependency compatibility:** avoid forcing native Android/Rust compilation for dependencies that require Linux wheels. The verified POC used Debian Python 3.11 in PRoot and frontend TypeScript/Vite in Termux.
3. **Stable process ownership:** use a separate optional runit service and explicit `svlogd` logs. A successful health response alone does not establish PID/process ownership; never stop an arbitrary process by port number.
4. **Health checks:** use `/health` together with a read-only check of service state and PID ownership before any controlled restart. No automated restart, background monitor or scheduler is enabled by this toolkit.
5. **Consistent data:** copy SQLite through `sqlite3.Connection.backup()`. Verify `PRAGMA quick_check`, row counts and both media trees; a successful app startup is not proof of a complete dataset.
6. **Large transfers:** the verified S22 data transfer used Mac USB ADB forwarding to Termux SSH and `tar`; the old Wi-Fi `tar` stream broke and Termux `rsync` encountered permissions issues. Keep any SSH keys and configuration outside Git.
7. **Safe teardown:** unregister only `photomap-dev` if it exists, confirm no PhotoMap processes, and protect separate IleStoi, SSH, Cloudflare, Mosquitto, Local Agent and hosting/other data.

The historical POC accepted 195 places, 1082 photo records and 2196 private/public media files. The original validation and caveats are documented in [Termux test history](termux-dev.md) and [POC closeout checkpoint](checkpoints/2026-11-01-samsung-termux-photo-data-test-closeout.md). Do not commit media files, test databases, passwords or generated tokens to GitHub.

## Source preservation boundary

The eight S22 modified frontend files and two new pinned-media stage files were preserved in the dedicated [archive/s22-termux-poc-20261114](https://github.com/MichalMatu/photomap/tree/archive/s22-termux-poc-20261114) branch, GitHub commit `8245466c0e170a2cd38b7e4a6719451f812a7494`. All 10 files were verified in the remote tree before deleting the local checkout. The archive is historical, not a merge or production deploy.

On 2026-11-14 the S22 local proof-of-concept `~/Projects/PhotoMap` and the independent PocketHost-managed `photomap-test` instance, its backups and registry entry were removed by the owner's explicit request. A read-only post-check confirmed those paths absent, separate IleStoi readiness HTTP 200, and all protected S22 services running. Production and its separate backup on Raspberry Pi were not touched.

The managed proof-of-concept under `~/Projects/PocketHost-Managed/instances/photomap-test` is also experimental. Its imported databases/media are disposable copies **only after** checks confirm the independent Raspberry Pi production data and owner-authorized deletion. Shared PocketHost toolchains, other sites and active S22 services are outside the cleanup scope.
