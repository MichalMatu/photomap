# PhotoMap — finalny checkpoint płynnego zoomu gładzika (31.10.2026)

## Zakres i przyczyna
- Użytkownik zgłosił skokowy zoom na MacBooku; telefon działał poprawnie.
- Pierwotny kontroler wymuszał krok `0,25`, próg ruchu `48 px` i opóźnienie `60 ms`.
- Pierwszy prototyp zmieniał zoom przez `map.setZoomAround()` w każdej klatce. To emitowało seryjne `zoomend`/`moveend` i uruchamiało kosztowne przeliczanie widocznych miniaturek. Użytkownik potwierdził regresję: częstsze zatrzymywanie oddalania.
- Naprawa wykorzystuje ciągłą aktualizację projekcji Leaflet podczas gestu oraz pojedyncze końcowe `zoomend` po jego zakończeniu. Obejmuje szczypanie i delikatne przewijanie gładzikiem, zachowuje standardowe kółko myszy i blokadę mapy przy galerii. Obsługa dotyku telefonu nie została zmieniona.
- Pliki: `frontend/src/components/map/{MapTrackpadZoom.tsx,trackpadZoom.ts,trackpadZoom.test.ts}`, `frontend/e2e/visual/map-trackpad-zoom.spec.ts`.

## Historia i publikacja kodu
- Bazowy GitHub `main`: `858fccde063d13e2a487d342a63200e3e5bfe693`.
- Prototyp: `91334a76`, formatowanie: `6d089089`, ostateczna korekta regresji: `524c40a218ad59d985a133efc542e99f51f5912a`.
- PR [#49](https://github.com/MichalMatu/photomap/pull/49) scalony do `main`: `fbeefb174c309a252e82b47b20dbe3bf63217485`.
- Robocza `fix/macbook-trackpad-zoom` służyła tylko izolowanym testom na Macu. Nie rozwijać starego prototypu z `6d08908`.

## Weryfikacja
- Mac Local Agent: Prettier dla zmienionych plików PASS, ESLint/typecheck PASS, Vite build PASS, `165/165` testów jednostkowych mapy PASS.
- Playwright/Chromium: `4/4` PASS (powrót do początkowej skali, długa seria oddalania/przybliżania, jedno końcowe `zoomend`, kółko myszy).
- Gęsta mapa: 120 kontrolowanych miejsc, 11 renderowanych miniaturek, `13 → 11,4 → 13`, PASS.
- Użytkownik potwierdził na fizycznym MacBooku, że zoom jest płynny, także po poprawce regresji.
- Automatyczne testy WebKit/Safari nie zostały wykonane (silnik WebKit Playwright nie był zainstalowany na Macu).
- Pełny `npm run format:check` wskazywał 8 *wcześniej istniejących*, niezwiązanych plików; nie zmieniano ich w tym sprincie. Formatowanie czterech zmienionych plików PASS. Nie oznaczać całego format-check jako PASS.

## Produkcja: Raspberry Pi Zero 2W
- Kanoniczna procedura: `docs/deploy-pi-zero2w.md`, przez Mac Local Agent i SSH, bez GitHub Actions/Codex/Work.
- Host: `michal@192.168.0.23`; repo: `/home/michal/src/PhotoMaps`.
- Przed deployem: Pi `main` = `ac898d465bfca86d4259cdf76abea1dadb2e1f4c`, czysty; runtime zdrowy na `127.0.0.1:8000`, tunel systemowy działał.
- Backend SQLite: spójny backup online, `PRAGMA integrity_check=ok`. Backup plus poprzedni `frontend/dist`: `.dev/deploy/2026-10-31-trackpad-zoom-pre/`. **Zachować do odtworzenia; nie publikować w Git i nie usuwać w ramach sprzątania.**
- `frontend/dist` zbudowano na Macu dla dokładnie `fbeefb174...` przy `VITE_API_BASE_URL=`; hash `index.html`: `d654499fcacc770517afd462bd0c3902147033e45a999655f4c8b88ab26e10cf`.
- Na Pi wykonano wyłącznie Git fast-forward, skopiowano zgodny build, usunięto stare zahashowane artefakty z `frontend/dist`, uruchomiono `PHOTOMAP_SKIP_FRONTEND_BUILD=1 make server-restart`. `cloudflared` nie restartowano.
- Po wdrożeniu: `main=fbeefb174c309a252e82b47b20dbe3bf63217485`, status Git czysty, `/health=200`, strona = 200, `/api/places/map=200`; `195` miejsc, `1140` zdjęć, `0` pamiątek, `integrity_check=ok`.
- PID aplikacji zmienił się z `209472` na `2260274`, tunel systemowy pozostał na PID `222848`.
- Historyczny URL `origin` na Pi (`MichalMatu/PhotoMaps.git`) skorygowano do `https://github.com/MichalMatu/photomap.git`.

## Granice sprzątania i dalsze prace
- Archiwalne checkpointy, dzienniki audytowe i backup produkcyjny zachować; żadne produkcyjne media ani rekordy nie były modyfikowane lub usuwane.
- Usuwać wyłącznie tymczasowy testowy worktree/branch po finalnym sprawdzeniu i po zsynchronizowaniu dokumentacji. Nie usuwać `agent-control` ani jego protokołów/rezultatów.
- Na początku kolejnej pracy weryfikować rzeczywisty `main`, HEAD Pi, health i dokumentację, a nie zakładać SHA wyłącznie z tego checkpointu.
