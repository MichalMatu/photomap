# Code Structure

Ten dokument opisuje aktualne granice techniczne kodu PhotoMap. Nie jest roadmapą; ma pomagać szybko znaleźć właściwe miejsce dla testów, helperów i stylów.

## Backend Tests

Backendowe testy są w `backend/app/tests` i są podzielone według odpowiedzialności:

- `api/admin` - adminowe endpointy, autoryzacja, miasta, kategorie i konfiguracja.
- `api/places`, `api/photos`, `api/memories`, `api/guides`, `api/reports` - publiczne i adminowe kontrakty API dla danej warstwy domeny.
- `contracts` - schemat bazy, OpenAPI i kontrakty mutacji.
- `flows` - pełniejsze przepływy API.
- `importers` - importer manifestów i idempotencja content pipeline.
- `scripts` - kontrakty lokalnych skryptów dev/diagnostycznych.
- `services` - logika domenowa poza route'ami.
- `support` - jawnie importowane helpery testowe, np. nagłówki admina, uploady i fabryki modeli.

`conftest.py` zostaje dla fixture'ów pytest. Helper używany bezpośrednio przez testy powinien trafić do `backend/app/tests/support`, a nie do `conftest.py`.

## Frontend E2E

Playwright testy są w `frontend/e2e`:

- `fixtures` - dane mockowane i małe assety testowe.
- `support` - helpery Playwright, obsługa API testowego, interakcje mapy i asercje ruchu.
- `visual` - mockowane testy wizualne i snapshoty dla mapy, miejsc, tras/kolekcji i admina.
- `smoke` - API-backed smoke flows uruchamiane na izolowanej bazie przez `scripts/quality/e2e.sh`.

Snapshoty są trzymane przy specach w katalogach `*.spec.ts-snapshots`. Przy przenoszeniu speca przenieś odpowiadające snapshoty; nie aktualizuj snapshotów automatycznie bez obejrzenia różnicy.

## Frontend Styles

`frontend/src/styles/app.css` jest entrypointem importów CSS. Odpowiedzialności są rozdzielone tak:

- `ui.css` - bazowe primitives/shared UI: panele, karty, przyciski, statusy, formularze, media frame i modale.
- `content-pages.css` - publiczne strony miejsc oraz tras/kolekcji.
- `map.css` - mapa, markery, galerie miniaturek oraz sheet content mapy.
- `photo-detail.css` - pełnoekranowy podgląd zdjęcia/pamiątki i powiązane akcje właściciela pamiątki.
- `pinned-media.css` - przypięte media i wizualne połączenie z mapą.
- `map-tools.css` - shellowe kontrolki mapy.
- `admin*.css` - panele, formularze, tabele i feature-specific style admina.

Kolory, spacing współdzielony, typografia, cienie, radiusy i motion należą do `frontend/src/design/tokens.css`. Nowy CSS powinien używać tokenów; lokalny CSS dodaje tylko layout, rozmiary mediów albo stan konkretnego komponentu.

## Public Map Layout

Publiczna mapa trzyma reguły wizualnego układu w małych helperach w `frontend/src/components/map`:

- `mapDisplayConfig.ts` centralizuje stałe rozmiaru, gęstości, ruchu i kolizji markerów.
- `mapMarkerScale.ts` wylicza rozmiar pojedynczego markera miejsca z zoomu, priorytetu redakcyjnego i ustawień `app_config.map.marker_scale`.
- `mapMarkerDensity.ts` wybiera widoczne kafle według viewportu, zoomu i ustawień `app_config.map.marker_density` oraz `app_config.map.marker_priority`.
- `placeGallerySizing.ts` wylicza maksymalny obszar rozwiniętej galerii miejsca z realnego viewportu, dostępnego miejsca wokół markera i liczby elementów.
- `mapMotion.ts` układa kafelki rozwiniętej galerii w chmurę/wachlarz, skaluje je do przekazanego obszaru i pilnuje krótkich opóźnień wejścia.

Pierwszy widok mapy renderuje elementy z lekkiego `map preview` (bez `description_blocks` zdjęć). Rozwinięta galeria miejsca po kliknięciu pobiera lekką publiczną listę zdjęć miejsca i pokazuje wszystkie zatwierdzone zdjęcia w wachlarzu. Opis TTS jednego medium ładuje endpoint detail zdjęcia dopiero w modalu. Nie ma stałego niskiego limitu widocznych miniaturek: obszar ma rosnąć na większych ekranach i dla gęstszych zestawów, ale musi pozostać bez nachodzenia kafli i bez wychodzenia poza ramkę mapy. Ten kontrakt chronią testy jednostkowe `mapMotion.test.ts` oraz E2E `frontend/e2e/visual/map-gallery-sizing.spec.ts` i `frontend/e2e/visual/map.spec.ts`.

## Przypięte zdjęcia i szuflada

Przypięte zdjęcia można układać swobodnie nad mapą albo odkładać do dolnej szuflady. Podczas przeciągania szuflada sygnalizuje obszar upuszczenia, a jej otwarcie zmniejsza wysokość mapy i uruchamia przeliczenie Leaflet. Przypięcia, położenia, stan opisów i informacja o odłożeniu do szuflady pozostają w dotychczasowym versioned localStorage; nie zmienia to publicznego API ani magazynu zdjęć. Miniatury w szufladzie używają ścieżek thumb. Dostępność: przyciski do odkładania i wyciągania działają także bez przeciągania.

## Media Storage Contract

- Redakcyjne `Photo`: jeden niemodyfikowalny oryginal w `backend/storage/private`, publiczny endpoint `/api/places/{place_id}/photos/{photo_id}/media/image` serwuje dokladnie jego bajty dla zatwierdzonego zdjecia, a fizycznie generowana jest tylko miniatura.
- `Memory`: prywatny oryginal + osobna publiczna pochodna + miniatura.
- `original_path` jest niepusty dla `pending` i `approved`. `NULL` oznacza tylko swiadomie usuniety prywatny oryginal rekordu `rejected` po retencji.
- Retencja jest fail-safe dla wszystkich destrukcyjnych zmian: rejected commitują `original_path = NULL` przed unlinkiem, a approved `Memory` commitują ścieżkę retained przed usunięciem poprzedniego oryginału. Niepowodzenie DB nie może zostawić martwego wskaźnika; niepowodzenie unlink może najwyżej zostawić orphan wykrywany przez diagnostykę.
- Diagnostyka traktuje `NULL` jako poprawny tylko dla purged `rejected`; brak oryginalu w pozostalych stanach jest bledem.
- Publiczne payloady nigdy nie ujawniaja `original_path` ani prywatnych sciezek storage.

## Refactor Closure

Większy refaktor kończy się adekwatną weryfikacją i spójnym commit/push:

- backendowy kontrakt lub struktura testów: `cd backend && ./.venv/bin/python -m pytest`, a po większej zmianie `./scripts/check.sh`;
- frontendowe komponenty albo CSS: `cd frontend && npm run test`, `npm run build`, a dla mapy/admina/layoutu także `npm run test:e2e`;
- zmiana wizualna: sanity check desktop i mobile dla dotkniętych powierzchni;
- po zielonych testach commituj tylko zamknięty etap i pushuj tę samą zmianę.
