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
