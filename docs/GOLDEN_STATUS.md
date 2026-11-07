# PhotoMap — GOLDEN STATUS / checkpoint końcowy (03.11.2026)

## Doprecyzowanie po rollbacku i audyt 07.11.2026

Niniejszy checkpoint z 03.11 pozostaje historycznym zapisem zaakceptowanego wydania UI.
**04.11.2026 nastąpił późniejszy, kontrolowany rollback UX** do drzewa źródeł sprzed sprintu:
`main@356289656d66963fb7451b70eac2e1bcff015819`. Mac Local Agent potwierdził
wtedy na Pi kod źródłowy, przywrócony `public-map-D41-GBxF.js`, działające
`photomap.service` i `cloudflared.service` oraz HTTP 200 dla health/mapy.
Weryfikacja z 04.11 nie oznacza automatycznie potwierdzenia bieżącego live runtime.

Prace audytowo-naprawcze z 07.11 są odseparowane na
`audit/photomap-repair-20261107`; **nie są częścią produkcyjnego `main`**.
Bieżące dowody, ograniczenia, dalsze gate'y oraz przekazanie prac:
[checkpoint audytu](checkpoints/2026-11-07-general-audit-repair.md) i
[HANDOFF_NEXT_CHAT](HANDOFF_NEXT_CHAT.md).
Nie przywracać wycofanego UX bez osobnej decyzji i dowodów regresji.

## Stan produkcyjny

- **Działa:** https://photomap.pl, `/`, `/health`, `/api/places/map`, nowy JS mapy i CSS: HTTP 200 z publicznej domeny i na Pi.
- **SHA produkcyjnego kodu:** `8af9eb36d0a023dc39b0d0f032279182912dcd96` (frontend + porządek Prettier); dokumentacja może być późniejszym, czysto tekstowym fast-forward na `main`.
- **Hash aktywnego `frontend/dist/index.html`:** `5177a82937d38c8d2ba5b8a41156b30354f523b5c293a203d0b6ef62a5af78b5`. Mapa: `public-map-D41-GBxF.js`, styl: `index-jfCVnXmJ.css`.
- **Urządzenie:** Raspberry Pi Zero 2W, host `zero2`, repo `/home/michal/src/PhotoMaps`, gałąź `main`, serwis `photomap.service`, tunel `cloudflared.service`.
- Na prośbę wykonano kontrolowany restart **samej usługi PhotoMap**. Backend PID zmienił się z `2765142` na `3797751`, tunnel PID `222848` pozostał bez zmian; health/API PASS.
- **Backup przed ostatnią aktualizacją:** `.dev/deploy/golden-20261103/` na Pi: `dist-before/`, spójny online `app-before.db`, `head-before.sha`, identyfikatory PID. Poprzedni backup: `.dev/deploy/2026-11-03-three-stage-32332f2/`.
- Bezpieczny rollback UI: przywrócić atomowo `index.html` z `dist-before`, nie kasować zahashowanych assetów; backend i baza bez migracji. W razie potrzeby cofnięcia źródeł użyć zwykłego `git revert`, bez force-push.

## Ostateczne działanie UI

- Jedna szuflada dolna: zwinięty pasek, poziomo przewijana przypięta kolekcja, dodatkowo wysuwana siatka zdjęć z bieżącego obszaru mapy.
- Dłuższe przytrzymanie (520 ms) przypiętej miniatury na telefonie / przytrzymanie myszy na desktopie pokazuje przycisk usuwania na jej środku; dotknięcie poza nim ukrywa go. Bez okna potwierdzenia i bez Cofnij.
- **Ostatnia poprawka:** zamiast typograficznego „×” zastosowano symetryczną, wycentrowaną ikonę SVG w czerwieni `#ef4444`. Usuwanie dotyczy przypięcia, nie zdjęcia w galerii. Poprawiono zwykłe kliknięcie po wyłączeniu trybu usuwania.
- Zachowane: galeria miejsca, dock/undock, przewijanie, przypięcia po przeładowaniu, interaktywny samouczek.

## Zweryfikowana jakość — MacBook + Mac Local Agent

- `npm run format:check` **PASS w całym frontendzie**, pięć wcześniejszych plików samouczka doprowadzono do Prettier.
- TypeScript i typy E2E **PASS**, ESLint **PASS**, produkcyjny Vite build **PASS**.
- Vitest: **370/370 PASS** w 103 zestawach.
- Chrome Playwright: **8/8 PASS** (szuflada, rzeczywiste usunięcie i czerwone wycentrowane SVG, trwałość przypięcia, discovery oraz cztery scenariusze samouczka).
- Publiczny HTTP smoke po wdrożeniu: `/`, `/health`, `/api/places/map`, nowy JS/CSS **200**. SQLite backup `quick_check=ok`; kod wdrożono bez zmian backendu.

## Zakończone porządki

- GitHub: tylko `main` oraz infrastrukturalny `agent-control`. Usunięto scaloną gałąź `feat/discovery-media-drawer-20261102`.
- Mac: usunięto **46** starych worktree oraz **4** lokalne gałęzie robocze. Pozostają `main` i **operacyjna** gałąź `agent-work`, konieczna dla Mac Local Agenta.
- Przed czyszczeniem zabezpieczono pełną lokalną historię gałęzi w zweryfikowanym Git bundle (16 077 039 bajtów) i **5** niezacommitowanych zestawów zmian jako poprawki binarne, wraz z manifestem:
  `/Users/michal/agent-workspace/archives/photomap/golden-20261103/`.
- Trzy pośrednie raporty karuzeli z 02–03.11 połączono w bieżący checkpoint; pełne historyczne wersje są dostępne w historii Git przed tym commitem. README wskazuje tylko dokumentację operacyjną i produktową.

## Wejście po dłuższej przerwie

Przeczytać `AGENTS.md`, ten dokument oraz `docs/deploy-pi-zero2w.md`; odczytać **aktualny** HEAD `main` z GitHub i Pi, status `photomap.service` / `cloudflared.service`, sprawdzić czystość repo, `/health` i `/api/places/map`. Korzystać wyłącznie z GitHub Connector + Mac Local Agent; nie odpalać GitHub Actions, Codex ani Work. Nie powtarzać zakończonych testów bez zmian kodu. Obecny etap nie ma otwartych blokad rozwojowych.
