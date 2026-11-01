# PhotoMap — Samsung Termux, kopia danych Pi i zamknięcie testu (2026-11-01)

**Status: CLOSED / PASS.** Użytkownik potwierdził, że strona na Samsungu działa z rzeczywistymi danymi; następnie polecił zatrzymać serwer i usunąć kopie oraz szum roboczy. Nie jest to wdrożenie produkcyjne.

## Wynik i granice

- **Samsung S22+**: PhotoMap pozostaje w prywatnym `$HOME/Projects/PhotoMap`; osobny Debian 12 ARM64 PRoot `photomap-dev`, port testowy `127.0.0.1:8010`. **Serwer wyłączony**, rejestracja `$PREFIX/var/service/photomap-dev` w runit **usunięta** — nie startuje automatycznie. Kod i gotowy build pozostawione na potrzeby przyszłych testów.
- **Dane zachowane na Samsungu**, bez wspólnego katalogu `Download`: `.dev/termux/data/app.db`, `.dev/termux/storage/private`, `.dev/termux/storage/public`. To odizolowana, jednorazowa kopia z Raspberry Pi, nie współdzielona aktywna baza.
- **Raspberry Pi produkcyjne**: aplikacja i baza bez zmian; czasowy eksport SQLite po transferze usunięty, systemd `photomap.service` i `cloudflared.service` nadal `active`, lokalny `/health` HTTP 200.
- **IleStoi na Samsungu**: bez zmian, niezależny `127.0.0.1:8001/api/health/ready` HTTP 200 również po zatrzymaniu PhotoMap.
- **MacBook**: po walidacji usunięto całą czasową kopię `~/.cache/photomap-rsync-relay-20261101-v1` (~4 GB), zawierającą bazę, media i tymczasową konfigurację USB SSH.
- **Termux**: pusty katalog importu i pierwotna, pusta baza testowa (196 KiB) z rollbacku usunięte po weryfikacji; aktywnej importowanej bazy ani zdjęć **nie usunięto**. Znacznik `.dev/termux/pi-import-active-20261101-v1.json` pozostawiono jako lokalny dowód pochodzenia kopii.

## Potwierdzona integralność

| Kontrola | Wynik |
|---|---|
| Snapshot bazy, rozmiar | `19 574 784` bajty |
| SHA-256 bazy (Pi → Mac → Samsung) | `24814f4084ef6989e4e7966d77d9f7cf88f033cd619d8c37eb66516adf3f3ede` |
| SQLite | `PRAGMA integrity_check=ok`, `foreign_key_check` bez błędów |
| Wersja migracji | `0021_nullable_rejected_original_path` |
| Miejsca / rekordy zdjęć / pamiątki | **195 / 1082 / 0** |
| Pliki prywatne | **1098**, `4 084 122 798` bajtów |
| Pliki publiczne | **1098**, `154 437 872` bajtów |
| Pliki mediów łącznie | **2196** |
| HTTP przed wyłączeniem | `/`, `/health`, `/api/places/map`, `/openapi.json`: **200** |
| Akceptacja użytkownika | Strona w Androidzie i zdjęcia/miejsca: **PASS** |
| HTTP po wyłączeniu | PhotoMap **OFF**, IleStoi **200** |
| Autostart PhotoMap w runit | **wyrejestrowany** |

Liczba rekordów `photo` nie musi równać się liczbie plików oryginałów i miniaturek. Potwierdzono pełne liczby plików oraz sumaryczne bajty na etapach Mac i Samsung, a dla bazy pełny SHA-256; nie należy nadinterpretować tego jako osobnego per-file SHA-256 każdego obrazu.

## Testy oprogramowania wykonane wcześniej w sprincie

- Frontend: TypeScript i Vite PASS; Vitest **366/366** w 101 plikach.
- Backend: Debian ARM64 Python 3.11, `pytest -q` **344 PASS**, 2 ostrzeżenia zależności, 0 błędów.
- Migracje testowej SQLite: Alembic `upgrade head` PASS; 11 tabel; niezależne HTTP smoke PASS.
- Odporność po restarcie telefonu i wielogodzinne endurance: **nie były testowane** i nie są deklarowane jako PASS.

## Przebieg transferu i decyzje techniczne

