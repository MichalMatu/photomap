# Deploy na Raspberry Pi Zero 2W

Kanoniczny flow aktualizacji PhotoMap na runtime w sieci lokalnej.

## Target

- host: `zero2` / `192.168.0.23`
- SSH: `michal@192.168.0.23`
- repo: `/home/michal/src/PhotoMaps`
- branch: `main`
- runtime: `http://127.0.0.1:8000`
- frontend budujemy na Macu, nie na Pi Zero 2W

Systemowy `cloudflared` działa niezależnie od aplikacji. Zwykły deploy nie restartuje tunelu.

## Kontrakt deployu

1. Wdrażaj świadomie wybrany SHA z `main`.
2. Worktree na Pi musi być czysty; nie rób automatycznego stash/reset.
3. Aktualizacja repo na Pi jest tylko fast-forward.
4. `frontend/dist` buduj dla tego samego SHA na Macu i kopiuj przez `rsync`.
5. Przy zmianach **wyłącznie frontendu** nie restartuj backendu ani `cloudflared`: podmieniaj tylko statyczne assety i przełączaj `index.html` atomowo. Restart `photomap.service` jest potrzebny dopiero przy zmianie kodu lub konfiguracji backendu; nigdy nie uruchamiaj procesu ręcznie w tle.
6. Zakończ dopiero po `/health`, `/api/places/map`, potwierdzeniu SHA, hasha `index.html` oraz publicznych assetów. Nie usuwaj starych plików assetów przed potwierdzoną aktywacją nowego indeksu.

## Frontend-only: atomowy deploy na Pi Zero 2W

Dla zmian mapy React/CSS (np. pinezki, szuflada, miniatury) stosuj bezpieczniejszy flow niż restart całej aplikacji:

1. Po testach użyj **konkretnego SHA z `main`**, buduj `frontend/dist` na Macu w czystym worktree, z `VITE_API_BASE_URL=`; zapisz SHA256 `dist/index.html` i ścieżkę zahashowanego JS.
2. Na Pi sprawdź czystość repo, aktualny commit, `photomap.service`, `cloudflared.service`, PID backendu, wolny RAM i swap oraz `/health`. Przerwij, jeśli host jest w stanie niebezpiecznym.
3. Zrób kopię `frontend/dist` i spójny snapshot SQLite przez `sqlite3.Connection.backup()` w `.dev/deploy/<release>/`; nie modyfikuj produkcyjnej bazy.
4. Zaktualizuj repo Pi przez `git fetch origin main` i `git merge --ff-only origin/main`, bez resetowania, stasha czy nowych migracji.
5. Z Maca: `rsync -az --exclude=index.html frontend/dist/ <pi>:<repo>/frontend/dist/`, a nowy indeks skopiuj jako `frontend/dist/index.html.next`; **nie** usuwaj przy tym poprzednich zahashowanych assetów.
6. Zweryfikuj plik `.next`, a następnie `mv frontend/dist/index.html.next frontend/dist/index.html` na Pi. Zachowaj indeks poprzedniego buildu w backupie i przy błędzie przywróć go atomowo.
7. Porównaj SHA256 indexu Mac↔Pi, sprawdź `HTTP 200` na `/`, `/health`, `/api/places/map`, publicznym HTML oraz pliku JS z nowego indeksu, stałość PID backendu, stan tunelu, wolną pamięć i brak nowych OOM. Dopiero wtedy oznacz deploy jako `PASS`.

Frontend-only deploy **nie wymaga** restartu `photomap.service`, `cloudflared` ani budowania na Pi. Wzorcowy release: [checkpoint UI + pinezki 01.11.2026](checkpoints/2026-11-01-public-map-ui-pins-closeout.md).

## Flow przez Local Agent — gdy zmieniono backend

