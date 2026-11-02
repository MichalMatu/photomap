# PhotoMap — discovery media drawer: sprint i weryfikacja (02.11.2026)

## Stan

- Branch roboczy: `feat/discovery-media-drawer-20261102`.
- Zweryfikowany commit kodu: `d4714c4889de04085d1325f34d60179fa415caf0`.
- `main` i produkcyjne Raspberry Pi: bez wdrożenia i bez zmian w tym sprincie.
- Nie uruchamiano GitHub Actions ani Codex.

## Zachowanie

- Jedna dolna szuflada zamiast dodatkowej, niezależnej karuzeli.
- Domyślnie dostępna również bez przypiętych zdjęć; zawiera do 12 rekomendacji okładek zdjęć z aktualnego obszaru mapy, uwzględniając aktywne filtry i istniejący ranking miejsc.
- Zdjęcia przypięte i schowane do szuflady wyświetlają się przed rekomendacjami. Duplikaty dokładnie tego samego medium są odfiltrowywane.
- Kliknięcie rekomendacji otwiera istniejącą galerię/wachlarz wybranego miejsca. Nie ma nowego endpointu ani zewnętrznej biblioteki karuzeli.
- Przeciąganie przypiętej miniatury poza szufladę korzysta z `setPointerCapture`, anulowania natywnego `dragstart` oraz bezpiecznego `pointercancel`.
- Powiększona szuflada: bazowo 340 px desktop i maksymalnie 300 px mobile. Po oględzinach screenshotów zwiększono również wysokość zdjęć (desktop `min(260px, 32dvh)`, mobile `min(210px, 25dvh)`) i adaptacyjną szerokość kart mobilnych.
- Zwinięta szuflada pokazuje do trzech miniaturek: najpierw przypięte, potem polecane.

## Testy i screenshoty

- Mac Local Agent — kontrola TypeScript i lint: **PASS**, build Vite: **PASS** (commit `d4714c4`).
- Vitest: **368/368 PASS** (commit `77d9622`; późniejsza zmiana dotyczyła wyłącznie wysokości zdjęć w CSS).
- Playwright Chromium na Macu: **3/3 PASS**, ponownie na commicie `d4714c4`:
  - desktop: rekomendacje i otwarcie istniejącej galerii;
  - mobile: przypięcie, umieszczenie w szufladzie, kolejność elementów, zwijanie, odświeżenie, przeciągnięcie z powrotem na mapę;
  - trwałość przypiętego zdjęcia nieobecnego w lekkim preview mapy.
- Screenshoty Playwright: 1280 × 800 (desktop: szuflada i galeria miejsca) oraz 390 × 844 (mobile: przed przypięciem do szuflady, szuflada rozwinięta i zwinięta, po wyciągnięciu zdjęcia).
- Pierwsza próba screenshotu desktop wykonała go podczas animacji ładowania; test poprawiono tak, aby oczekiwał zniknięcia `map-loading-screen`. Następnie zdjęcia zweryfikowano ponownie.
- Wizualny rezultat na mockowanych danych: brak widocznej kolizji szuflady z mapą, przypięte medium na początku, większa powierzchnia wypełniona fotografiami. Mockowane zdjęcia SVG potwierdzają layout, **nie rzeczywistą atrakcyjność redakcyjnych fotografii**. Przy zaledwie dwóch miejscach testowych część poziomego panelu pozostaje pusta; na danych produkcyjnych zależy to od liczby miejsc w viewportcie.

## Dowody Local Agent

- `.agent/results/photomap-discovery-drawer-sprint-e2e-20261102-v7.json` — pierwsze 3/3 E2E PASS po poprawce oczekiwania miniatur.
- `.agent/results/photomap-discovery-drawer-sprint-final-20261102-v9.json` — 368/368 Vitest PASS, lint i build PASS, 3/3 E2E PASS oraz sześć screenshotów.
- `.agent/results/photomap-discovery-drawer-desktop-polish-20261102-v10.json` — końcowy CSS desktop, lint/build PASS oraz 3/3 E2E PASS z finalnym screenshotem.
- Oryginalne PNG powstały lokalnie w izolowanym `frontend/test-results/` na Macu; nie są commitowane do kodu.

## Ograniczenie / decyzja

Automatyczny drag-out przez Playwright Chromium na Macu jest **PASS**. Fizyczne przeciąganie myszą na Windowsie pozostaje **niezweryfikowane**. Przed uznaniem naprawy błędu Windows za ostateczną należy wykonać jedno rzeczywiste przeciągnięcie poza szufladę na Windowsie. Do tego czasu nie promować brancha na `main` ani na produkcję.