1. Na Raspberry Pi wykonano spójną migawkę przez `sqlite3.Connection.backup()` bez zatrzymywania produkcji; oddzielny eksport pod `.dev/rsync-export-20261101-v1`.
2. `rsync` Pi → Mac poprawnie skopiował bazę i oba katalogi zdjęć: **1098 prywatnych + 1098 publicznych**. MacBook dysponował wystarczającym miejscem na jednorazową kopię.
3. Wbudowany `rsync` w Termuxie zwracał `Permission denied` nawet podczas lokalnej próby dostępu do własnego katalogu; nie był to problem własności plików. Nie zmieniano uprawnień globalnych.
4. Pierwszy strumień `tar`/SSH przez Wi-Fi urwał się (`Broken pipe`), a Wireless ADB był `offline`. Połączenie **USB ADB** do urządzenia `SM_S906B` było dostępne.
5. Przez `adb forward` do portu SSH Termuxa przesłano binarny strumień `tar` do prywatnego folderu importu. SQLite i pełne zestawienie mediów na Samsungu przeszły kontrolę; `Download` istnieje i jest współdzielony przez Android/Termux, ale **nie był użyty dla prywatnych oryginałów**.
6. Import wykonano na odizolowanej instancji PhotoMap przez podmianę katalogów danych na tym samym systemie plików. Wymagane było celowane zatrzymanie procesu serwera wewnątrz PRoot: samo `sv down` nie kończyło HTTP; **nie dotykano procesu IleStoi**.
7. Po uruchomieniu PhotoMap: HTTP 200 i użytkownik potwierdził działanie strony. Dopiero po tym zatwierdzeniu zatrzymano wyłącznie PhotoMap, wyrejestrowano usługę i usunięto sprawdzone kopie tymczasowe.
8. Oczyszczono dokument `docs/termux-dev.md`, który wcześniej opisywał stan „bez kopiowania danych” aktualny tylko dla pierwszego etapu; nowy dokument jednoznacznie odróżnia ukończony import, test i stan wyłączonej instancji.

## Raporty Local Agenta stanowiące ślad wykonania

W repo `MichalMatu/local-agent`, gałąź `agent-control`, host Android
`.agent/hosts/android-termux-10520/supervisor/6be16f1d-194b-4f07-b377-3d4bb218fcd7/task-results/`:

- `photomap-import-activation-preflight-20261101-v1.json` — **done**, integralność źródła, komplet 2196 mediów.
- `photomap-test-pi-snapshot-activate-20261101-v3.json` — **done**, celowane zatrzymanie PRoot, podmiana bazy i zdjęć, `/api/places/map` HTTP 200, IleStoi HTTP 200.
- `photomap-termux-final-service-stop-clean-20261101-v1.json` — **failed** w końcowym kroku usuwania rollbacku; **wcześniejsze czynności faktycznie zakończono**: PhotoMap OFF, runit odpięty, pusty import usunięty. Nie klasyfikuj całego zadania jako PASS.
- `photomap-termux-final-rollback-clean-verify-20261101-v1.json` — **done**, stara pusta baza testowa usunięta, PhotoMap OFF, IleStoi 200, aktywne dane zachowane.

W repo `MichalMatu/photomap`, gałąź `agent-control`, `.agent/results/`:

- `photomap-usb-adb-termux-media-transfer-20261101-v1.json` — **done**, media przez USB i weryfikacja.
- `photomap-final-mac-relay-pi-export-cleanup-20261101-v1.json` — **done**, usunięty Mac relay oraz eksport Pi, bez zmian produkcyjnych.

Błędne próby `v1/v2` aktywacji oraz nieudany transfer `rsync`/Wi-Fi to udokumentowane niepowodzenia, nie wpisy PASS.

## Stan docelowy / wznowienie w przyszłości

- Zachować dane Samsung `.dev/termux/data` i `.dev/termux/storage`, kod, build, PRoot i prywatny plik tokenu.
- Nie restartować PhotoMap automatycznie. Aby kiedyś ponowić test, sprawdzić zgodność kodu, konfiguracji i migracji, po czym **świadomie** zarejestrować ponownie service symlink do `.dev/termux/process/runit/photomap-dev` i uruchomić usługę; nie utożsamiać tego z deployem na Pi.
- Nie wykonywać dodatkowego cleanupu na produkcji ani kasowania obrazów z Raspberry Pi.
- Przed kolejnym sprintem pobrać rzeczywisty `main` HEAD; historyczny HEAD na Samsungu przed zapisem tej dokumentacji: `28ec394b43584eae34a2c521798d682c42b8b746`.
