# PhotoMap — testy odporności i odświeżenie animacji ładowania (01.11.2026)

## Zakres

Zmiany na osobnej gałęzi, zaczętej od `main` SHA `373d45dbaa7fa18ca7d37f32c75b1808f17bbcd0` (PR #64). Nie zmieniają API, backendu, danych ani strategii wdrożenia.

## Uzupełnione scenariusze

- **Awaria publicznego API mapy (HTTP 503):** nakładka musi zniknąć, po czym pojawia się istniejący alert błędu; nie renderujemy mapy z fałszywymi danymi.
- **Brak odpowiedzi serwera kafelków:** requesty Leaflet pozostają nierozstrzygnięte, a mimo tego pięciosekundowy fallback pozwala zobaczyć mapę i jej miniatury. Test uwalnia opóźnione requesty w `finally`.

Testy: `frontend/e2e/visual/map-loading-failures.spec.ts`. Pierwsza izolowana walidacja Mac Local Agent obu scenariuszy oraz dotychczasowych animacji: **7/7 Playwright PASS**, ESLint, TypeScript i Prettier PASS. Wynik: `.agent/results/photomap-loader-failure-tests-20261101-v1.json` na `agent-control`.

## Dodatkowe dopracowanie wizualne

- Delikatniej zestrojona paleta nieba, horyzontu, gór, zieleni i wody, wyłącznie w tokenach designu.
- Trzy odległe, wektorowe chmury i kilka drobnych ptaków na pejzażu; bez sieciowych zdjęć, bitmap i ciężkich filtrów.
- Róża kompasu na papierowej mapie, kępy drzew, dwa małe szkice budynków, dodatkowe szczegóły perspektywy.
- Więcej głębi w trzech ramkach zdjęć (światło, delikatne kontury i mostek).
- Wejście chmur, ptaków i kompasu jest **jednorazowe**; nic nie znika okresowo przy powolnym API. `prefers-reduced-motion` wyłącza wszystkie dodane animacje.
- Bez zmian minimum 950 ms, fade 560 ms, wykrywania kafelków, fallback 5 s, samouczka i trybu pinezek.

## Testy końcowe i produkcja

Po zmianach wizualnych uruchom ponownie formatowanie, typecheck, ESLint, build, pełny Vitest oraz Playwright: awarie API/kafelków, mobile/desktop, reduced-motion, pinezki, atrybucję OSM i szufladę. Zbadaj także czy dodatkowe elementy nie są obcięte na małym ekranie.

**Brak wdrożenia produkcyjnego:** statyczny frontend z tej gałęzi wymaga oddzielnego zatwierdzonego deployu z backupem i kontrolą hosta zgodnie z `docs/deploy-pi-zero2w.md`. Nie restartuj backendu bez potrzeby.
