# Dev

Ten dokument trzyma codzienny workflow developerski. Ownership kodu jest w [`docs/code-structure.md`](code-structure.md), kierunek produktu w [`docs/product-direction.md`](product-direction.md), a operacje na danych w [`docs/ops.md`](ops.md).

## Lokalny start

Backend: `http://127.0.0.1:8000`, frontend Vite: `http://127.0.0.1:5174`.

```bash
make start
make status
make logs
make restart
make stop
```

## Jakość

```bash
make check
make api-flow
make api-contract
make smoke
make e2e
make perf-smoke
make quality
```

E2E używa izolowanej bazy i storage w `.dev/e2e`. Hooki projektu są w `.pre-commit-config.yaml`.

## Git

`main` jest stabilnym kanałem gotowym do wdrożenia. Zwykłą pracę prowadź na krótkim branchu.

```bash
git switch main
git pull --ff-only
git switch -c work/nazwa-zmiany
# zmiany + testy
git add .
git commit -m "Opis gotowego etapu"
git push -u origin work/nazwa-zmiany
```

Nie buduj kolejnego etapu na starym parent SHA.

## Kontrakty kodu

- backendowe schematy i serializery są źródłem prawdy dla API;
- frontendowe typy i `frontend/src/api` muszą odpowiadać backendowi;
- map preview pozostaje lekki, pełne dane medium są dociągane na żądanie;
- publiczne i adminowe DTO są rozdzielone, gdy mają inną widoczność danych.

Aktualny kształt endpointów sprawdzaj w schematach, testach kontraktowych i OpenAPI, zamiast powielać listy pól w dokumentacji.

## Dane lokalne

```bash
python3 scripts/diagnose_local_data.py
./scripts/backup_local_data.sh --apply
```

Szczegóły: [`docs/ops.md`](ops.md).

## Zoom gładzika na MacBooku

Zoom na desktopie obsługuje gesty ciągłe bez wielokrotnego kończenia aktualizacji Leaflet i przeliczania miniaturek w każdej klatce. Testy regresji sprawdzają płynne przybliżanie, wielokrotne oddalanie, powrót do skali, blokady interakcji i niezależne zachowanie kółka myszy. Mobile touch zoom pozostaje natywny.

```bash
cd frontend
npm run test -- src/components/map/trackpadZoom.test.ts
npm run build
# Playwright przez izolowany wrapper z katalogu głównego:
cd ..
E2E_CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./scripts/quality/e2e.sh e2e/visual/map-trackpad-zoom.spec.ts --workers=1
```

Ręczny test na MacBooku jest obowiązkowym uzupełnieniem emulacji kółka/gestów w Chromium. Wyniki i warunki wdrożenia: [checkpoint 31.10.2026](checkpoints/2026-10-31-macbook-trackpad-zoom-deploy.md).

## Publiczny runtime

`server.py` serwuje FastAPI, `/media` i gotowy `frontend/dist` na `127.0.0.1:8000`.

```bash
make server-start
make server-status
make server-logs
make server-restart
make server-stop

make tunnel-status
make autostart-status
```

Normalny deploy aplikacji nie restartuje tunelu. Aktualny flow dla Raspberry Pi Zero 2W jest w [`docs/deploy-pi-zero2w.md`](deploy-pi-zero2w.md).
