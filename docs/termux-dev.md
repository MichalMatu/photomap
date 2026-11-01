# PhotoMap — izolowana kopia testowa na Samsungu (Termux)

**Stan końcowy: 01.11.2026 — test użytkownika PASS, serwer testowy wyłączony.**
To archiwum operacyjne zakończonego sprintu, nie instrukcja wdrożenia produkcyjnego.
Szczegóły w [checkpoincie zamknięcia](checkpoints/2026-11-01-samsung-termux-photo-data-test-closeout.md).

## Izolacja i zachowane dane

- Kod: `$HOME/Projects/PhotoMap` w prywatnym katalogu Termuxa, bazowy `main` `28ec394b43584eae34a2c521798d682c42b8b746` (przed końcową aktualizacją dokumentacji).
- Runtime: Debian 12 ARM64 PRoot `photomap-dev`, Python 3.11; frontend TypeScript/Vite zbudowany w Termuxie.
- **Zachowana na Samsungu testowa kopia danych Raspberry Pi:** `.dev/termux/data/app.db`, `.dev/termux/storage/private`, `.dev/termux/storage/public`. Nie są to współdzielone pliki produkcyjne.
- SQLite: 19 574 784 bajtów, SHA-256 `24814f4084ef6989e4e7966d77d9f7cf88f033cd619d8c37eb66516adf3f3ede`; `integrity_check=ok`, `foreign_key_check=0`. **195 miejsc, 1082 rekordy zdjęć, 0 pamiątek** w migawce.
- Media: **1098 plików prywatnych (4 084 122 798 bajtów)** i **1098 publicznych (154 437 872 bajtów)**. Liczba plików różni się od liczby rekordów zdjęć.
- Dane i kod produkcyjnego PhotoMap na Raspberry Pi oraz działający na telefonie **IleStoi nie były zmieniane**.

## Wyniki testów

- Frontend: TypeScript/Vite PASS, Vitest **366/366** w 101 plikach.
- Backend: Debian `pytest -q` **344 passed**, 2 ostrzeżenia zależności, 0 błędów.
- Migracje Alembic i integralność osobnej SQLite: PASS.
- Po podłączeniu kopii: `/`, `/health`, `/api/places/map`, `/openapi.json`: **HTTP 200**. IleStoi `127.0.0.1:8001/api/health/ready`: **HTTP 200**.
- Użytkownik otworzył stronę `http://127.0.0.1:8010/` w przeglądarce Samsunga, potwierdził wyświetlanie rzeczywistych zdjęć i miejsc: **manual acceptance PASS**.
- Test restartu całego telefonu i długotrwałej pracy po restarcie nie były wykonywane.

## Transfer — uznana metoda

1. Raspberry Pi: read-only `sqlite3.Connection.backup()` do kontrolowanej, czasowej migawki; oryginalna produkcyjna baza i serwer bez zmian.
2. Raspberry Pi → MacBook: `rsync` pełnej bazy i obu katalogów mediów, po odczycie kontrolnym i porównaniu SHA bazy.
3. MacBook → Samsung: bazę przesłano `tar`/SSH, pliki mediów przez **USB ADB forward → SSH Termux → tar**. Potwierdzono liczby i sumę bajtów 2196 plików oraz SHA-256 bazy.
4. Kopię podłączono tylko do instancji testowej, z zachowaniem poprzedniej pustej bazy do momentu zatwierdzenia. Runit został zrestartowany bez ingerencji w IleStoi.
5. Sprzątanie: **~4 GB kopii transferowej na MacBooku usunięto; czasowy eksport SQLite na Pi usunięto**. Przed usunięciem wykonano walidację źródła; produkcyjne usługi Pi i tunel Cloudflare pozostały aktywne, `/health=200`.

Nie powtarzaj wcześniejszych nieudanych prób instalacji `pydantic-core` przez natywną kompilację Androida ani błędnej ścieżki SQLite w PRoot. `rsync` w Termuxie zwracał `Permission denied` nawet na własnym katalogu; połączenie SSH po Wi-Fi zrywało strumień. Potwierdzonym kanałem dla dużego transferu jest połączenie USB ADB z przekierowaniem do Termux SSH.

## Stan serwisu po zakończeniu

**PhotoMap na telefonie jest wyłączony**: zatrzymano jego proces wewnątrz PRoot i wyrejestrowano wyłącznie dowiązanie `$PREFIX/var/service/photomap-dev` (brak automatycznego ponownego startu tej usługi). Konfigurację środowiska oraz importowaną bazę i zdjęcia zachowano na potrzeby przyszłych testów. Nie usuwaj `.dev/termux/data` ani `.dev/termux/storage` podczas sprzątania.

Wcześniejsza komenda `sv up "$PREFIX/var/service/photomap-dev"` nie wystarczy, gdy serwis nie jest już zarejestrowany. Wznowienie testów wymaga świadomego sprawdzenia konfiguracji `.dev/termux/process/runit/photomap-dev` i ponownego zarejestrowania usługi. Normalnie serwer testowy pozostaje wyłączony.

Adres `http://127.0.0.1:8010/` dotyczy tylko tego Samsunga, gdy usługa została świadomie uruchomiona. Nie udostępniaj instancji testowej przez Cloudflare ani publiczny interfejs.
