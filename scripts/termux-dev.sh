#!/usr/bin/env bash
# Optional, isolated PhotoMap development controls for native Termux.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION="${1:-status}"
if [[ "${PREFIX:-}" != /data/data/com.termux/files/usr && "${PREFIX:-}" != /data/user/0/com.termux/files/usr ]]; then
  echo 'Only the Termux app-private runtime is supported.' >&2
  exit 2
fi
if [[ "${HOME:-}" != /data/data/com.termux/files/home && "${HOME:-}" != /data/user/0/com.termux/files/home ]]; then
  echo 'Unexpected Termux HOME; refusing to work in shared storage.' >&2
  exit 2
fi
if [[ ! -f "$ROOT/backend/requirements.txt" || ! -f "$ROOT/frontend/package.json" ]]; then
  echo 'Run this script from a full PhotoMap repository checkout.' >&2
  exit 2
fi

DEV="$ROOT/.dev/termux"
export DEV_DIR="$DEV/process"
export PHOTOMAP_DATA_DIR="$DEV/data"
export PHOTOMAP_STORAGE_DIR="$DEV/storage"
export BACKEND_HOST=127.0.0.1
export BACKEND_PORT=8010
export PHOTOMAP_SERVER_HOST=127.0.0.1
export PHOTOMAP_SERVER_PORT=8010
export FRONTEND_HOST=127.0.0.1
export FRONTEND_PORT=5178
export VITE_API_BASE_URL="http://127.0.0.1:${BACKEND_PORT}"
export FRONTEND_ORIGINS="http://127.0.0.1:${FRONTEND_PORT},http://localhost:${FRONTEND_PORT}"
export PHOTOMAP_ENV=development
export npm_config_script_shell="$PREFIX/bin/sh"

case "$ACTION" in
  status)
    echo "PhotoMap checkout: $ROOT"
    echo "Python: $(python3 --version)"
    echo "Node: $(node --version)"
    echo "Backend port: $BACKEND_PORT, frontend port: $FRONTEND_PORT"
    echo "Data and storage isolated under: $DEV"
    "$ROOT/scripts/devctl.sh" status
    ;;
  requirements)
    mkdir -p "$DEV"
    # Uvicorn's extra installs watchfiles/uvloop/httptools; these are
    # unnecessary for the local FastAPI HTTP server and may need Rust on Android.
    sed -E 's/^uvicorn\[standard\]==/uvicorn==/' "$ROOT/backend/requirements.txt" > "$DEV/requirements-native.txt"
    echo "Generated isolated requirements: $DEV/requirements-native.txt"
    ;;
  frontend-build)
    cd "$ROOT/frontend"
    test -f node_modules/typescript/bin/tsc || {
      echo 'Frontend dependencies are absent: run npm ci first.' >&2
      exit 3
    }
    # Avoid POSIX /bin/sh paths in npm scripts; invoke installed Node CLI code.
    node node_modules/typescript/bin/tsc --noEmit
    node node_modules/typescript/bin/tsc --noEmit -p tsconfig.e2e.json
    node node_modules/vite/bin/vite.js build
    test -s dist/index.html
    echo 'Frontend build: PASS'
    ;;
  serve)
    test -x "$ROOT/backend/.venv/bin/python" || {
      echo 'Isolated backend Python environment is not ready.' >&2
      exit 3
    }
    test -s "$ROOT/frontend/dist/index.html" || {
      echo 'Frontend distribution missing; run frontend-build first.' >&2
      exit 3
    }
    mkdir -p "$PHOTOMAP_DATA_DIR" "$PHOTOMAP_STORAGE_DIR/private" "$PHOTOMAP_STORAGE_DIR/public"
    cd "$ROOT"
    exec "$ROOT/backend/.venv/bin/python" "$ROOT/server.py"
    ;;
  serve-debian)
    command -v proot-distro >/dev/null || {
      echo 'PRoot-Distro is not installed.' >&2
      exit 3
    }
    test -x "$PREFIX/var/lib/proot-distro/containers/photomap-dev/rootfs/opt/photomap-venv/bin/python" || {
      echo 'Isolated Debian backend is not ready.' >&2
      exit 3
    }
    test -s "$ROOT/frontend/dist/index.html" || {
      echo 'Frontend build missing; run frontend-build first.' >&2
      exit 3
    }
    mkdir -p "$PHOTOMAP_DATA_DIR" "$PHOTOMAP_STORAGE_DIR/private" "$PHOTOMAP_STORAGE_DIR/public"
    if [[ -L "$DEV/admin-token" ]]; then
      echo 'Refusing a symlinked development token file.' >&2
      exit 3
    fi
    if [[ ! -s "$DEV/admin-token" ]]; then
      (umask 077; python3 -c 'import secrets; print(secrets.token_urlsafe(48))' > "$DEV/admin-token")
    fi
    exec proot-distro login --isolated --bind "$ROOT:/mnt" photomap-dev -- /bin/sh -c '
      set -eu
      export PHOTOMAP_ENV=development
      export PHOTOMAP_DATA_DIR=/mnt/.dev/termux/data
      export PHOTOMAP_STORAGE_DIR=/mnt/.dev/termux/storage
      export PHOTOMAP_SERVER_HOST=127.0.0.1
      export PHOTOMAP_SERVER_PORT=8010
      export FRONTEND_ORIGINS=http://127.0.0.1:8010,http://localhost:8010
      ADMIN_TOKEN="$(cat /mnt/.dev/termux/admin-token)"
      export ADMIN_TOKEN
      cd /mnt
      exec /opt/photomap-venv/bin/python /mnt/server.py
    '
    ;;
  start)
    test -x "$ROOT/backend/.venv/bin/python" || {
      echo 'Isolated Python venv missing.' >&2
      exit 3
    }
    export PYTHON="$ROOT/backend/.venv/bin/python"
    "$ROOT/scripts/devctl.sh" start
    ;;
  stop)
    "$ROOT/scripts/devctl.sh" stop
    ;;
  *)
    echo 'Usage: scripts/termux-dev.sh status|requirements|frontend-build|serve|serve-debian|start|stop' >&2
    exit 2
    ;;
esac
