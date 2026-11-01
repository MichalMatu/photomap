# Kierunek Produktu

PhotoMap to globalna wizualna mapa miejsc z klimatem. Produkt nie jest encyklopedycznym przewodnikiem turystycznym i nie jest zwykla mapa z pinami. Wroclaw jest pierwszym miastem startowym, na ktorym redukujemy zakres do najmocniejszego rdzenia: mapa miniaturek, miejsca, covery, pamiatki, proste kolekcje, moderacja i content pipeline.

Najkrotszy opis:

```txt
Mapa jako tablica miniaturek miejsc, gdzie widac klimat miasta, zdjecia, pamiatki ludzi i proste kolekcje miejsc.
```

## Rdzen Produktu

Centralnym bytem jest `place`. `City` organizuje dane, `Category` opisuje charakter miejsca, a reszta jest warstwa wokol miejsca albo kolekcji miejsc:

- zdjecia i covery,
- pamiatki ludzi,
- opcjonalne audio przypiete do konkretnego zdjecia albo pamiatki,
- trasy albo kolekcje miejsc,
- lekkie zgloszenia jakosci.

Nie tworzymy osobnych produktow dla zdjec, pamiatek, tras, audio czy historii. Audio dziala jako krotki zalacznik do konkretnego medium wizualnego, a nie osobna warstwa mapy, feed ani niezalezny byt produktu. Obslugiwane formaty audio to MP3, M4A i FLAC; formaty spoza aktualnego zakresu zostaja zamrozone.

## Doswiadczenie Mapy

Pierwszy kontakt z PhotoMap ma byc wizualny. Uzytkownik wchodzi na mape miasta i od razu widzi atrakcyjna plansze miniaturek. Klikniecie miejsca pokazuje szczegoly, ale mapa musi byc ciekawa jeszcze przed kliknieciem.

Zasady produktu:

- publiczne markery domyślnie pokazują miniatury, covery albo klastry miniaturek; użytkownik może opcjonalnie przełączyć je na pinezki, bez zmiany danych miejsc ani galerii,
- zwykle pinezki nie sa domyslnym jezykiem publicznej mapy,
- zoom zmienia gestosc i rozmiar elementow,
- klikniecie miniatury w galerii miejsca otwiera bezposrednio jeden lekki widok medium; nie dodajemy posredniego podgladu tego samego zdjecia,
- widok medium eksponuje obraz, nazwe miejsca, opcjonalne audio oraz jeden kompaktowy blok tekstu: podpis zdjecia z opisem miejsca albo dane pamiatki,
- audio w widoku medium moze dzialac jako delikatny ambient autoplay tylko po wlaczeniu kontrolki `Audio` w menu mapy,
- akcje pomocnicze, takie jak edycja pamiatki i zgloszenie problemu, pozostaja male i drugoplanowe,
- zewnetrzne materialy maja byc pozniej osobnymi, strukturalnymi linkami przypietymi do miejsca, a nie tekstem w podpisie zdjecia,
- warstwy pomagaja ogladac dane: polecane, galerie, pamiatki i proste kolekcje,
- kategorie pochodza z danych i nie powinny byc twardo wpisane w UI,
- publiczna mapa ma zachowac efekt wizualnej tablicy nawet po optymalizacji kontraktu API.

Kontrakt filtrow mapy:

- `Polecane`, `Miejsca` i `Pamiatki` dzialaja jak niezalezne przelaczniki,
- jedna albo dwie aktywne warstwy sa pokazywane dokladnie jako te wybrane kontrolki,
- komplet trzech aktywnych warstw zwija sie wizualnie do jednej kontrolki `Wszystkie`,
- `Wszystkie` wlaczone z dowolnego stanu pokazuje pelny widok mapy,
- `Wszystkie` klikniete, gdy jest juz aktywne, czysci warstwy i zostawia sama mape bazowa,
- nie pokazujemy osobnego toastu/licznika liczby miejsc po filtrze; liczby naleza do kontrolek warstw i kategorii.

