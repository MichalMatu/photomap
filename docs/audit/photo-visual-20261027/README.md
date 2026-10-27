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

- **1 miejsce z brakującym opisem, lokalnym komentarzem i artykułem:** `wroclavia`. Dodatkowo oba opublikowane zdjęcia Wroclavii mają puste podpisy i nie mają opisów zdjęć.
- **9 miejsc z grupami co najmniej trzech identycznych podpisów zdjęć:** Aula Leopoldina, Bastion Sakwowy, Dworzec Główny, Fontanna Multimedialna, Hala Targowa, Katedra Marii Magdaleny, Most Grunwaldzki, Ossolineum i Panorama Racławicka. Ta ostatnia ma aż **6** zdjęć z jednakowym podpisem „Fragment monumentalnej ekspozycji Panoramy Racławickiej”. Należy je uzupełnić o konkretne elementy kadru bez zgadywania faktów.
- **95 miejsc** zawiera tekst zdjęcia z wyrazami wymagającymi ewentualnej kontroli (np. „ściana”, „tablica”, „kamera”), ale samo wystąpienie słowa **nie dowodzi błędu**.
- Brak weryfikowanych na tym etapie błędów historycznych lub geograficznych; do takiej oceny konieczny jest osobny audyt źródłowy opisów, nie tylko kontrola strukturalna.

## Pierwsza selekcja

W [`curation-plan.json`](curation-plan.json) wskazano **12 konkretnych zdjęć z ID, miejscem i uzasadnieniem**. Każde zostało ocenione na planszy, zweryfikowane w aktualnej produkcyjnej bazie, nie jest okładką i ma dostępny prywatny oryginał.

Aktualna decyzja redakcyjna: **trwale usuwać** wszystkie poprzednio odrzucone zdjęcia oraz 12 wybranych zdjęć niskiej jakości. Po zgodzie właściciela projektu stosować istniejący **`DELETE /api/admin/photos/{id}`**, który usuwa rekord, prywatny oryginał, miniaturę i audio. Przed operacją utrwalić spójny backup SQLite i manifest decyzji (bez archiwizowania wyrzuconych plików); następnie sprawdzić okładki, liczniki i integralność bazy. Docelowo tylko najwyższa jakość, nie ustalać minimalnej liczby zdjęć na miejsce.

**Status: plan trwałego czyszczenia przygotowany; stan produkcji zostanie uaktualniony dopiero po pozytywnym wyniku zadania Local Agenta.** Nie raportować usunięć bez potwierdzenia API i SQLite.

## Zasoby do przeglądu

- [Dworzec Główny (11 zdjęć)](station.jpg)
- [Pierwsza plansza podejrzanych zdjęć](suspect-00.jpg)
- [Wszystkie plansze 1189 zdjęć](.)
- [Indeks zdjęć i sygnałów automatycznych](index.json)

## Kryteria dalszej selekcji

1. Trwale usuń kadr jednoznacznie niepowiązany z miejscem, nieczytelny lub wizualnie powtarzalny bez dodatkowej wartości. Nie trzymaj starych odrzuconych oryginałów.
2. Zachowaj różne perspektywy, pory dnia, detale architektoniczne, materiały historyczne i zdjęcia pozwalające odczytać kontekst miejsca.
3. Nigdy nie odrzucaj okładki bez wskazania lepszego następcy.
4. Dla każdego trwałego usunięcia zapisz ID, powód, wcześniejszy status i potwierdzenie działania API. Przechowuj ślad audytowy, nie usunięte media.
5. Po selekcji uzupełnij brakujące treści (w pierwszej kolejności Wroclavia) i zastąp wielokrotne ogólne podpisy konkretnymi opisami widocznych elementów.

## Audyt redundancji plików (27.10.2026, odczyt produkcyjny)

Przed trwałym czyszczeniem sprawdzono model zapisu zdjęć, fizyczne pliki, referencje bazy i backupy na Pi. **Nie znaleziono zbędnych pełnowymiarowych duplikatów w aktywnym storage.**

- `Photo`: 1189 approved, 50 rejected. Każdy approved ma **jeden prywatny, kanoniczny oryginał**, który backend publicznie serwuje przez `/api/places/{place_id}/photos/{photo_id}/media/image`; nie generuje drugiego pełnego obrazu. Suma oryginałów: **4 345 488 821 B**.
- Miniatury `thumb_path`: 1189 plików, **124 732 368 B**; są potrzebne dla lekkiej mapy i należy je zachować.
- `public_path` zatwierdzonych `Photo` w formacie starego `/media/...`: **0**. Osierocone pliki private/public: **0**. SQLite `integrity_check=ok`.
- `Memory`: 0 rekordów w produkcji; mechanizm pamiętek ma osobny workflow oryginał + publiczna pochodna + miniatura, ale nie zużywa obecnie miejsca.
- Audio: 16 oryginałów (**39 013 190 B**) i 16 kopii publicznych (**39 013 034 B**); ten osobny przypadek wymaga uwzględnienia stripowania metadanych przed ewentualną optymalizacją.
- Katalog `backups/local-20260912-111259`: **4 565 181 054 B**, pojedynczy niezależny pełny backup SQLite + mediów; pliki nie są hardlinkowane. Jego duży rozmiar **nie jest błędem generowania zdjęć w aktywnej bazie**. Kopii bezpieczeństwa nie usuwać bez uprzedniego zweryfikowania odpowiednika poza Pi.
- System plików Pi podczas audytu: ok. **45,65 GB wolnego miejsca**.

**Decyzja techniczna:** nie modyfikować obecnego pipeline `Photo`, ponieważ już realizuje wymaganie jednego pełnowymiarowego pliku + małej miniatury. Nie usuwać kanonicznych oryginałów — to zepsułoby stronę. Dalsze odchudzanie Pi należy rozdzielić na (a) selekcję słabych zdjęć wraz z ich miniaturami, (b) retencję/przeniesienie pełnego backupu poza Pi, (c) ewentualną osobną optymalizację audio. W skrypcie czyszczenia `photo_prune.py` tworzony jest backup samego SQLite, bez dodatkowych kopii zdjęć.
