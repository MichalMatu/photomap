# PhotoMap — interaktywny samouczek mapy

Samouczek PhotoMap obejmuje miejsca, fotografie, audio, lektora, przypinanie, wspomnienia i warstwy. Od 2026-10-27 prowadzi przez stronę bez zasłaniania mapy i bez wskazywania jednej konkretnej fotografii. Nie wymaga nowych endpointów ani zmian danych. Produkcyjny frontend jest budowany na Macu i wdrażany na Raspberry Pi Zero 2 W zgodnie z `docs/deploy-pi-zero2w.md`.

## Zachowanie

Przy pierwszej wizycie na publicznej mapie, po załadowaniu danych, pojawia się wprowadzenie. Przewodnik obejmuje: powitanie, miejsce, galerię, szczegóły fotografii, nagranie miejsca (gdy jest dostępne), lektora opisu (gdy opis istnieje), przypinanie fotografii, przypiętą kartę, przycisk dodawania wspomnienia, formularz wspomnienia, warstwy, trasy i zakończenie. Pięć kroków reaguje na rzeczywiste akcje użytkownika: otwarcie miejsca, otwarcie zdjęcia, przypięcie zdjęcia i otwarcie formularza wspomnienia; krok warstw również reaguje na przełączenie. Samouczek nie przyciemnia mapy, nie rysuje obramowania i nie wskazuje pojedynczej miniatury. Karta instrukcji jest przytwierdzona do dolnego rogu, a wszystkie zdjęcia, kafle i przyciski zachowują swoje normalne działanie. Na wymaganych krokach przycisk „Dalej” jest nieaktywny; przejście następuje automatycznie po prawdziwym kliknięciu dowolnego miejsca, fotografii, pinezki, plusa przy wspomnieniu lub przełączeniu warstwy. Jeśli dana akcja nie jest dostępna, pojawia się jawny przycisk „Pomiń krok”, pomijający zależne, niedostępne ekrany.

`Pomiń` i `Zaczynam!` zapisują `photomap-public-map-tour-v3-complete` w localStorage; nowy klucz umożliwia pokazanie zaktualizowanej wersji po premierze. Samouczek można otworzyć ponownie w **Menu → Samouczek**. Zmiana warstw w przewodniku jest tymczasowa i przy zamknięciu przywracana. Przewodnik nie wysyła formularzy ani nie zapisuje danych w backendzie. Wspomnienie jest tylko objaśniane, a nie wysyłane automatycznie. Nagranie i TTS uruchamia wyłącznie użytkownik; przypięcie jest lokalną, odwracalną akcją UI.

Kod: `frontend/src/components/tour/MapTour.tsx`, `mapTourSteps.ts`, `frontend/src/styles/map-tour.css`; integracje: `PublicMapPage`, `PlaceMap`, `PlaceLayer`, `AppShell`. Nie kopiujemy struktury niebundlowanego JS z IleStoi.

## Mac — podgląd bez Raspberry Pi

Deweloperski checkout obsługiwany przez Local Agent to `~/agent-workspace/repos/photomap/work`. Po synchronizacji brancha, w zwykłym Terminalu Maca:

```sh
cd ~/agent-workspace/repos/photomap/work
git rev-parse --short HEAD
make start
# przeglądarka Mac: http://127.0.0.1:5174
# po testach:
make stop
```

`make start` uruchamia lokalny FastAPI na `127.0.0.1:8000` i Vite na `127.0.0.1:5174`. Nie dotyka Pi, tunelu ani produkcyjnego `main`. Zatrzymuj tylko procesy zarządzane przez lokalny `make stop`. Nie zmieniaj ręcznie gałęzi `agent-work` w katalogu obsługiwanym przez Local Agent.

Dla niezależnych, powtarzalnych testów bez zależności od zawartości lokalnej bazy:

```sh
cd ~/agent-workspace/repos/photomap/work
E2E_CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./scripts/quality/e2e.sh e2e/visual/map-tour.spec.ts --workers=1
```

Test używa portów `15174`/`18080` oraz izolowanej `.dev/e2e` i zatrzymuje własne serwery po zakończeniu. Testy jednostkowe: `cd frontend && npm run test -- src/components/tour/mapTourSteps.test.ts`; przed promocją: build, lint i manualny przegląd na desktopie i telefonie.

Uwaga: ręczny podgląd `make start` wyświetla dane obecne w lokalnej bazie Maca. Bez opublikowanych miejsc ze zdjęciami tutorial nadal działa z fallbackiem, ale pełny przebieg po realnych miniaturach najlepiej weryfikować z danymi testowymi w Playwright.
