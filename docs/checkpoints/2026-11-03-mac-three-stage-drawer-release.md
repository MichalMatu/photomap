# PhotoMap — trzystopniowa szuflada i przypięta kolekcja (03.11.2026)

## Zakres produktu

- Jedna dolna szuflada ma trzy stany: `collapsed` (pasek), `collection` (przewijana poziomo kolekcja przypiętych zdjęć), `discovery` (kolekcja i siatka zdjęć z aktualnego obszaru mapy).
- Przypięte zdjęcia nie mieszają się z rekomendacjami; kiedy kolekcja jest pusta, zdjęcia mapy pozostają widoczne.
- Przytrzymanie przypiętej miniatury przez 520 ms ujawnia wyłącznie na niej okrągły, wyśrodkowany przycisk usuwania. Na komputerze gest oznacza przytrzymanie lewego przycisku myszy; na telefonie dłuższy dotyk. Kliknięcie gdziekolwiek indziej chowa przycisk.
- Usunięcie usuwa jedynie przypięcie z lokalnej kolekcji, a nie fotografię miejsca. Bez dodatkowych potwierdzeń i bez Cofnij.
- Kliknięcie miniatury otwiera dotychczasowy podgląd; przeciągnięcie z szuflady na mapę i poziome przewijanie są zachowane.
- Minimalna logika stanów i progu gestu ma test jednostkowy `pinnedMediaDrawerStage.test.ts`.

## Środowisko i kontrole

Źródło zmian: przygotowanie i próby na Samsungu Termux, a po przerwaniu i przełączeniu platformy — odtworzenie dokładnych plików i końcowy reaudyt w osobnym worktree MacBooka, przez PhotoMap Local Agent oraz GitHub Connector. Bez Codex, Work ani GitHub Actions.

- **TypeScript frontend i E2E: PASS**.
- **ESLint: PASS**.
- **Prettier tylko zmienionych dziesięciu plików: PASS**. Globalne `npm run format:check` raportuje pięć wcześniejszych, niezwiązanych plików samouczka mapy (`map-tour`, `MapTour`, `mapTourSteps`), nietkniętych w tym sprincie.
- **Vitest: 370/370 PASS, 103 zestawy**.
- **Vite build: PASS**.
- **Playwright / prawdziwy Google Chrome na Macu: 4/4 PASS**:
  1. Rekomendacje z widocznej mapy i otwieranie galerii.
  2. Trzystopniowa szuflada, dock/undock, trwałość przypięcia, przytrzymanie i ukrycie przycisku.
  3. Wyśrodkowanie usuwania, faktyczne odpięcie bez usuwania miejsca oraz brak powrotu przypięcia po reload.
  4. Przypięte pełnogaleryjne zdjęcie zachowane po odświeżeniu, mimo braku w publicznym `map preview`.
- W czasie prac usunięto błąd blokowania zwykłego kliknięcia po schowaniu przycisku oraz ustabilizowano test przytrzymania podczas przejścia wysokości szuflady.

## Operacje i wdrożenie

Kod pozostaje frontend-only. Procedura wydania i rollbacku: `docs/deploy-pi-zero2w.md`: spójny backup SQLite oraz kopia starego `frontend/dist`, fast-forward `main` na Pi, synchronizacja nowych zahashowanych assetów bez usuwania starych, atomowe przełączenie `index.html`, kontrola API i niezmienionych PID backendu oraz Cloudflare Tunnel. Szczegóły rzeczywistego wdrożenia mają być zapisane w oddzielnym postdeploy checkpoincie; PASS testów nie oznacza automatycznie wdrożenia.

## Produkcja — wdrożenie frontend-only (03.11.2026)

- Zatwierdzony kod frontendu i source deployment: `32332f2de15a5bf68f087094c8df83ea27f44fa6`, przekazany na `main` przez fast-forward, bez GitHub Actions.
- Raspberry Pi Zero 2W: `/home/michal/src/PhotoMaps`, `main` po fast-forward do dokładnego SHA release; przed wdrożeniem było `deaa562cdeaffff0b14beafa2a2bd1a128bf38fe`.
- Bezpieczny backup na Pi: `.dev/deploy/2026-11-03-three-stage-32332f2/` (`dist-before/`, `app-before.db` spójny SQLite online, poprzedni SHA, SHA256 starego indexu i PID-y).
- Frontend zbudowany na Macu z `VITE_API_BASE_URL=`. Hashed assets dostarczone bez `--delete`; `index.html.next` sprawdzony, a następnie atomowo przemianowany na `index.html`.
- Produkcyjny `index.html` SHA256: `80e5157e3812fe0d77296427de22477ccad095cad1164a17e07138ce3c24bd6e`; siedem wskazanych przez indeks plików JS/CSS istnieje na Pi i odpowiada HTTP 200.
- Local `/`, `/health`, `/api/places/map` oraz wszystkie siedem assetów: **HTTP 200 PASS**; `PRAGMA quick_check=ok`; repo Pi czyste.
- Publiczne `https://photomap.pl/`, `/health`, `/api/places/map`, `/assets/public-map-D5u8NgqW.js` i `/assets/index-Nj3bNDLA.css`: **HTTP 200 PASS**; HTML wskazuje nowy JS.
- **Bez restartu** `photomap.service` i `cloudflared.service`: PID backendu `2765142`, PID tunelu `222848` nie zmieniły się.
- Testy przed wydaniem: Vitest **370/370 PASS**, Chrome Playwright **4/4 PASS**, TypeScript, lint, build i formatowanie zmienionych plików PASS. Nie uruchamiano ponownie zakończonych testów po wdrożeniu, wyłącznie testy HTTP, PID, SHA i SQLite.
- Punkt powrotu UI: poprzedni `index.html` w `$BACKUP/dist-before/index.html`, przywracany atomowo; nie cofaj bazy ani nie kasuj nowych/ustępujących assetów na zwykły rollback frontend-only.
- Dowody z Mac Local Agent na `agent-control/.agent/results/`: `photomap-mac-three-stage-feature-publish-20261103-v1.json`, `photomap-mac-pi-backup-three-stage-20261103-v1.json`, `photomap-mac-pi-three-stage-stage-assets-20261103-v1.json`, `photomap-mac-pi-three-stage-atomic-activate-20261103-v1.json`, `photomap-mac-public-postdeploy-20261103-v1.json`.
