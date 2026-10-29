.PHONY: help scripts scripts-readme start stop restart status logs check api-flow api-contract e2e smoke perf-smoke quality dev health server-start server-stop server-restart server-status server-logs tunnel-start tunnel-stop tunnel-status tunnel-logs autostart autostart-start autostart-stop autostart-status serwerstart serwerstop diagnose-data diagnose-architecture schema-check backup backup-apply cleanup-media cleanup-media-apply retain-originals retain-originals-apply migrate-photo-originals migrate-photo-originals-apply import-city import-city-apply audit-prompt audit-editorial place-inventory export-place-research export-city-research export-all-research reset-dev-data redact-media

PYTHON ?= $(shell if [ -x backend/.venv/bin/python ]; then printf '%s' backend/.venv/bin/python; else printf '%s' python3; fi)
MANIFEST ?= content/cities/wroclaw/manifest.json
ARGS ?=
QUERY ?=
CITY ?=
PLACE ?=

help:
	@bash scripts/help_menu.sh

scripts:
	@printf '%s\n' \
		'PhotoMap - scripts/: szybki spis' \
		'' \
		'Najczęściej:' \
		'  make start / stop / restart / status / logs' \
		'  make check' \
		'  make backup-apply' \
		'  make audit-prompt' \
		'  make place-inventory' \
		'  make import-city MANIFEST=content/cities/wroclaw/manifest.json' \
		'  make export-place-research' \
		'' \
		'Dane lokalne i storage:' \
		'  make diagnose-data                 diagnostyka lokalnej bazy i storage' \
		'  make audit-editorial              raport jakości treści i atrybucji (read-only)' \
		'  make backup                        dry-run backupu' \
		'  make backup-apply                  realny backup do backups/local-*' \
		'  make cleanup-media                 dry-run usuwania osieroconych mediów' \
		'  make cleanup-media-apply           realne usunięcie osieroconych mediów' \
		'  make retain-originals              dry-run retencji prywatnych oryginałów' \
		'  make retain-originals-apply        realna retencja prywatnych oryginałów' \
		'  make migrate-photo-originals       dry-run przejścia Photo na publiczny oryginał + thumb' \
		'  make migrate-photo-originals-apply aktualizacja DB i usunięcie starych full derivatives' \
		'  make reset-dev-data                reset lokalnej bazy i storage dev' \
		'' \
		'Audyt opisów i research:' \
		'  make audit-prompt CITY="Wrocław" PLACE="Rynek"' \
		'  make audit-prompt CITY="Wrocław" ARGS="--scope city --audit tts --fields all"' \
		'  make place-inventory' \
		'  make place-inventory ARGS="--place-status all"' \
		'  make export-place-research QUERY="Rynek"' \
		'  make export-city-research CITY="Wrocław"' \
		'  make export-all-research ARGS="--yes"' \
		'' \
		'Content pipeline:' \
		'  make import-city MANIFEST=content/cities/wroclaw/manifest.json' \
		'  make import-city-apply MANIFEST=content/cities/wroclaw/manifest.json' \
		'' \
		'Diagnostyka:' \
		'  make schema-check' \
		'  make diagnose-architecture' \
		'  make api-flow / api-contract / smoke / perf-smoke / e2e' \
		'' \
		'Parametry:' \
		'  MANIFEST=... wybiera manifest dla import-city/import-city-apply.' \
		'  QUERY=...    przekazuje jedno pole wyszukiwania do export-place-research.' \
		'  CITY=...     zawęża audit-prompt/export-place-research do miasta.' \
		'  PLACE=...    zawęża audit-prompt/export-place-research do miejsca.' \
		'  PYTHON=...   nadpisuje interpreter; domyślnie backend/.venv/bin/python, jeśli istnieje.' \
		'  ARGS="..."   przekazuje dodatkowe flagi do targetów skryptowych.' \
		'' \
		'Pełny opis: scripts/README.md'

scripts-readme:
	@sed -n '1,260p' scripts/README.md

start:
	@./scripts/devctl.sh start

stop:
	@./scripts/devctl.sh stop

restart:
	@./scripts/devctl.sh restart

status:
	@./scripts/devctl.sh status

