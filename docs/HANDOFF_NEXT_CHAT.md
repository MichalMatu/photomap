# PhotoMap — NEXT CHAT / handoff 2026-11-07

## Wejście

Repo: `MichalMatu/photomap`. Base: `main@356289656d66963fb7451b70eac2e1bcff015819` (zawsze pobierz bieżący HEAD). Wykonane poprawki są na `audit/photomap-repair-20261107`, **nie na produkcyjnym main**. Najpierw przeczytaj `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, `docs/GOLDEN_STATUS.md`, `docs/dev.md` i `docs/checkpoints/2026-11-07-general-audit-repair.md`.

Tryb: **GitHub Connector + Mac Local Agent + ChatGPT Linux Sandbox**; nie używaj Codex, Work ani GitHub Actions. GitHub `agent-control` to tylko kolejka; binding: `.agent/binding.json`. Nie zmieniaj produkcji bez evidence gate'ów i świadomej decyzji.

## Co jest faktycznie ukończone

- Preflight GitHub + Mac Local Agent: HEAD zgodny, root clean, toolchain obecny. Dowód: `.agent/results/photomap-general-audit-preflight-20261107-v1.json`.
- Przywrócenie starego UX po niezaakceptowanym eksperymencie zostało wykonane 04.11. Produkcyjny stan potwierdzono wtedy, nie powtarzaj starej kampanii testowej bez nowej regresji.
- Naprawa CLI Alembic ignorującego `PHOTOMAP_DATA_DIR`: test RED w `.agent/results/photomap-audit-alembic-red-test-20261107-v1.json`, test GREEN 12/12 i 21 migracji w `.agent/results/photomap-audit-alembic-green-20261107-v1.json`.
- Poprawka monotonicznego identyfikatora cache mediów + jednostkowy test szybkich edycji.
- Synchronizacja `docs/dev.md`, `docs/GOLDEN_STATUS.md` i checkpointu sprintu.

## Najpierw zweryfikować

1. Pobierz **najświeższy** `main`, `audit/photomap-repair-20261107`, `agent-control`; sprawdź aktualny binding i stan agenta. Mac root `$HOME/agent-workspace/repos/photomap/work` jest chroniony; nie nadpisuj cudzych zmian.
2. Odczytaj terminalny wynik zadania `photomap-general-audit-full-gates-20261107-v1` w `.agent/results/` (run w `.agent/runs/`). Jeśli brak terminalnego wyniku, nie zgaduj statusu. Wersja source w tym gate to `ef935a6d2a0d9c47921b4382a01fa6e223adabd4` — późniejsze zmiany dokumentacji nie modyfikują kodu, ale wymagają `git diff --check`.
3. Jeżeli poleciał fail: odczytaj `/tmp/photomap-audit-full-check-20261107.log` przez bezpieczne zadanie Local Agent, rozdziel testy odziedziczone, środowiskowe i nowe. Wcześniej 5/5 porównań E2E starego baseline było czerwonych. Nie aktualizuj screenshotów automatycznie.
4. Po naprawach uruchom równoważny `./scripts/check.sh`, lint, typecheck, build, unit/integration/E2E, security/deps na **izolowanym** worktree, DB i storage; żadnego produkcyjnego resetowania danych. Zapisz dokładne liczby i zakresy.
5. Odczytaj bez restartu bieżące `photomap.service` i `cloudflared.service`, `main` Pi i publiczne `/health`, `/api/places/map`; dopiero po tym rozważ zgodne z repo scalenie. Audyt nie jest równoznaczny z automatycznym deployem.

## Status do zamknięcia

- Ostatnie potwierdzenie bieżącego `main` w preflight: `356289656d66963fb7451b70eac2e1bcff015819`.
- Gałąź audytu: `audit/photomap-repair-20261107` (pobierz SHA na wejściu; nie kopiuj tu statycznego SHA po kolejnych commitach).
- Baza: poprawiona i zweryfikowana. Media cache: poprawiony, pełny frontend quality gate do potwierdzenia.
- Produkcja: nietknięta przez ten sprint; znany test live 04.11 po rollbacku.
- Żaden otwarty quality gate nie jest oznaczony PASS bez logu terminalnego. Dokumentacja i checkpoint powinny zostać jeszcze raz uzupełnione po wyniku.

## Następny, ściśle ograniczony sprint

Dokończyć istniejący audyt: zamknąć terminalne quality gates, regresje visual E2E i odczyt-only produkcyjny smoke; zaktualizować checkpoint i rozważyć merge. Bez dodawania funkcji i bez odtwarzania wycofanego UX.
