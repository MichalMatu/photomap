#!/usr/bin/env python3
"""Read-only, single-shot health probe for the retired PhotoMap Termux POC.

Never starts/stops a service. Never probes public interfaces or reads secrets.
This does not install a monitor, daemon, timer, or scheduler.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, build_opener

PREFIX = Path("/data/data/com.termux/files/usr")
HOME = Path("/data/data/com.termux/files/home")
SERVICE = PREFIX / "var/service/photomap-dev"
HEALTH_URL = "http://127.0.0.1:8010/health"


def main() -> int:
    result: dict[str, object] = {
        "host": "termux",
        "app": "photomap-dev",
        "url": HEALTH_URL,
        "service_registered": False,
        "service_state": "not-registered",
        "health_http": None,
        "health_ok": False,
    }
    if Path.home() != HOME or not PREFIX.is_dir():
        result["error"] = "This probe is only for the Termux app-private environment"
        print(json.dumps(result, ensure_ascii=False))
        return 2

    result["service_registered"] = SERVICE.is_dir()
    if SERVICE.is_dir():
        try:
            status = subprocess.run(
                [str(PREFIX / "bin/sv"), "status", str(SERVICE)],
                capture_output=True,
                text=True,
                timeout=4,
                check=False,
            )
            if status.returncode == 0:
                result["service_state"] = status.stdout.split(":", 1)[0].strip()
            else:
                result["service_state"] = "unknown"
        except (OSError, subprocess.TimeoutExpired):
            result["service_state"] = "unknown"

    opener = build_opener(ProxyHandler({}))
    try:
        with opener.open(HEALTH_URL, timeout=4) as response:
            result["health_http"] = response.status
            body = response.read(4096)
            result["health_ok"] = response.status == 200 and json.loads(body) == {
                "status": "ok"
            }
    except HTTPError as exc:
        result["health_http"] = exc.code
    except (URLError, OSError, ValueError, UnicodeError):
        pass

    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if result["health_ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
