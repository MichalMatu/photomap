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

## 08.11 — CSS token gate i świeży smoke produkcyjny

- Pełny `scripts/check.sh` z `c111110` dotarł do CSS gate po przejściu migracji, pytest, coverage, kompilacji, architektury i walidacji schematu. Blokadą był drift tokenów w `map.css`, `map-loading.css`, `map-tour.css` i `pinned-media.css` odziedziczony po wcześniejszym UX.
- Zgodnie z `frontend/AGENTS.md` naprawiono deklaracje CSS zamiast podnosić dozwolony baseline w `scripts/quality/css_token_gate.py`. Kolory, odstępy, rozmiary, zaokrąglenia i animacje przeniesiono do `frontend/src/design/tokens.css` i istniejących tokenów. Porównanie 53 zmienionych linii po rozwinięciu tokenów dało **0 różnic wartości**.
- `.agent/results/photomap-audit-css-token-focus-20261108-v1.json`: **PASS** CSS token gate, Prettier, ESLint + TypeScript (w tym typy E2E), **16/16** testów `src/api/client.test.ts`, produkcyjny Vite build (2239 modułów).
- `.agent/results/photomap-audit-production-readonly-20261107-v1.json`: **PASS** odczytowy smoke Pi — `main@3562896`, czysty worktree, aktywne `photomap.service` i `cloudflared.service`, HTTP 200 `/`, `/health`, `/api/places/map`, hash indexu `5177a829…a5af78b5`.
- Pełny ponowny gate: `photomap-audit-full-regression-20261108-v1`; odczytać terminalny wynik przed uznaniem sprintu za zamknięty.

- Pełny `scripts/check.sh` z 08.11: **346/346 pytest PASS**, **90% coverage**, Alembic/Ruff/architektura/schemat/CSS gate PASS, perf smoke PASS na Mac. Skrypt zatrzymał się na ShellCheck `SC2016` w `scripts/termux-dev.sh` (zamierzone rozwinięcie zmiennej w gościu PRoot), nie na błędzie aplikacji.
- `scripts/termux-dev.sh`: lokalne, uzasadnione oznaczenie `SC2016` przy cytowanym poleceniu `sh -c`, z opisem kontekstu. Kontrola `shellcheck scripts/*.sh scripts/dev/*.sh scripts/quality/*.sh` **PASS** w `.agent/results/photomap-audit-frontend-remaining-gates-20261108-v1.json`.
- Knip odkrył 3 martwe eksporty po rollbacku, później czwarty osierocony limit. Usunięto nieużywane komponenty rail, udostępnienie klucza samouczka i stałą `MAX_RAIL_CATEGORY_BUTTONS` bez naruszania aktywnych komponentów drawer. Sprawdzenie po cleanupie: `photomap-audit-final-frontend-e2e-20261108-v1` — **Knip PASS, Vitest 371/371 PASS, Playwright admin 18/18 PASS**, lecz cały proces E2E exit 1: trzy workery Playwright nie zamknęły się po 300 s; dlatego to **nie jest pełne E2E PASS**.

## Kontynuacja 08.11 — izolacja Chrome, E2E mapy i dependency scan

