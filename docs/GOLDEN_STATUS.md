# PhotoMap — GOLDEN STATUS / aktualny release 04.11.2026

## Aktywny release: spójny UX mapy

- **Produkcyjny kod i źródło builda:** `09be8c4ef70a30791de2698c1c39779e4ab544eb` na `main`; Raspberry Pi `zero2` fast-forward do tego SHA. Nowsze commity dokumentacyjne na `main` nie zmieniają wersji uruchomionego frontendu.
- **Publiczna domena:** https://photomap.pl. Atomowa aktywacja statycznego `frontend/dist/index.html` zakończona `PASS`. Hash indeksu na Mac i Pi: `ccc80c6f664853030e4674dfc783ec1607a9923e823b10f35b221a7348e48a1d`.
- **Aktywne assety:** `index-C6t6Kjzg.js`, `public-map-DWDElC8J.js`, `index-BMjVQ3ud.css`. Nowy HTML oraz assety zweryfikowane na porcie lokalnym Pi i w publicznej domenie; `/`, `/health`, `/api/places/map`, JS — HTTP 200.
- **Procesy nienaruszone:** `photomap.service` PID `3797751`, `cloudflared.service` PID `222848`. Bez restartu backendu, tunelu, migracji i zmian danych.
- **Backup i rollback:** `/home/michal/src/PhotoMaps/.dev/deploy/unified-ux-20261104-09be8c4/` zawiera `dist-before/`, `index-before.html`, spójny `app-before.db` (`PRAGMA quick_check=ok`), poprzedni HEAD oraz PID-y. Poprzedni indeks: `5177a82937d38c8d2ba5b8a41156b30354f523b5c293a203d0b6ef62a5af78b5`. Przy rollbacku UI przywrócić kopię indeksu atomowo; nie usuwać nowych ani starych zahashowanych assetów.
- **Zmiany UX:** pojedyncze menu nawigacyjne (Mapa/Trasy/Samouczek), osobne panele `Filtry` i `Widok`, czytelne kategorie z API, niedestrukcyjny reset filtrów, mapa widoczna podczas filtrowania oraz przewidywalna dolna szuflada startująca zwinięta. Mobile i desktop korzystają z tych samych stanów.
- **Odbiór:** Vitest `369/369 PASS`; TypeScript, lint, knip, Prettier i build `PASS`; Chrome E2E dedykowany temu sprintowi `14/14 PASS` (w tym pięć viewportów). Live Chrome na publicznej domenie: **390×844 i 1440×900 PASS**, bez poziomego overflow, page errors ani błędów zasobów.
- **Znany wcześniejszy dług:** rozszerzony pakiet 24 testów `19 PASS / 5 FAIL`, identyczne pięć niezgodności występuje na czystym poprzednim `main` `30bff5c` (dwa historyczne snapshoty, hit-area przesuniętego markera, double-click połączenia przypiętego medium z mapą, tekst ukrytej kopii pionowej karty). Nie uznawać ich za naprawione. Gate CSS tokenów zawiera historyczne niezgodności zarówno na bazie, jak i po sprincie, bez przyrostu.
- **Checkpoint implementacyjny:** [2026-11-04-unified-map-ux.md](checkpoints/2026-11-04-unified-map-ux.md). Local Agent: `photomap-unified-ux-atomic-activate-20261104-v2` (pełne wdrożenie PASS) i `photomap-unified-ux-live-chrome-smoke-20261104-v1` (produkcja PASS).

## Poprzedni checkpoint — 03.11.2026 (historyczny)

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