logs:
	@./scripts/devctl.sh logs

check:
	@./scripts/check.sh

api-flow:
	@./scripts/quality/api_flow.sh

api-contract:
	@./scripts/quality/api_contract.sh

e2e:
	@./scripts/quality/e2e.sh

smoke:
	@./scripts/quality/smoke.sh

perf-smoke:
	@./scripts/quality/perf_smoke.sh

quality: check api-flow api-contract smoke perf-smoke e2e

dev: start

health: status

diagnose-data:
	@$(PYTHON) scripts/diagnose_local_data.py

diagnose-architecture:
	@$(PYTHON) scripts/diagnose_architecture.py

schema-check:
	@$(PYTHON) scripts/check_schema.py

backup:
	@./scripts/backup_local_data.sh --dry-run

backup-apply:
	@./scripts/backup_local_data.sh --apply

cleanup-media:
	@$(PYTHON) scripts/cleanup_orphan_media.py --dry-run

cleanup-media-apply:
	@$(PYTHON) scripts/cleanup_orphan_media.py --apply

retain-originals:
	@$(PYTHON) scripts/retain_private_originals.py --dry-run

retain-originals-apply:
	@$(PYTHON) scripts/retain_private_originals.py --apply

migrate-photo-originals:
	@$(PYTHON) scripts/migrate_photo_original_serving.py --dry-run $(ARGS)

migrate-photo-originals-apply:
	@$(PYTHON) scripts/migrate_photo_original_serving.py --apply $(ARGS)

import-city:
	@$(PYTHON) scripts/content/import_city.py --dry-run "$(MANIFEST)"

import-city-apply:
	@$(PYTHON) scripts/content/import_city.py --apply "$(MANIFEST)"

audit-editorial:
	@$(PYTHON) scripts/content/place_editorial_audit.py --database backend/data/app.db --exceptions content/editorial-quality-exceptions.json --output research-exports/editorial-quality.json $(ARGS)

audit-prompt:
	@$(PYTHON) scripts/generate_audit_prompt.py $(if $(strip $(CITY)),--city "$(CITY)") $(if $(strip $(PLACE)),--place "$(PLACE)") $(ARGS)

place-inventory:
	@$(PYTHON) scripts/export_place_inventory.py $(ARGS)

export-place-research:
	@$(PYTHON) scripts/export_place_research.py --scope place $(if $(strip $(QUERY)),--query "$(QUERY)") $(if $(strip $(CITY)),--city "$(CITY)") $(if $(strip $(PLACE)),--place "$(PLACE)") $(ARGS)

export-city-research:
	@$(PYTHON) scripts/export_place_research.py --scope city $(if $(strip $(QUERY)),--query "$(QUERY)") $(if $(strip $(CITY)),--city "$(CITY)") $(ARGS)

export-all-research:
	@$(PYTHON) scripts/export_place_research.py --scope all $(ARGS)

reset-dev-data:
	@./scripts/reset_dev_data.sh

redact-media:
	@if [ -z "$(strip $(ARGS))" ]; then \
		printf '%s\n' 'Użycie: make redact-media ARGS="--dry-run --kind memory --id <id> --rect 0.1,0.1,0.4,0.3"'; \
		exit 2; \
	fi
	@$(PYTHON) scripts/redact_media_image.py $(ARGS)

server-start:
	@./scripts/serverctl.sh start

server-stop:
	@./scripts/serverctl.sh stop

server-restart:
	@./scripts/serverctl.sh restart

server-status:
	@./scripts/serverctl.sh status

server-logs:
	@./scripts/serverctl.sh logs

tunnel-start:
	@./scripts/serverctl.sh tunnel-start

tunnel-stop:
	@./scripts/serverctl.sh tunnel-stop

tunnel-status:
	@./scripts/serverctl.sh tunnel-status

tunnel-logs:
	@./scripts/serverctl.sh tunnel-logs

autostart: autostart-status

autostart-start:
	@./scripts/serverctl.sh autostart-start

autostart-stop:
	@./scripts/serverctl.sh autostart-stop

autostart-status:
	@./scripts/serverctl.sh autostart-status

serwerstart: autostart-start

serwerstop: autostart-stop
