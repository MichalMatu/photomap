# PhotoMap — podgląd discovery drawer na Samsungu Termux (02.11.2026)

## Wynik: Samsung QA PASS, gotowe do ręcznego podglądu; NIE produkcja

- Źródło/testowany kod: `feat/discovery-media-drawer-20261102` @ `190e60be33a04767d0513dc112e91dd82908e684`.
- Urządzenie: Samsung SM-S906B (S22+), Android 16, podłączony USB ADB do Maca.
- Instancja: prywatny Termux `$HOME/Projects/PhotoMap`, Debian 12 ARM64 PRoot `photomap-dev`, port tylko `127.0.0.1:8010`.
- Adres podglądu **na telefonie**: `http://127.0.0.1:8010/`; uruchomiona jako osobna usługa runit `photomap-dev`.
- Nie uruchamiano tunelu ani nie wdrażano niczego na Raspberry Pi; `main` pozostał nietknięty. IleStoi na telefonie działa niezależnie.

## Testy natywne Android / Termux

1. Preflight: czysty checkout `main=e98f575`, 195 miejsc, 1082 zdjęcia, 0 pamiątek, SQLite `quick_check=ok`, ponad 159 GB wolnego miejsca, dostępny PRoot, node_modules i frontend build.
2. Bezpieczny `git fetch` i odpięcie HEAD do dokładnego commita roboczego; nie zmieniono `main` ani zachowanej kopii danych.
3. `bash scripts/termux-dev.sh frontend-build`: typecheck + Vite build **PASS** (2238 modułów); nowy `discoveryRecommendations.test.ts`: **2/2 PASS**.
4. Runit `photomap-dev` podłączony dopiero po buildzie, serwer osiągnął `/health=200` po 9 sekundach.
5. `GET /`, `/health`, `/api/places/map`, `/openapi.json`: **200**. Publiczny kontrakt mapy: 195 miejsc i 195 coverów, rzeczywista miniatura zdjęcia `HTTP 200` (193836 bajtów). IleStoi `/api/health/ready=200` przed i po.
6. Prawdziwy Chrome na ekranie Samsunga 1080×2340: widoczna mapa i rozwinięta dolna karuzela z realnymi fotografiami (m.in. Rynek Wrocław, Ostrów Tumski).
7. Przez USB ADB wykonano **fizyczny test interakcji**: tap miniatury Ostrowa Tumskiego — mapa pokazuje istniejącą galerię/wachlarz wielu zdjęć; przesunięcie poziome po szufladzie — pojawiają się kolejne miejsca, m.in. Zoo Wrocław i Afrykarium oraz Hala Stulecia. Zrzuty ekranu obu stanów obejrzano, bez widocznej kolizji panelu z mapą.

## Evidence / durable results

- Android Local Agent: `MichalMatu/local-agent` / `agent-control`, host `android-termux-10520`, installation `6be16f1d-194b-4f07-b377-3d4bb218fcd7`:
  - `photomap-android-discovery-preview-preflight-20261102-v1` — PASS;
  - `photomap-android-discovery-qa-source-build-20261102-v2` — PASS;
  - `photomap-android-discovery-preview-start-smoke-20261102-v3` — PASS.
- Mac PhotoMap Local Agent `agent-control/.agent/results/`:
  - `photomap-android-discovery-native-screen-20261102-v5.json` — realny Chrome screenshot;
  - `photomap-android-discovery-native-tap-20261102-v7.json` — tap/fan galerii PASS;
  - `photomap-android-discovery-native-swipe-20261102-v8.json` — poziome przesuwanie karuzeli PASS.
- Nieudane `native-tap-v6` miało `task_budget_exhausted`, **not_started=true**; bez skutków. Późniejsza, nowa próba `v7` przebiegła poprawnie. Bez ponownego uruchamiania starszego zadania.
- Screenshots PNG/JPG zachowano tymczasowo w `/tmp/photomap-termux-*` na Macu; nie stanowią commita.
- Poprzedni sprint software QA: [checkpoint karuzeli](2026-11-02-discovery-media-drawer-sprint.md), Mac Vitest 368/368, Playwright 3/3, lint i build PASS.

## Pozostała akceptacja

- Jest to test na rzeczywistym urządzeniu i rzeczywistych zatwierdzonych zdjęciach, ale tap i swipe były wysłane przez USB ADB; użytkownik może jeszcze sam ocenić płynność palcem.
- Windows: fizyczne przeciągnięcie przypiętego zdjęcia poza szufladę myszą **niezweryfikowane**.
- **Nie promować na `main` ani nie wdrażać na Pi bez osobnej decyzji.** Instancja Termux pozostaje uruchomiona do przeglądu; nie wystawiać jej publicznie.
