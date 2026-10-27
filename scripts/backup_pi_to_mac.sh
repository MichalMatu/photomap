#!/usr/bin/env bash
# One-time, end-of-cleanup backup: Mac pulls a consistent SQLite snapshot and
# canonical media directly from Raspberry Pi. No permanent second copy on Pi.
set -euo pipefail

MODE="${1:---dry-run}"
if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "Usage: $0 [--dry-run|--apply] (run on Mac)" >&2
  exit 2
fi

PI_HOST="${PHOTOMAP_PI_HOST:-michal@192.168.0.23}"
PI_ROOT="/home/michal/src/PhotoMaps"
MAC_DEST_ROOT="${PHOTOMAP_MAC_BACKUPS:-$HOME/PhotoMap-backups}"
SSH_KEY="${PHOTOMAP_PI_KEY:-$HOME/.ssh/id_ed25519}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$MAC_DEST_ROOT/photo-map-$STAMP"
STAGING="$DEST.partial"
REMOTE_TEMP=""

[[ -f "$SSH_KEY" ]] || { echo "Missing SSH key: $SSH_KEY" >&2; exit 1; }
command -v ssh >/dev/null
command -v scp >/dev/null
command -v rsync >/dev/null
command -v python3 >/dev/null
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10)

if [[ "$MODE" == "--dry-run" ]]; then
  echo "Dry-run only: no snapshot or transfer was created."
  echo "Pi: $PI_HOST:$PI_ROOT"
  echo "Mac backup destination: $DEST"
  echo "Transfer: SQLite online backup (~tens of MB) + backend/storage (~4.5 GB)."
  echo "Run with --apply only after cleanup is complete and media writes are quiescent."
  exit 0
fi

[[ ! -e "$DEST" && ! -e "$STAGING" ]] || {
  echo "Backup destination already exists: $DEST or $STAGING" >&2
  exit 1
}
mkdir -p "$STAGING/backend/storage"

cleanup() {
  code=$?
  trap - EXIT
  if [[ -n "$REMOTE_TEMP" ]]; then
    "${SSH[@]}" "$PI_HOST" "rm -f -- '$REMOTE_TEMP'" >/dev/null 2>&1 || true
  fi
  if [[ "$code" -ne 0 ]]; then
    echo "Backup was not finalized; removing partial Mac destination." >&2
    rm -rf -- "$STAGING"
  fi
  exit "$code"
}
trap cleanup EXIT

# SQLite .backup API gives a transactionally consistent copy even when the
# production database is in WAL mode; never copy app.db live with cp/rsync.
REMOTE_TEMP="$("${SSH[@]}" "$PI_HOST" 'mktemp /tmp/photomap-snapshot-XXXXXXXX.sqlite')"
"${SSH[@]}" "$PI_HOST" "cd '$PI_ROOT' && backend/.venv/bin/python - '$REMOTE_TEMP'" <<'PY'
import sqlite3
import sys
from pathlib import Path

target = Path(sys.argv[1])
source = Path("backend/data/app.db").resolve()
db = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
snapshot = sqlite3.connect(str(target))
db.backup(snapshot)
snapshot.close()
db.close()
check = sqlite3.connect(str(target))
assert check.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
check.close()
PY
scp -q -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes \
  "$PI_HOST:$REMOTE_TEMP" "$STAGING/app.db"

# The Mac pulls media from Pi; none of these files are duplicated on Pi.
rsync -a -e "ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=yes" \
  "$PI_HOST:$PI_ROOT/backend/storage/" "$STAGING/backend/storage/"

python3 - "$STAGING" <<'PY'
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

root = Path(sys.argv[1])
db = sqlite3.connect(str(root / "app.db"))
assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
missing = []
counts = {}
for table in ("photo", "memory"):
    rows = db.execute(
        f"SELECT original_path, public_path, thumb_path, audio_original_path, audio_public_path FROM {table}"
    ).fetchall()
    counts[table] = len(rows)
    for original, public, thumb, audio_original, audio_public in rows:
        for field in (original, audio_original):
            if field and not (root / "backend/storage/private" / field).is_file():
                missing.append(table + ":private:" + field)
        for field in (public, thumb, audio_public):
            if field and field.startswith("/media/"):
                if not (root / "backend/storage/public" / field.removeprefix("/media/")).is_file():
                    missing.append(table + ":public:" + field)
assert not missing, "Missing referenced media in Mac backup: " + str(missing[:10])
h = hashlib.sha256((root / "app.db").read_bytes()).hexdigest()
summary = {"state": "verified", "sqlite_sha256": h, "sqlite_integrity": "ok",
           "records": counts, "missing_referenced_media": 0}
(root / "manifest.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
db.close()
PY

mv -- "$STAGING" "$DEST"
echo "Verified PhotoMap backup on Mac: $DEST"
echo "Pi retains no extra SQLite snapshot from this operation."
