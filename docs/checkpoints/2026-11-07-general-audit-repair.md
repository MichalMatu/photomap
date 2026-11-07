# PhotoMap — general audit & repair, 2026-11-07

## Baseline i granice

- Repozytorium: `MichalMatu/photomap`; baza audytu: `main@356289656d66963fb7451b70eac2e1bcff015819`.
- Branch roboczy: `audit/photomap-repair-20261107`; produkcyjny `main` nie jest modyfikowany przez ten sprint.
- Mac Local Agent: `photomap`, binding w `.agent/binding.json`, transport `agent-control`. Preflight: tożsamość GitHub i lokalnego `origin/main`, czyste repo i dostępne Python 3.13.9, Node 26.3.0, npm 11.16, `backend/.venv`, `frontend/node_modules`.
- 7/30/90 dni przed sprintem: 104/191/406 commitów; odpowiednio 82/101/304 pliki zmienione w porównaniu do starszego stanu. Największy świeży cykl to eksperyment z unified map UX i jego kontrolowany rollback 04.11.
- Drzewo: 843 śledzone pliki. Inspekcja kontraktów objęła m.in. konfigurację, Alembic, publiczne i admin API, autoryzację, limity uploadów, storage, quarantine/recovery, media, frontend HTTP/cache oraz quality scripts.
- Nie wznowiono wycofanego UX ani nie uruchamiano GitHub Actions, Codex czy Work.

## Potwierdzone problemy i zmiany

1. **Izolacja SQLite/Alembic.** `backend/alembic.ini` zawierał sztywne `sqlite:///data/app.db`; CLI migracji w `backend/alembic/env.py` preferuje tę wartość nad `app.core.config.DATABASE_URL`, więc ignorował `PHOTOMAP_DATA_DIR`, jeśli `DATABASE_URL` nie był jawny. Reprodukcja: nowy test `test_alembic_cli_uses_photomap_data_dir_without_database_url` rzeczywiście FAIL na poprzednim commicie; wariant jawnego URL PASS. Naprawa: pusta wartość domyślna w `alembic.ini`, dzięki czemu automatyczne rozstrzyganie trafia do konfiguracji aplikacji, a programowe ustawienia `sqlalchemy.url` nadal mają pierwszeństwo. Dwa testy regresyjne w `backend/app/tests/contracts/test_alembic_database_config.py`. Komendy w `docs/dev.md`.
2. **Unieważnianie cache mediów.** `bumpMediaCacheRevision()` oparte tylko o `Date.now()` mogło zwrócić identyczny klucz dwóm edycjom w tej samej milisekundzie. W `frontend/src/api/http.ts` dodano licznik monotoniczny oparty na maksimum czasu i poprzedniej wartości. Jest jednostkowy test dwóch szybkich edycji w `frontend/src/api/client.test.ts`.
3. **Status rollbacku.** `docs/GOLDEN_STATUS.md` opisuje stan zaakceptowany 03.11. Uzupełniono go o późniejszy kontrolowany rollback 04.11 oraz rozdzielenie produkcji od gałęzi audytowej.

## Dowody jakości

- `.agent/results/photomap-general-audit-preflight-20261107-v1.json`: PASS, aktualny HEAD i czystość Mac root.
- `.agent/results/photomap-audit-alembic-red-test-20261107-v1.json`: oczekiwany RED, 1 FAIL + 1 PASS na kodzie sprzed poprawki; failure SQLite.
- `.agent/results/photomap-audit-alembic-green-20261107-v1.json`: PASS, **12/12 pytest** (testy migracji i schematu), Alembic upgrade czystej bazy przez 21 rewizji, Ruff format i lint. Dwa ostrzeżenia deprecacyjne `Starlette/httpx` i `anyio` nie blokowały testów.
- ChatGPT Linux Sandbox: izolowany smoke algorytmu unikalnych rewizji mediów (3 szybkie inkrementacje) oraz sprawdzenie pustego domyślnego `sqlalchemy.url`, PASS. **To nie jest uruchomienie kompletnego repozytorium w Linux Sandbox**.
- Pełny `./scripts/check.sh` i audyt zależności: zob. wynik zadania `photomap-general-audit-full-gates-20261107-v1`; do uzupełnienia wyłącznie po terminalnym wyniku. Nie deklarować PASS bez wyniku.
- E2E wizualne: poprzednia próba porównania baseline 04.11 wskazała pięć istniejących czerwonych przypadków (dwa snapshoty mapy, marker, link przypiętego medium, układ portretu). Nie zmieniać golden screenshotów bez analizy.
- Produkcja: potwierdzenie rollbacku/HTTP 200 **z 04.11**, nie z nowego sprintu. Brak deployu w tym sprincie.

## Otwarte ryzyka / brak potwierdzenia

- Pełny quality gate, testy E2E i dependency audit wymagają końcowego wyniku Mac Local Agent. Oddzielić błędy środowiska, odziedziczone flaky visual oraz regresje nowych zmian.
- Testy sprzętowe aktualnego Pi Zero 2W i Cloudflare: tylko odczyt, bez restartu i bez wdrażania zmian audytowych; weryfikacja bieżąca nie została potwierdzona.
- Linux Sandbox nie ma jeszcze kompletnego, zgodnego z SHA pakietu bieżącego źródła i zależności, więc nie można przypisać mu pełnego build/test.
- Brak dowodu, że da się bezpiecznie zwiększyć rozmiary/konkurencję uploadów na Pi Zero 2W; nie zmieniano granic pamięci ani semantyki storage.

## Kontynuacja i warunek publikacji

Zacząć od aktualnego HEAD `main` i `audit/photomap-repair-20261107`, statusu Local Agent i terminalnego wyniku pełnego gate'u. Jeżeli gate ma czerwone testy, repro w tym samym izolowanym środowisku, naprawić potwierdzone regresje i uruchomić adekwatny subset/full gate. Jeżeli PASS, zakończyć odczyt-only Pi/Cloudflare smoke, przeprowadzić końcowy `git diff --check`, porównać dokumentację z kodem, dopiero potem zatwierdzić merge zgodnie z `AGENTS.md`. `main` stabilny, bez force-push, bez nowych funkcji produktu. Szczegóły: `docs/HANDOFF_NEXT_CHAT.md`.
