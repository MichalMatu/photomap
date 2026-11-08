# PhotoMap — handoff po audycie, 2026-11-08

## Punkt wejścia

- Repo: `MichalMatu/photomap`; produkcyjny `main@356289656d66963fb7451b70eac2e1bcff015819` według ostatniej weryfikacji. **Odśwież HEAD**, nie zakładaj niezmienności.
- Wszystkie poprawki i checkpointy na `audit/photomap-repair-20261107`; **niezmergowane**, brak deploymentu/restartu produkcji i force-push.
- Tryb: GitHub Connector + Mac Local Agent + ChatGPT Linux Sandbox. Nigdy Codex, Work ani GitHub Actions, również bez zapytań o ich status.
- Agent: repo id `photomap`, branch sterujący `agent-control`, binding `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`, resources `[]`.
- Mac: root `~/agent-workspace/repos/photomap/work`, clean na gałęzi `agent-work`; izolowany audyt w `~/agent-workspace/repos/photomap/worktrees/audit-20261107` (detached); izolowany bazowy `main` w `~/agent-workspace/repos/photomap/worktrees/baseline-visual-20261108`.
- Przeczytaj `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, `docs/GOLDEN_STATUS.md`, `docs/dev.md` i `docs/checkpoints/2026-11-07-general-audit-repair.md`. Ten checkpoint zawiera szczegółową historię i ścieżki wyników.

## Ukończone poprawki

1. Naprawiono izolację SQLite/Alembic CLI względem `PHOTOMAP_DATA_DIR` i dodano dwa testy regresyjne; RED przed poprawką, potem 12/12 PASS i 21 migracji.
2. Naprawiono kolizję rewizji cache mediów przy dwóch zmianach w tej samej milisekundzie.
3. Naprawiono CSS token gate poprzez centralizację 53 deklaracji przy 0 zmianach wartości obliczonych; nie zwiększano tolerancji lintera.
4. Uzasadniono ShellCheck SC2016 w kontekście PRoot, usunięto cztery nieużywane elementy frontendu po rollbacku.
5. Zsynchronizowano `docs/dev.md`, `docs/GOLDEN_STATUS.md`, niniejszy handoff i checkpoint.

## Potwierdzone testy

- Backend `scripts/check.sh` do dalszych gate'ów: **346/346 pytest PASS**, 90% coverage, Alembic, Ruff, architektura, schemat DB, CSS gate i perf smoke PASS. Pierwotny pełny przebieg zakończył się na ShellCheck, później naprawionym i zweryfikowanym osobno; **nie raportuj całego skryptu jako PASS**.
- Frontend: **371/371 Vitest PASS**, Knip, Prettier, ESLint, TypeScript, CSS token gate i Vite build PASS (dokumentacja wyniku w checkpoint).
- Playwright na systemowym Chrome: admin **18/18 testów PASS**, ale runner FAIL przez 3 wiszące workery. Zainstalowano do cache Maca `chromium-headless-shell` Playwright; z nim dwa testy kontrolne przeszły i procesy zamknęły się czysto.
- Szerszy Playwright (bundled Chromium): **82 PASS / 10 FAIL**. **3 screenshoty + 6 scenariuszy zachowania zawiodły także na oryginalnym `main`**, co osobno potwierdzono w dwóch zadaniach bazowych. Pozostały scenariusz map motion przeszedł na `main` i przy ponownym izolowanym teście audytu **PASS** — prawdopodobny błąd niestabilności pod obciążeniem. `E2E FULL GREEN` **NIEOSIĄGNIĘTE**.
- Bezpieczeństwo: `npm audit --omit=dev` **0**, `npm audit` 16 dev-only (13 moderate, 3 high: source-map-js, vite, zod). `pip check` PASS; `pip-audit` nie zainstalowano. `git diff --check` PASS.
- Read-only smoke produkcji na Pi Zero 2W: `photomap.service`, `cloudflared.service` aktywne; lokalne i publiczne HTTP 200; stan production `main@3562896`. Bez wdrożenia audytu.

## Decyzje i otwarte punkty

**Status audytu: poprawki oraz dowody bazowe zapisane, quality gate E2E OPEN, security tooling PARTIAL.** Niczego nie przeniesiono do `main` ani produkcji. Nie aktualizowano screenshotów, nie zmieniano odziedziczonego UX.

Kolejny sprint: świadomie rozstrzygnąć dziewięć odziedziczonych niezaliczonych testów E2E względem zaakceptowanego rollbacku UX (zachowanie kontra nieaktualne asercje), usunąć niestabilność równoległego map motion, następnie rozważyć kontrolowane uaktualnienia dev dependencies i skan `pip-audit`. Po zweryfikowanym QA oraz wyraźnej decyzji o publikacji rozważyć merge bez force-push. Nie powtarzać już zaliczonych testów backendu czy produkcyjnego read-only smoke bez rzeczywistej potrzeby.
