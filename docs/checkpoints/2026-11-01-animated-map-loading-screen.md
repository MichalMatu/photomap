# PhotoMap — pełnoekranowa animacja ładowania mapy (01.11.2026)

## Kontrakt UX

- Ekran powitalnego ładowania dotyczy publicznej mapy `/`, zasłania cały viewport zarówno na telefonie (także pion/poziom), jak i komputerze.
- W lekkim, wektorowym SVG pokazuje znak PhotoMap, góry, rozkładaną mapę, rysowaną trasę, pinezki i kadry fotograficzne. Nie pobiera zewnętrznych obrazów ani nie blokuje pierwszego renderu mapy.
- Nakładka pozostaje widoczna co najmniej 450 ms, a następnie po pobraniu danych i sygnale `load` pierwszej warstwy kafelków Leaflet zanika przez `opacity: 1 → 0` w 520 ms. Przez ten czas prawdziwa mapa działa pod spodem i płynnie staje się widoczna.
- Gdy dane API są gotowe, ale kafelki nie odpowiedzą, fallback 5 s odblokowuje stronę; błąd danych mapy pokazuje istniejący komunikat i również zwalnia nakładkę. Nie wymuszaj odliczania progresu.
- `prefers-reduced-motion: reduce` wyłącza animacje SVG i crossfade; widok znika bez efektu, gdy jest gotowy.
- Samouczek pojawia się dopiero po zakończeniu nakładki, żeby nie wyświetlać go pod nią.
- Wszystkie elementy wizualne są lokalnym SVG/CSS, bez nowej zależności, kodu backendu czy modyfikacji bazy.

## Kod

- `frontend/src/components/map/MapLoadingScreen.tsx` — fazy widoczności i ilustracja.
- `frontend/src/styles/map-loading.css` — układ responsywny, animacje i reduced motion.
- `frontend/src/pages/PublicMapPage.tsx` — warunki gotowości API i warstwy mapy, fallback i samouczek.
- `frontend/src/components/map/PlaceMap.tsx` — sygnał `TileLayer.load`.
- `frontend/src/design/tokens.css` — paleta ilustracji.
- `frontend/e2e/visual/map-loading-screen.spec.ts` — mobile/desktop/reduced-motion.

## Potwierdzenie przed scaleniem

Dla PR #63 (źródłowy kod SHA `88258c553cd7052a84858e793db8588bf62d4dfc`) na Macu przez Local Agent: Prettier PASS, TypeScript PASS, ESLint PASS, produkcyjny build Vite PASS, 366/366 Vitest PASS, 7/7 Playwright PASS (włącznie z map-attribution, map-pin-coverage i pinned-media-drawer).

## Wdrożenie

Frontend-only: dokładny `main` SHA, build na Macu, preflight RAM i usług na Pi Zero 2W, backup `dist` i spójny SQLite, fast-forward Git, atomowa podmiana indeksu oraz kontrola `/health`, `/api/places/map`, JS i ciągłości PID bez restartu backendu. Por. `docs/deploy-pi-zero2w.md`.
