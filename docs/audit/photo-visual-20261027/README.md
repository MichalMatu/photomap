# Audyt jakości galerii PhotoMap — 27 października 2026

## Zakres

- **1189** zatwierdzonych zdjęć z produkcyjnej bazy, wizualnie obejrzanych na 19 planszach po maksymalnie 64 zdjęcia.
- **195** opublikowanych miejsc, wstępnie przeanalizowanych strukturalnie (opisy, komentarze, artykuły i podpisy fotografii).
- **11** zdjęć w albumie Dworzec Wrocław Główny, sprawdzonych na osobnej planszy.
- **0** brakujących miniaturek w lokalnym zbiorze audytowym.
- Detektor wskazał **6 par** zdjęć o niskiej odległości perceptual dHash; wizualnie zaobserwowano też podobne kadry poza progiem.
- **598 zdjęć** otrzymało co najmniej jeden automatyczny sygnał ostrzegawczy. **To nie jest lista do usunięcia** — bardzo wiele sygnałów to prawidłowe zdjęcia architektury, ujęcia zabytkowych detali lub krajobrazów.

## Wnioski z przeglądu

Najbardziej problematyczne nie są parametry JPEG, lecz **selekcja redakcyjna**: przypadkowe fragmenty posadzki i murów, słabo widoczne ujęcia podziemi, fotografie tablic zamiast samych atrakcji oraz prawie identyczne zdjęcia tego samego miejsca. Wielu dobrych ujęć nie należy usuwać tylko dlatego, że pokazują detal — np. freski, sklepienia, rzeźby i autentyczne elementy historyczne bywają równie wartościowe jak szeroka panorama.

Na Dworcu Wrocław Główny znajdują się dwa oczywiste odstępstwa: F0105 (ciemna posadzka, brak opisu i podpisu) oraz F0111 (krasnal sfotografowany na bruku bez związku z głównym tematem albumu). **Nie zidentyfikowano jednoznacznego ujęcia kamery monitoringu w obecnych 11 zdjęciach.** Pozostałe ujęcia obejmują reprezentacyjne fasady, wejścia, perony, tablice odjazdów i wnętrza.

Duplikaty wizualne do selekcji: Polinka F0666/F0670 i F0669/F0671; Stary Cmentarz Żydowski F0829/F0832 (F0832 to **okładka**, zachować); Katedra Marii Magdaleny F0207/F0215. Wyjątkowo bogate galerie (np. Rynek Wrocław, Wodospad Kamieńczyka, Narodowe Forum Muzyki) wymagają dodatkowego kontekstowego przeglądu przed masowym skracaniem.

## Audyt opisów 195 miejsc

Weryfikacja na kopii produkcyjnego SQLite wykazała:

- **1 miejsce z brakującym opisem, lokalnym komentarzem i artykułem:** `wroclavia`.
- **9 miejsc z grupami co najmniej trzech identycznych podpisów zdjęć.** Należy zastąpić je informatywnymi, unikalnymi podpisami przy zachowaniu zgodności z fotografią.
- **95 miejsc** zawiera tekst zdjęcia z wyrazami wymagającymi ewentualnej kontroli (np. „ściana”, „tablica”, „kamera”), ale samo wystąpienie słowa **nie dowodzi błędu**.
- Brak weryfikowanych na tym etapie błędów historycznych lub geograficznych; do takiej oceny konieczny jest osobny audyt źródłowy opisów, nie tylko kontrola strukturalna.

## Pierwsza selekcja

W [`curation-plan.json`](curation-plan.json) wskazano **12 konkretnych zdjęć z ID, miejscem i uzasadnieniem**. Każde zostało ocenione na planszy, zweryfikowane w aktualnej produkcyjnej bazie, nie jest okładką i ma dostępny prywatny oryginał.

Proponowana bezpieczna operacja: przed wycofaniem utworzyć świeży backup SQLite i kopię oryginałów wybranych 12 zdjęć; następnie użyć **`POST /api/admin/photos/{id}/review`** ze statusem `rejected`, nie nieodwracalnego `DELETE`. Ten przepływ zachowuje rekord bazy i oryginał prywatny, wycofując publiczne media. Po zmianie zweryfikować liczniki miejsc, okładki, integralność bazy oraz publiczne API.

**Status: zatwierdzona lista kandydatów, bez wykonanych odrzuceń produkcyjnych.** Próba uruchomienia zapisu została zablokowana przez zabezpieczenie narzędzia. Bez potwierdzenia wykonania nie należy raportować jakiejkolwiek zmiany w produkcyjnej galerii.

## Zasoby do przeglądu

- [Dworzec Główny (11 zdjęć)](station.jpg)
- [Pierwsza plansza podejrzanych zdjęć](suspect-00.jpg)
- [Wszystkie plansze 1189 zdjęć](.)
- [Indeks zdjęć i sygnałów automatycznych](index.json)

## Kryteria dalszej selekcji

1. Usuń tylko kadr jednoznacznie niepowiązany z miejscem, nieczytelny lub wizualnie powtarzalny bez dodatkowej wartości.
2. Zachowaj różne perspektywy, pory dnia, detale architektoniczne, materiały historyczne i zdjęcia pozwalające odczytać kontekst miejsca.
3. Nigdy nie odrzucaj okładki bez wskazania lepszego następcy.
4. Dla każdego odrzucenia zapisz ID, powód, kopię oryginału, wcześniejszy status, nowy status i potwierdzenie działania API.
5. Po selekcji uzupełnij brakujące treści (w pierwszej kolejności Wroclavia) i zastąp wielokrotne ogólne podpisy konkretnymi opisami widocznych elementów.
