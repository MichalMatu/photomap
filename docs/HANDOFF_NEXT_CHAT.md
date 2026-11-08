# PhotoMap — handoff końcowy po audycie, 2026-11-08

## Stan źródła i tryb pracy

- Repozytorium: `MichalMatu/photomap`; zaakceptowany `main@356289656d66963fb7451b70eac2e1bcff015819`, **odświeżyć bieżący HEAD** przy wznowieniu. Branch prac audytowych: `audit/photomap-repair-20261107`, niezmergowany.
- Mac Local Agent: repo ID `photomap`, binding `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`, branch transportowy `agent-control`, resources `[]`, worktree `~/agent-workspace/repos/photomap/worktrees/audit-20261107`. Root `~/agent-workspace/repos/photomap/work` (agent-work).
- Wyłącznie GitHub Connector + Mac Local Agent + ChatGPT Linux Sandbox; bez Codex, Work, GitHub Actions, force-push i bez nieuzgodnionego deployu.
- **Obowiązkowo przeczytać** `AGENTS.md`, `frontend/AGENTS.md`, `frontend/src/components/map/AGENTS.md`, `backend/AGENTS.md`, `docs/GOLDEN_STATUS.md`, `docs/checkpoints/2026-11-07-general-audit-repair.md` i `docs/dev.md`.

## Zamknięte zmiany

- Usunięto błąd izolacji SQLite/Alembic CLI (`PHOTOMAP_DATA_DIR` i alternatywny `DATABASE_URL`) z testem RED/GREEN i 21 migracjami.
- Naprawiono ryzyko kolizji `bumpMediaCacheRevision` w jednej milisekundzie, z testem regresji.
- Naprawiono CSS token gate bez zmiany wynikowych wartości 53 deklaracji; usunięto 4 nieużywane elementy frontendowe po UX rollbacku; obsłużono ShellCheck SC2016 w kontrolowanym kontekście PRoot.
- Dopasowano asercje sześciu scenariuszy E2E do zaakceptowanego zachowania po rollbacku (proporcje galerii, kompaktowe pinned media, backdrop, stan galerii po otwarciu zdjęcia, dwuklik, mapa wielomiejska).
- Testowane eksperymenty `PlaceMarker.tsx` na eventach `click`/`mousedown`/`pointerdown`, usunięciu prefetchu i memoizacji ikony **nie przeszły**; całość cofnięto. Finalna zawartość `PlaceMarker.tsx` jest taka sama jak na `main`. Nie przenosić tych niezaakceptowanych prób dalej.

## Dowody jakości

- Backend (wcześniejsze finalne wyniki): 346/346 pytest, coverage 90%, Alembic, Ruff, architektura, schemat i perf smoke PASS. CSS gate i ShellCheck potwierdzone PASS oddzielnymi terminalnymi logami.
- `photomap-final-verified-changes-quality-20261108-v1`: Prettier całego frontendu, ESLint/TypeScript, Knip, **371/371 Vitest**, Vite build (2239 modułów) i diff-check PASS. Pojedynczy E2E compact-card miał różnicę 1 px — następnie poprawiono tolerancję testu.
- `photomap-final-accepted-e2e-security-20261108-v1`: **6/6** aktualizowanych E2E mapy PASS, **18/18** admin E2E PASS, `npm audit --omit=dev` **0 vulnerabilities**, format i typy E2E PASS, `git diff --check` PASS; exit 0.
- `photomap-audit-main-baseline-visual-20261108-v1` oraz `photomap-audit-main-functional-baseline-20261108-v1`: błędy wizualne i sześć błędów scenariuszy na niezmienionym `main`. `photomap-final-marker-pointer-diagnostic-20261108-v3`: fizyczny pointerdown na poprawnym kafelku, pointerup i click na mapie, brak aktywacji.
- Read-only smoke Raspberry Pi Zero 2W i publicznych endpointów: PASS (HTTP 200, photomap.service i cloudflared.service active), bez restartu ani deployu. `pip check` PASS, lecz `pip-audit` niezainstalowany.

## Otwarte, nieukryte blokery

1. **Trzy istniejące błędy snapshotów**: `visual: empty desktop map`, `visual: map markers, gallery and photo detail`, `visual: mobile memory sheet`. Na `main` też FAIL; nie nadpisano wzorców automatycznie. Wymagana wizualna ocena zgodności screenshotów z zaakceptowanym rollbackiem.
2. **Jeden istniejący E2E hit-area**: `place marker hit area follows the visible displaced tile`. Nadal FAIL; nawet realne kliknięcie kafelka w diagnostyce nie wybrało miejsca. Nie traktować testu jako nieaktualnego bez dowodu. Nie pozostawiać niesprawdzonych handlerów.
3. Dev-only `npm audit`: 16 zgłoszeń (13 moderate, 3 high: `source-map-js`, `vite`, `zod`); production-only 0. Python CVE audit nie wykonany (`pip-audit` niedostępny).

**Decyzja integracyjna: HOLD.** Pełny `scripts/check.sh` wywołuje 3 czerwone snapshoty, więc **full green NIEOSIĄGNIĘTE**. `main` i produkcja pozostają nietknięte, brak merge. Testów 346/371 nie powtarzać bez zmian odpowiedniego kodu.

## Jednoznaczny następny zakres

Przy nowym czacie: świeży preflight HEAD/agent; najpierw rozstrzygnąć test fizycznego kliknięcia widocznego kafelka na bazie `main` i uzupełnić diagnostykę o DOM target/pointer capture, bez wycofanego prototypu handlerów. Następnie porównać rzeczywiste screenshoty do aktualnego UX i świadomie naprawić zachowanie albo re-baseline po wizualnej akceptacji. Dopiero po zielonym `scripts/check.sh`, E2E i finalnym smoke rozważyć nie-force merge na `main`. Wszystkie wcześniejsze potwierdzone wyniki oraz drobne naprawy są w checkpointcie.