## Pierwsze Miasto

Pierwsze miasto ma miec tylko tyle dobrze wybranych miejsc, ile potrzeba do sprawdzenia mapy. Wroclaw jest datasetem startowym do strojenia produktu:

- kazde opublikowane miejsce ma sensowny cover,
- miejsca maja kategorie, krotki opis, lokalny komentarz, pelny opis w `article_blocks` i pozycje,
- wybrane miejsca maja dodatkowe zdjecia albo pamiatki,
- ranking i wagi pozwalaja testowac widocznosc markerow,
- admin i moderacja pomagaja utrzymac jakosc danych.

Nie gonimy za liczba rekordow. Najpierw mapa ma dzialac dobrze na aktualnej probce, dopiero potem rozszerzamy dataset.

Aktualna lokalna baza jest robocza i moze zawierac dummy content. Nie traktujemy jej samej jako zrodla zadan content-quality. Prace nad jakoscia danych maja sens dopiero przy realnym manifescie, realnych assetach albo konkretnym bledzie danych wskazanym przez uzytkownika.

## Kierunek Globalny

PhotoMap ma technicznie wspierac kolejne miasta, ale rollout nie jest biezacym celem. Kiedy przyjdzie czas na kolejne miasto, powinno wejsc przez content pipeline:

```txt
content/cities/{city}/manifest.json -> import -> moderacja/korekty -> publiczna mapa miasta
```

Admin UI sluzy do korekt, moderacji i pojedynczych zmian. Wieksze paczki miejsc, tras i danych redakcyjnych powinny byc powtarzalne przez manifesty.

PhotoMap nie jest generatorem dowolnych aplikacji. Uniwersalnosc produktu ma wynikac z konfiguracji produktu i rozszerzalnego modelu miejsca:

- `/api/app-config` publicznie opisuje aktualna nazwe produktu, etykiety, branding, jezyk, fallback mapy, ustawienia kafli/gęstości/rankingu mapy i pola dodatkowe miejsca,
- adminowa sekcja `Konfiguracja` pozwala bezpiecznie edytowac te ustawienia bez grzebania w kodzie,
- `place` zachowuje stale pola wymagane przez mape,
- dlugie redakcyjne opisy miejsc ida do `place.article_blocks`, a nie do pierwszego renderu mapy,
- branzowe dane klienta ida do `place.custom_fields`, walidowanych wedlug konfiguracji,
- publiczny widok pokazuje tylko pola oznaczone jako publiczne,
- admin pozwala edytowac wartosci skonfigurowanych pol w formularzu miejsca.

Konfiguracja produktu ma pozostac waskim mechanizmem runtime, nie kreatorem dowolnych aplikacji. Istniejace pola miejsc maja chroniony techniczny `key` i `type`; zmiana etykiety, widocznosci, wymagalnosci, kolejnosci i opcji jest dozwolona tylko wtedy, gdy nie psuje istniejacych danych miejsc.

Ustawienia mapy w konfiguracji obejmuja pierwszy etap strojenia publicznej tablicy miniaturek: bazowy rozmiar kafli miejsc, zakres skalowania po priorytecie redakcyjnym, podstawowa gestosc widocznych kafli oraz wagi rankingu wyboru miejsc. Bardziej techniczne parametry kolizji i zachowania miasta przy odleglych zoomach pozostaja w kodzie do czasu osobnej decyzji produktowej.

Kod pod konkretnego klienta powinien byc wtedy niewielka warstwa konfiguracji i ewentualnych dopasowan domenowych, nie osobna aplikacja od zera.

## Jezyk Produktu

W UI i dokumentacji produktowej preferujemy proste slowa:

- miejsce,
- mapa,
- miasto,
- kategoria,
- pamiatka,
- trasa,
- kolekcja,
- zdjecie.

Techniczne `guide` moze zostac w backendzie. Produktowo mowimy `trasa` albo `kolekcja miejsc`, zaleznie od kontekstu.

