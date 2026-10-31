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
5. Restartuj aplikację przez `make server-restart`.
6. Zakończ dopiero po `/health` i potwierdzeniu SHA.

## Flow przez Local Agent

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
  "cd /home/michal/src/PhotoMaps && PHOTOMAP_SKIP_FRONTEND_BUILD=1 make server-restart && curl -fsS --max-time 5 http://127.0.0.1:8000/health >/dev/null && test \"\$(git rev-parse HEAD)\" = \"$TARGET_SHA\" && make server-status"
```

`PHOTOMAP_SKIP_FRONTEND_BUILD=1` jest celowe: gotowy build jest już skopiowany z Maca.

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
