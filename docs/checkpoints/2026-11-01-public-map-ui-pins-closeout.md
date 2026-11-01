# PhotoMap — finalny reaudyt i checkpoint mapy publicznej (01.11.2026)

**Wynik: etap UI mapy, przypiętych zdjęć i niezależnej logiki pinezek ZAMKNIĘTY — PASS.**

## Identyfikacja i stan produkcji

- Repozytorium: `MichalMatu/photomap`, kanoniczny kod: `main`.
- Ostatnia **funkcjonalna wersja produkcyjna** z reaudytu: `85a15f8b774a85b5cefc2a187e602b952c387da9` (PR [#61](https://github.com/MichalMatu/photomap/pull/61)).
- Wersja przed naprawą reaudytową: `b7015955d639ddbf9583e74629fb3cfdbdec4fde` (PR #60).
- Publiczna strona: <https://photomap.pl>; host: Raspberry Pi Zero 2W; proces `photomap.service`, tunel systemowy `cloudflared.service`.
- SHA256 produkcyjnego `frontend/dist/index.html`: `c7558c79f65c10eeb7f2a1f3fa54bb0089115698d088219959069a7379a63655` — identyczny z buildem release na Macu.
- Publiczny JS z tego indeksu: `/assets/index-Yoy0HJWt.js`, HTTP 200.
- Backend `MainPID=2765142` zachowany przez deploy; backend ani Cloudflare Tunnel **nie były restartowane**.

Ten plik dokumentuje stan release'u funkcjonalnego. Późniejsze commity zawierające wyłącznie dokumentację mogą zmienić `main` i HEAD repozytorium na Pi bez zmiany tego artefaktu frontendu. Zawsze sprawdź aktualny `main`, zamiast zakładać niniejszy SHA jako bieżący HEAD.

## Domknięty zakres zmian

| PR | Wynik |
| --- | --- |
| [#53](https://github.com/MichalMatu/photomap/pull/53) | Uporządkowanie przypiętych kart, ikon i przełącznika widoku mapy |
| [#54](https://github.com/MichalMatu/photomap/pull/54) | Dwukierunkowe gesty menu; mniejszy boczny pasek; wygaszanie akcji kart po 2,5 s |
| [#55](https://github.com/MichalMatu/photomap/pull/55), [#56](https://github.com/MichalMatu/photomap/pull/56) | Redukcja atrybucji mapy do małego, stale widocznego linku `© OpenStreetMap`; brak ikony informacyjnej |
| [#57](https://github.com/MichalMatu/photomap/pull/57) | Jeden `PhotoDetailModal` dla wachlarza, zdjęcia na mapie i zdjęcia w szufladzie; odpinanie tylko gestem przeciągania |
| [#58](https://github.com/MichalMatu/photomap/pull/58), [#59](https://github.com/MichalMatu/photomap/pull/59) | Ukryta pusta szuflada, pasek samych miniaturek, zwijanie po dotknięciu poza nią; większe miniatury 54 × 40 px i bezramkowy rozwinięty widok |
| [#60](https://github.com/MichalMatu/photomap/pull/60) | Rozdzielenie selekcji pinezek od gęstości i kolizji miniaturek; brak masowego preloadu galerii w trybie pinezek |
| [#61](https://github.com/MichalMatu/photomap/pull/61) | Poprawka znaleziona przez reaudyt: pinezki obejmują również miejsca bez covera/preview; niezależny test E2E; synchronizacja kontraktów w dokumentacji i `AGENTS.md` |

Produktowo `Miniatury` pozostają widokiem domyślnym. `Pinezki` są alternatywą pokazującą wszystkie **opublikowane i przefiltrowane** miejsca w aktualnym viewportcie, nie całą bazę równocześnie na ekranie. Kategorie i warstwy nadal filtrują oba tryby.

## Reaudyt kontraktu kodu

1. **Źródło danych / filtry:** `PublicMapPage.tsx` pobiera lekki `/api/places/map` i stosuje kategorie oraz warstwy. Tryb `photos` wymaga wizualnego preview; tryb `pins` już go **nie wymaga**. To ostatnie stanowiło realny błąd ujawniony przez nowy test przeglądarkowy: początkowo 39/40 pinezek, ponieważ jedno miejsce nie miało zdjęcia.
2. **Selekcja:** `mapMarkerSelection.ts` zwraca w trybie `pins` wszystkie punkty przepuszczone przez `filterMapMarkersByViewport`, bez limitowania gęstością lub usuwania kolidujących kandydatów. W trybie `photos` zachowana jest dotychczasowa selekcja gęstości, rankingu i kolizji.
3. **Render i preload:** `useMapMarkerLayout.ts` nie wylicza offsetów kolizji dla pinezek; `PlaceMarker.tsx` rysuje pinezkę także przy braku zdjęć; `PlaceLayer.tsx` nie wykonuje preloadu wszystkich galerii tylko dlatego, że wybrano pinezki. Pełna galeria miejsca pozostaje dostępna po interakcji.
4. **Przypięte media:** `PinnedMediaBoard`, `PinnedMediaDrawer` i `PinnedMediaCard` zachowują drag/drop, rozpoznają kliknięcie jako otwarcie wspólnego modalu, przechowują stan przypięcia i nie zasłaniają bez potrzeby mapy.
5. **Interfejs i dostępność:** testy obejmują menu swipe, układ szuflady, zanik i przywracanie ikon, atrybucję OSM i zachowanie `PhotoDetailModal`. Kontrolki mają etykiety dostępności, a animacje respektują `prefers-reduced-motion`.
6. **Zakres backendu:** PR #61 nie zmienia kodu backendu, API ani schematu danych. Pierwszy render korzysta z lekkiego publicznego kontraktu; nie wprowadzono migracji bazy.

## Weryfikacja na Mac Local Agent

Reaudyt wykonano na **dokładnym release candidate**, w izolowanych worktree, bez GitHub Actions, Codex i ChatGPT Work.

| Kontrola | Wynik |
| --- | --- |
| `npm run lint` (TypeScript + ESLint) | **PASS** |
| `VITE_API_BASE_URL= npm run build` | **PASS**; źródłowy build i produkcyjny build release ukończone |
| Pełne `npm test` (Vitest) | **366/366 PASS**, 101 plików |
| Dotychczasowe testy E2E mapy: menu, zoom MacBook, galeria, pinowanie, persistence, OSM | **16/16 PASS** |
| Nowe, niezależne E2E: wszystkie 40 pinezek z punktem bez covera; ograniczona liczba miniaturek na tych samych danych | **2/2 PASS** |
| Dodatkowy ponowny przebieg istniejącego `map-settings.spec.ts` | **3/3 PASS** |
| `git diff --check`, Prettier nowego testu, ESLint, typecheck E2E | **PASS** |

Łącznie **18/18 scenariuszy E2E zakresu** zaliczonych w przebiegach po poprawce (16 istniejących + 2 nowe). Testy z izolowaną symulacją mapy nie zastępują ręcznych pomiarów rzeczywistego telefonu ani pełnego testu obciążeniowego tysięcy markerów; takich wyników nie deklarujemy.

## Produkcja — fakty potwierdzone po deployu

| Kontrola | Wynik |
| --- | --- |
| Pi repo `main`, SHA `85a15f8` | **PASS** |
| Wymiana `index.html.next` → `index.html`, SHA256 Mac = Pi | **PASS** |
| `http://127.0.0.1:8000/` | HTTP **200** |
| `/health` i `/api/places/map` | HTTP **200**; map API około **3,99 s** w kontroli wdrożenia |
| Publiczne `https://photomap.pl/`, nowy JS, publiczne `/health` | **PASS**, JS i health HTTP **200** |
| `photomap.service`, `cloudflared.service` | Obie usługi aktywne; backend PID niezmieniony |
| RAM dostępny / swap wolny po deployu | Około **121 MB / 177 MB** |
| Nowe OOM w sprawdzonym oknie dziennika | **Nie wykryto** |
| Repozytorium produkcyjne | Czysty worktree |

Nie budowano frontendu na Pi ani nie restartowano Python/FastAPI. Publiczny wynik testowano także przez tunel, a nie tylko na localhost.

### Backup i odtworzenie

Backup release'u: `/home/michal/src/PhotoMaps/.dev/deploy/2026-11-01-ui-pins-closeout-85a15f8/`.

Zawiera: `dist-before/`, `app-before.db` (snapshot SQLite około 19 MB), `source-before.sha` i `backend-pid-before`. Poprzedni release produktu to `b7015955d639ddbf9583e74629fb3cfdbdec4fde`.

Dla awaryjnego powrotu **tylko interfejsu** (bez rollbacku DB, bo nie było migracji) odtwórz backup indeksu atomowo:

```bash
cd /home/michal/src/PhotoMaps
cp -p .dev/deploy/2026-11-01-ui-pins-closeout-85a15f8/dist-before/index.html frontend/dist/index.html.rollback
mv -f frontend/dist/index.html.rollback frontend/dist/index.html
```

Poprzednie zahashowane assety pozostawiono w `frontend/dist/assets`. Nie używaj `git reset --hard`, nie nadpisuj danych produkcyjnych ani nie restartuj serwera tylko z powodu zmiany statycznego UI. Jeśli wymagany jest rollback kodu, wykonaj świadomy `git revert` i osobny sprawdzony deploy.

## Świadome ograniczenia i następny etap

- Przy identycznych lub bardzo bliskich współrzędnych pinezki mogą się nakładać: to świadomy skutek pokazywania wszystkich miejsc bez ukrywania ich przez ranking. Nie wdrażano klastrowania/rozsuwania pinezek bez kolejnej decyzji produktowej.
- Pi Zero 2W pozostaje urządzeniem o małym budżecie pamięci. Nie rozbudowuj preloadu galerii w trybie pinezek; w przyszłych zmianach zachowaj kontrolę RAM, swapu, OOM i czasu `/api/places/map`.
- **Nowy ekran/animacja ładowania zamiast górnego komunikatu** to potencjalny, **osobny** etap UX. Nie był elementem tego reaudytu; nie rozpoczynaj go automatycznie.
- W tym etapie nie modyfikowano danych redakcyjnych, admina, API, schematu SQLite ani hardware poza odczytowymi kontrolami produkcji.

## Wejście do następnego czatu

1. Przeczytaj bieżące `AGENTS.md`, `frontend/src/components/map/AGENTS.md`, `README.md`, `docs/product-direction.md`, `docs/deploy-pi-zero2w.md` oraz ten checkpoint.
2. Pobierz **aktualny** `main` HEAD i status Local Agenta z `agent-control`, bez zakładania, że SHA release'u pozostał HEAD po aktualizacji dokumentacji.
3. Jeśli zmieniasz kod, używaj GitHub Connector + Mac Local Agent, w izolowanym worktree. Testuj Vitest, TypeScript, E2E Playwright. Nie używaj GitHub Actions, Codex ani ChatGPT Work.
4. Jeśli wdrażasz UI, stosuj atomowy `frontend/dist` deploy z backupem i kontrolą Pi Zero; nie restartuj backendu bez potrzeby.
5. Ten etap traktuj jako **zamknięty**. Wróć do tych funkcji tylko przy nowej, odtwarzalnej regresji lub świadomym nowym wymaganiu.
