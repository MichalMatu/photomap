# PhotoMap — GOLDEN STATUS / checkpoint historyczny i bieżący

## Stan bieżący — 09.11.2026, korekta przejść i wysokości (STAGED / NOT LIVE)

- **Naprawiono kod**: znikające miniatury z uchwytu podczas rozwijania oraz nadmierna pusta przestrzeń u dołu największej szuflady. Nowe źródła `main@e6c3a877a24fdcc36508ec503f78e5d758b9195d` są zsynchronizowane na Raspberry Pi.
- **QA:** Prettier, lint, TypeScript, build PASS; Vitest 3/3 i Chrome Playwright 7/7 PASS.
- **Aktywny publicznie nadal poprzedni frontend:** `frontend/dist/index.html` SHA256 `38199380ed27f6d007f9c2f638641564c8c9e73306c9386029b080ed03a6f955`. Nowa wersja jest przesłana do `frontend/dist/index.html.next` (SHA256 `17ea840e90094fbb085a64ef5c90cde0a1f207b9d9fc37b5d3d7df503be2f1fe`), lecz jej atomowa aktywacja została zablokowana przez kontrolę narzędzia. Nie traktuj tej poprawki jako wydanej produkcyjnie.
- **Odzyskanie:** poprzedni statyczny build w `.dev/deploy/2026-11-09-drawer-fit-e6c3a87/dist-before/`, a poprzedni poprawny snapshot SQLite w `.dev/deploy/2026-11-09-compact-drawer-ef1a903/app-before.db`; brak zmian backendu i bazy.
- **Porządki otwarte:** trzy scalone gałęzie UX oczekują na usunięcie (narzędzie zablokowało operację); rozbieżną `audit/photomap-repair-20261107` zachować. Szczegóły i dalsza procedura w [checkpoincie](checkpoints/2026-11-09-drawer-transition-content-fit-release.md).

## Aktualny produkcyjny frontend — 09.11.2026, korekta szuflady

- **Wdrożono dopracowany UX** dolnej szuflady: kursor `grab/grabbing` zamiast `ns-resize`, krótszy uchwyt bez pustego pasa, brak redundantnego tytułu przy samych zdjęciach, mały fokus na znaczniku zamiast niebieskiego obrysu panelu, zachowane chwytanie poza uchwytem oraz obsługa dotyku.
- **Źródła na Pi:** `main@ef1a903a74dfd3df588f7598fa378126c55865c6`; **aktywny index SHA256:** `38199380ed27f6d007f9c2f638641564c8c9e73306c9386029b080ed03a6f955`.
- **Publiczne zasoby:** `index-CgV_TFTO.js`, `index-BeBTM2BB.css`, `public-map-CcCrSDoE.js` — HTTP 200. Publiczne `/health` OK, `/api/places/map` 200.
- **Weryfikacja:** Prettier, TypeScript, ESLint, build, Vitest 3/3 i Chrome Playwright 5/5 PASS. Szczegóły i rozpoznany problem nakładki ładowania: [checkpoint korekty](checkpoints/2026-11-09-photo-drawer-compact-ux-polish.md).
- **Backup i rollback:** `.dev/deploy/2026-11-09-compact-drawer-ef1a903/` na Raspberry Pi: `dist-before/`, spójny snapshot SQLite i PID-y. Bez migracji i restartów; backend PID `2669406`, Cloudflare PID `222848`. Odwrócenie UI przez atomowe przywrócenie poprzedniego `index.html` (bez kasowania zahashowanych assetów).

## Aktualizacja produkcyjna — 09.11.2026

- **Wdrożono płynną szufladę zdjęć**: przeciąganie palcem i myszą za uchwyt lub nagłówek, wysokość pośrednia, szybki swipe, synchronizacja wysokości mapy i atrybucji. Zachowano kliknięcia, przypinanie, przeciąganie zdjęć i usuwanie po przytrzymaniu.
- **Produkcyjny kod UI:** `main@90609f7733b178da9f2687e2133c64b47fb7338b`; `frontend/dist/index.html` SHA256 `fd9ccd24cd8638eae979b94b9f01e4cbbacd7a19ec3264f096df6df974cf74ae`.
- **Zasoby:** `index-PEafTVoL.js`, `public-map-ZUEh_Tys.js`, `index-CoSvbh38.css` — produkcyjne HTTP 200; `/health` OK, `/api/places/map` 200.
- **Testy zmiany:** TypeScript, ESLint, build PASS; Vitest 3/3 PASS; Chrome Playwright 5/5 PASS. Dokumentacja i szczegóły: [checkpoint 09.11](checkpoints/2026-11-09-fluid-photo-drawer-ux.md).
- **Backup:** `.dev/deploy/2026-11-09-fluid-photo-drawer-90609f7/` na Pi: `dist-before/` + spójny `app-before.db`, źródłowy SHA, hash indeksu, PID. Pi `main` czysty po wdrożeniu; backend PID `2669406`, tunel PID `222848` bez restartu.
- **Rollback UI:** atomowo przywrócić `dist-before/index.html` z backupu bieżącego wdrożenia; nie wykonywać migracji bazy ani restartu backendu. Publiczny HTML otrzymuje dynamiczne SEO/CSP i skrypt Cloudflare, dlatego jego hash nie musi być równy statycznemu `index.html`; porównuj lokalny plik i publiczne nazwy zasobów.

## Stan historyczny — checkpoint 03.11.2026

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