```bash
set -eu
REPO=/Users/michal/agent-workspace/repos/photomap/work
SSH_KEY=/Users/michal/.ssh/id_ed25519
PI=michal@192.168.0.23
PI_REPO=/home/michal/src/PhotoMaps

cd "$REPO"
git fetch origin main
git switch -C agent-work origin/main
TARGET_SHA="$(git rev-parse HEAD)"

cd frontend
VITE_API_BASE_URL= npm run build
cd ..
test -f frontend/dist/index.html

ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=8 "$PI" \
  'cd /home/michal/src/PhotoMaps && test -z "$(git status --porcelain)" && git fetch origin main && git switch main && git merge --ff-only origin/main'

RSYNC_RSH="ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=8" \
  rsync -az frontend/dist/ "$PI:$PI_REPO/frontend/dist/"

ssh -i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=8 "$PI" \
  "cd /home/michal/src/PhotoMaps && sudo -n systemctl restart photomap.service && for n in \$(seq 1 60); do curl -fsS --max-time 3 http://127.0.0.1:8000/health >/dev/null 2>&1 && break; sleep 1; done && curl -fsS --max-time 5 http://127.0.0.1:8000/health >/dev/null && test \"\$(git rev-parse HEAD)\" = \"$TARGET_SHA\" && systemctl is-active --quiet photomap.service && make server-status"
```

Serwis systemd uruchamia bezpośrednio `server.py`; frontend musi być zbudowany i skopiowany z Maca **przed** restartem usługi.

`photomap.service` ma `Restart=on-failure` i powinien pozostać aktywny po wdrożeniu.
Ręczne `make server-start` uruchamia proces poza nadzorem systemd; po awarii OOM
nie zostanie on automatycznie odtworzony. Jeżeli start systemd trwa dłużej na Pi Zero,
pozwól procesowi dokończyć migracje i inicjalizację (do 60 s), zanim uznasz go za
niesprawny. Po starcie sprawdź `systemctl is-active photomap.service`, `MainPID`
i `Restart`. Do uruchomienia systemowego `photomap.service` nie jest wymagany
restart `cloudflared`.

## Kontrola i logi

```bash
ssh -i /Users/michal/.ssh/id_ed25519 michal@192.168.0.23 \
  'cd /home/michal/src/PhotoMaps && git status --short --branch && make server-status && make tunnel-status'

ssh -i /Users/michal/.ssh/id_ed25519 michal@192.168.0.23 \
  'cd /home/michal/src/PhotoMaps && make server-logs'
```

Oczekiwany stan: `main`, właściwy SHA, czysty worktree, port 8000, `PhotoMap runtime health: OK` i działający systemowy `cloudflared`.

## Weryfikacja i porządek po wdrożeniu

Przed aktualizacją kodu zachowaj spójny snapshot SQLite oraz kopię poprzedniego `frontend/dist` poza katalogiem śledzonym przez Git, np. pod `.dev/deploy/<release>/`. Nie uruchamiaj narzędzia backupu z automatycznym prune, jeżeli mogłoby usunąć starszy potrzebny punkt odzyskiwania. Po aktualizacji sprawdź `PRAGMA integrity_check`, publiczny `/api/places/map`, `/health`, frontend HTTP 200 i kontrolną liczbę rekordów z preflightu.

Wysyłaj `frontend/dist` ze znanego, dokładnego SHA; po bezpiecznym zachowaniu starego builda można usunąć osierocone zahashowane pliki w docelowym `dist` przez `rsync --delete`, ale nie ingeruj w `backend/storage` ani backupy. Systemowy tunel Cloudflare powinien zachować ten sam proces. Nie usuwaj logów produkcyjnych bez retencji/analizy: sprzątanie zwykłego deployu dotyczy tylko tymczasowych plików staging i starego worktree kodu.

Wzorcowy przebieg wdrożenia zoomu z 31.10.2026 opisuje [checkpoint](checkpoints/2026-10-31-macbook-trackpad-zoom-deploy.md).