## Aktualny Nacisk

Nie utrzymujemy osobnej listy zadan produktowych. Ten dokument jest zrodlem kierunku, a nowe prace powinny wzmacniac jeden z trzech obszarow:

- czytelnosc i atrakcyjnosc publicznej mapy na realnych danych,
- jakosc danych miejsc, zdjec, pamiatek i prostych kolekcji,
- prostote admina jako narzedzia korekt, moderacji i pojedynczych zmian.

## Najblizszy Cel Admina

Nastepny wiekszy etap admina ma poprawic uzytkowosc panelu do korekt, moderacji i pojedynczych zmian. To jeden cel end-to-end, bo trasy, zdjecia i moderacja dotykaja tych samych problemow: wyboru miasta i miejsca, blokowego opisu, galerii mediow, modali akcji oraz czytelnego wykorzystania przestrzeni.

Podcele wykonawcze:

- wspolny edytor blokowy i renderer sa juz wydzielone jako `ContentBlockEditor` i `ContentBlocks`; sa reuzywane przez miejsca, trasy i opisy zdjec, a kolejne prace maja utrzymac jeden kontrakt blokow zamiast tworzyc lokalne edytory albo renderery,
- trasy maja zachowac krotki opis do kart i list, ale dostac widoczny blokowy `Pelny opis trasy`; backend, API, frontend i TTS maja czytac te same bloki opisu trasy z kontrolowanym fallbackiem do krotkiego opisu,
- dodawanie miejsc do trasy ma zaczynac sie od wyboru miasta, a dopiero potem pokazywac miejsca z tego miasta; wyszukiwarka ma dzialac w aktualnym kontekscie miasta, a lista juz dodanych miejsc pozostaje osobnym uporzadkowanym widokiem trasy,
- opis zdjecia ma uzywac tego samego edytora blokowego co opisy miejsc i tras; istniejacy krotki opis tekstowy trzeba przemigrowac do jednego bloku akapitu albo zachowac tylko jako kompatybilne zrodlo migracji, bez konkurencyjnych pol w UI,
- publiczne wyswietlenie opisu zdjecia ma byc pelnym overlayem na zdjeciu z obsluga tytulow, sekcji, akapitow i linkow; mala dymkowa etykieta nie wystarczy dla dluzszych historii,
- TTS zdjecia ma czytac tekst z tych samych blokow opisu, ktore widzi uzytkownik na ekranie,
- moderacja zdjec ma byc pogrupowana wedlug miasta i miejsca, na wzor strony `Miejsca`; nie pokazujemy wszystkich zdjec naraz jako jednej plaskiej listy,
- modal `Zdjecia miejsca` ma pokazac galerie/liste zdjec i akcje dla istniejacych mediow, bez stalego formularza uploadu na gorze,
- dodawanie zdjecia ma byc osobna akcja i osobny modal `Dodaj zdjecie`; nalezy reuzyc obecny modal uploadu, rozszerzajac go o tryb z przypietym miejscem albo o wybor `miasto -> miejsce` w globalnym wariancie,
- ciezkie akcje zdjecia, takie jak edycja tekstu, atrybucji, audio i redakcji, powinny otwierac osobne modale; karta zdjecia ma pokazywac podglad, status i szybkie akcje, a nie pelny formularz wszystkiego,
- podglad zdjecia w adminie ma dzialac jak galeria miejsca z przewijaniem poprzednie/nastepne, startem od kliknietego zdjecia i akcjami admina bezposrednio na aktualnym zdjeciu,
- akcje w wierszu miejsca powinny byc rozdzielone znaczeniowo: podglad publiczny, galeria zdjec admina, dodanie zdjecia, edycja i usuniecie,
- modale moga byc szersze, gdy obsluguja edycje tresci albo galerie; szerokosc ma wynikac z zadania, a nie z upychania wielu niezaleznych formularzy w jednym malym oknie,
- jeden modal powinien miec jedna glowna robote; jezeli modal zaczyna laczyc formularz, liste, moderacje i podglad, nalezy rozdzielic go na mniejsze przeplywy,
- kazdy przeplyw admina ma jawnie pokazywac kontekst miasta, miejsca i statusu, zeby operator wiedzial, czego dotyczy akcja,
- UI ma reuzyc istniejace komponenty i tryby komponentow zamiast tworzyc rownolegle warianty tej samej logiki,
- nowe style maja korzystac z tokenow i klas bazowych systemu UI; lokalny CSS powinien dodawac tylko layout albo stan, bez doklejania surowych kolorow, spacingow i powielania komponentow wizualnych,
- karty, modale i galerie maja dobrze wykorzystywac miejsce: bez pustych pasow, przypadkowych luk, nadmiarowych naglowkow i formularzy stale zajmujacych ekran, gdy akcja moze byc przyciskiem otwierajacym modal.

