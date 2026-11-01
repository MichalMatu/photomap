# PhotoMap — doszlifowanie animacji ładowania (01.11.2026)

## Założenie

Rozwój wizualny pełnoekranowego ekranu ładowania z PR #63, bez wymiany technologii SVG/CSS i bez zmian backendu. Zachowana ilustracja PhotoMap z krajobrazem, mapą, pinezkami, miniaturami i płynnym przejściem do działającej mapy.

## Wprowadzone poprawki

- Tło: spokojniejsza, cieplejsza paleta błękitu, kremu, oliwki, sosnowej zieleni i koralu; dodatkowe grzbiety, zaznaczone warstwy gór i roślinność, bez drogich bitmap.
- Mapa: subtelna tekstura terenu, kontury, place zieleni, siatka ulic, drobne budynki, mostki i małe podpisy. Grafika jest przycięta do konturu papierowej mapy.
- Zdjęcia: głębsze małe pejzaże, światło i cienie. Zachowano 3 karty, bez wzrostu liczby zasobów sieciowych.
- Ruch: usunięto pętlę `4.4s infinite`, która odtwarzała znikanie pinezek, trasy i zdjęć. Rozkładanie, rysowanie i wejście zdjęć to jednorazowa sekwencja z `animation-fill-mode: both`; stan końcowy pozostaje widoczny nawet przy długiej odpowiedzi API.
- Pierwszy kadr pojawia się szybko, ale przy prawidłowym ładowaniu zachowane jest minimum 950 ms, by krótką animację dało się dostrzec. Po gotowości istniejący overlay zanika w 560 ms.
- `prefers-reduced-motion: reduce`: SVG jest statyczne, a minimum prezentacji omijane, aby nie wydłużać ładowania użytkownikowi preferującemu brak animacji.
- Kontrakt API / wykrywanie gotowości Leaflet, fallback, samouczek i ekrany błędów bez zmian.

## Testy wykonane na Mac Local Agent

- TypeScript/ESLint `npm run lint` — PASS.
- Vite `npm run build` — PASS.
- Vitest `npm test`: **366/366 PASS**.
- Playwright: **9/9 PASS** — w tym 2 nowe testy zachowania sekwencji w powolnym ładowaniu i trybu reduced motion, poprzednie testy mobile/desktop, pinezek, szuflady i OSM.
- Prettier i `git diff --check` — PASS.
- Zweryfikowano zgodność zawartości kodu w gałęzi GitHub Connector z dokładnie przetestowanym commitem roboczym `ae583828588d5224ffa04e8835fb05a25588bff9` (`git diff --exit-code` — PASS). Publikacja przez GitHub Connector była konieczna, ponieważ bezpośredni push Maca zwrócił błąd serwera GitHub.

## Wdrożenie

Zmiany na gałęzi `refine/map-loading-artwork-motion-20261101` są gotowe do oceny wizualnej. **Nie oznaczaj ich jako produkcyjnych**, dopóki nie zostanie wykonany osobny, zweryfikowany frontend-only deploy na Raspberry Pi. Aktualny deploy bazowy: `a87d08c4f59cb4f7988e4e68b407072f25876b4e` (PR #63).

W razie wdrożenia użyj `docs/deploy-pi-zero2w.md`: dokładny SHA `main`, build na Macu, backup bazy i `frontend/dist`, staging statycznych assetów, atomowy `index.html`, bez restartu backendu, sprawdzenie publicznego URL i zasobów Pi.