- `photomap-audit-map-e2e-single-worker-20261108-v1` na systemowym Chrome i jednym workerze: 1/4 PASS (wielomiejski scenariusz funkcjonalny), trzy porównania screenshotów FAIL, odpowiednio 3%, 41% i 8% różnic pikseli. Testy mapy wykonały się w 22,9 s, bez błędu zamknięcia workera.
- `photomap-audit-bundled-chromium-qa-20261108-v1`: lokalnie doinstalowano **Playwright Chrome Headless Shell** do cache Maca, bez zmiany kodu produktu; po wyłączeniu `E2E_CHROME_EXECUTABLE` dwa kontrolne scenariusze (admin: grupy miast, mapa: awaria app-config) **2/2 PASS**, czyste zamknięcie procesów. Odróżnia to środowiskowy problem systemowego Chrome od błędów aplikacji, ale nie dowodzi jeszcze PASS całej regresji.
- `photomap-audit-dependencies-final-diff-20261108-v1`: **git diff --check PASS** między `origin/main` a HEAD audytu, **pip check PASS**; `pip-audit` niedostępny. `npm audit` zgłosił 16 podatności (13 moderate, 3 high: `source-map-js`, `vite`, `zod`; critical 0). Klasyfikacja produkcyjne/dev oraz ewentualna naprawa **pozostają otwarte**; nie deklarować clean security gate.
- `photomap-audit-all-functional-e2e-bundled-20261108-v1`: pełniejszy przebieg 92 testów z bundled Chromium: **82 PASS / 10 FAIL**, bez błędu zakończenia workerów. Obejmował także testy `visual:` (filtr `--grep-invert "^visual:"` nie wyłączył ich, gdyż pełna nazwa zaczyna się prefiksem pliku/projektu). Nie jest to pełny green E2E.
- `photomap-audit-main-baseline-visual-20261108-v1`: dokładnie te same trzy błędy snapshotów odtworzone na niezmienionym `main@3562896` (map empty, markers, mobile memory) przy systemowym Chrome; **są odziedziczone**.
- `photomap-audit-main-functional-baseline-20261108-v1`: spośród 7 niedziałających w przebiegu audytu zachowań, 6 zawiodło identycznie na czystym `main` (gallery sizing, marker hit area, backdrop, gallery mounted, pinned link, portrait card). `map motion states animate media modal and sheets` przeszedł na `main`; ponowiony oddzielnie na audycie w `photomap-audit-single-smoke-recheck-20261108-v1` **PASS (1/1)** — pojedynczy błąd we wspólnym przebiegu z 2 workerami jest niestabilnością pod obciążeniem, a nie potwierdzoną regresją.
- `photomap-audit-dependency-triage-20261108-v1`: `npm audit --omit=dev` **0 vulnerabilities**, pełny `npm audit` **16 dev-only** (13 moderate/3 high: `source-map-js`, `vite`, `zod`). Kompatybilność Pythona PASS, `pip-audit` nie było zainstalowane. Nie dokonano automatycznego `npm audit fix` ani zmiany wersji bez kontrolowanego testu.
- `photomap-audit-single-smoke-recheck-20261108-v1`: `origin/main@3562896`, branch audytu `e4ed34b`, Mac root `agent-work` czysty, `git diff --check` PASS.

## Otwarte ryzyka / brak potwierdzenia

- **Quality gate E2E pozostaje OPEN**: 9 błędów z pełnego przebiegu odtworzono na `main`, a jednorazowy dziesiąty scenariusz przeszedł po izolowanym rechecku. Istniejący dług testowy wymaga osobnej decyzji, czy naprawiać zachowanie obecnego UX, czy aktualizować błędne testy po rollbacku. Nie aktualizować screenshotów automatycznie.
- **Tooling security**: 0 zgłoszeń w zależnościach produkcyjnych npm, natomiast 16 zgłoszeń dev-only; brak skanu Python CVE przez `pip-audit`. Pozostaje do kontrolowanej modernizacji.
- Testy sprzętowe aktualnego Pi Zero 2W i Cloudflare: tylko odczyt, bez restartu i bez wdrażania zmian audytowych; weryfikacja bieżąca nie została potwierdzona.
- Linux Sandbox nie ma jeszcze kompletnego, zgodnego z SHA pakietu bieżącego źródła i zależności, więc nie można przypisać mu pełnego build/test.
- Brak dowodu, że da się bezpiecznie zwiększyć rozmiary/konkurencję uploadów na Pi Zero 2W; nie zmieniano granic pamięci ani semantyki storage.

## Kontynuacja i warunek publikacji

Zacząć od aktualnego HEAD `main` i `audit/photomap-repair-20261107`, statusu Local Agent i terminalnego wyniku pełnego gate'u. Jeżeli gate ma czerwone testy, repro w tym samym izolowanym środowisku, naprawić potwierdzone regresje i uruchomić adekwatny subset/full gate. Jeżeli PASS, zakończyć odczyt-only Pi/Cloudflare smoke, przeprowadzić końcowy `git diff --check`, porównać dokumentację z kodem, dopiero potem zatwierdzić merge zgodnie z `AGENTS.md`. `main` stabilny, bez force-push, bez nowych funkcji produktu. Szczegóły: `docs/HANDOFF_NEXT_CHAT.md`.