Warunki domkniecia tego celu:

- zmiany backendu, serializerow, klienta API i typow frontendu sa spiete kontraktowo,
- migracje danych nie zostawiaja konkurencyjnych pol ani martwych fallbackow,
- helpery wyboru miasta/miejsca, blokow opisu i galerii maja testy adekwatne do ryzyka,
- po implementacji trzeba sprawdzic screenshotami Playwrighta widoki: edycja trasy, wybor miejsc po miescie, edycja opisu zdjecia, publiczny overlay opisu, moderacja zdjec po miescie i miejscu oraz adminowa galeria zdjec miejsca.

## Todo

To lista rzeczy odlozonych. Nie wybieramy ich jako kolejnych prac bez osobnej decyzji produktowej:

- pieczatki,
- platnosci,
- konta uzytkownikow,
- rozbudowane SEO,
- nowe miasta jako aktywne wdrozenie,
- duze nowe funkcje admina,
- backendowy fallback TTS generujacy tymczasowe `audio/wav` w odpowiedzi HTTP bez zapisu do storage,
- pelne galerie albo pelne pamiatki w pierwszym renderze mapy.

Nowa praca wchodzi tylko wtedy, gdy poprawia czytelnosc mapy, pokazanie miejsca albo utrzymanie danych.

- Widok miniatury/pinezki jest wybierany w menu bocznym; miniatury pozostają domyślne.
- Przypięte karty pokazują wyłącznie dwie symetryczne górne akcje. Opis chowa się automatycznie przy zmniejszaniu; do szuflady przenosi się przez przeciągnięcie.

- Mały pasek to tylko Trasy, Warstwy i Przypięte. Audio oraz kategorie pozostają w pełnym menu, a Warstwy otwierają pełne ustawienia. Menu przyjmuje poziome gesty w obie strony, bez kolizji z panowaniem mapy.
- Akcje przypiętych miniatur zanikają po 2,5 s i powracają po dotknięciu; obsługa klawiaturą i preferencji ograniczonych animacji pozostaje dostępna.

- Atrybucja OpenStreetMap to stale dostępny, mały odsyłacz tekstowy w lewym dolnym rogu, nad zwiniętą lub rozwiniętą szufladą. Nie wyświetla ikony informacji ani nakładki Leafleta. Wymagane oznaczenie źródła pozostaje czytelne.

- Przypięte zdjęcia: pojedyncze dotknięcie pływającej miniatury na mapie lub miniatury w szufladzie otwiera bezpośrednio ten sam `PhotoDetailModal` co wachlarz miejsca (wraz z nawigacją i danymi zdjęcia). Dotknięcie w szufladzie nie odpina zdjęcia; do przeniesienia z szuflady na mapę służy wyłącznie przeciągnięcie poza obszar szuflady, a do szuflady przeciągnięcie karty na jej obszar. Ruch/resize nie może otworzyć modalu. Zdjęcia przypięte spoza lekkiego podglądu mapy mają zachowany snapshot do podglądu podczas ładowania pełnej galerii.
