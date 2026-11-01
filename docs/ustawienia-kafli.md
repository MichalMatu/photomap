# Ustawienia kafli mapy

Ten dokument opisuje, jak ustawienia z panelu admina `Konfiguracja -> Mapa` w sekcjach
`Kafelki miejsc` i `Widocznosc kafli` wplywaja na publiczna tablice miniaturek miejsc.

## Tryb pinezek a tryb miniaturek

- **Miniatury/kafle** korzystaja z gestosci, priorytetow, limitow na zoom i rozkladania kolizji opisanych ponizej.
- **Pinezki** pokazuja wszystkie opublikowane miejsca pasujace do wybranych kategorii/warstw, ktorych lokalizacje znajduja sie w aktualnym obszarze mapy. Nie stosuja limitow liczby kafli, rankingu widocznosci ani odrzucania nakladajacych sie markerow.
- Kategorie i warstwy nadal filtrują obie prezentacje; zmiana trybu nie resetuje ich wyboru.
- Pinezki nie uruchamiaja masowego pobierania galerii i miniaturek dla calego viewportu. Pelna galeria jest pobierana dopiero przy interakcji z miejscem.

Ustawienia tej strony sluza do strojenia **kafli**, a nie liczby pinezek. Gdy kilka pinezek znajduje sie w tym samym punkcie, moga sie nakladac; nie wolno przez to ukrywac lokalizacji.

Kafel miejsca nie ma jednego stalego rozmiaru. Rozmiar koncowy powstaje z trzech warstw:

```txt
rozmiar koncowy =
  rozmiar bazowy
  x skala z priorytetu redakcji miejsca
  x skala z zoomu mapy

wynik jest obciety przez Min. skala i Maks. skala
```

W kodzie odpowiada za to `frontend/src/components/map/mapMarkerScale.ts`.

## Sekcja: Kafelki Miejsc

Ta sekcja odpowiada za fizyczny rozmiar pojedynczego kafla.

Nie decyduje bezposrednio, ile kafli mapa pokaze. Od tego jest sekcja `Widocznosc kafli`.

### Szerokosc px i Wysokosc px

To bazowy rozmiar kafla przed skalowaniem.

Przyklad:

```txt
Szerokosc px = 72
Wysokosc px = 58
```

Kafel startuje od proporcji `72 x 58`, a potem jest mnozony przez skale.

Jesli wszystkie kafle maja byc ogolnie wieksze albo mniejsze, to sa pierwsze pola do zmiany.

### Min. skala

Dolny bezpiecznik rozmiaru.

Jesli po przeliczeniu kafel wyszedlby za maly, system uzyje `Min. skala`.

Przyklad:

```txt
Szerokosc px = 72
Wysokosc px = 58
Min. skala = 0.55

minimalny kafel = 72 x 0.55 oraz 58 x 0.55
minimalny kafel = ok. 40 x 32 px
```

Podnies to pole, jesli mniej wazne albo oddalone kafle sa zbyt male.

### Maks. skala

Gorny bezpiecznik rozmiaru.

Jesli po przeliczeniu kafel wyszedlby za duzy, system uzyje `Maks. skala`.

Przyklad:

```txt
Szerokosc px = 72
Wysokosc px = 58
Maks. skala = 1.9

maksymalny kafel = 72 x 1.9 oraz 58 x 1.9
maksymalny kafel = ok. 137 x 110 px
```

Obniz to pole, jesli topowe miejsca przykrywaja mape albo zjadaja za duzo przestrzeni.

### Niski priorytet

Mnoznik rozmiaru dla miejsca z najnizszym priorytetem redakcji.

Priorytet redakcji miejsca ustawia sie w formularzu miejsca. Aktualny zakres priorytetu miejsca to:

```txt
0.5 - najnizszy priorytet
5.0 - najwyzszy priorytet
```

Przyklad:

```txt
Niski priorytet = 0.72
```

Miejsce z priorytetem `0.5` zaczyna od skali priorytetu `0.72`.

Obniz to pole, jesli mniej wazne miejsca maja byc wyraznie mniejsze. Podnies je, jesli nawet spokojne
miejsca powinny nadal byc dobrze widoczne.

### Wysoki priorytet

Mnoznik rozmiaru dla miejsca z najwyzszym priorytetem redakcji.

Przyklad:

```txt
Wysoki priorytet = 1.9
```

Miejsce z priorytetem `5.0` moze dojsc do skali priorytetu `1.9`, ale koncowy rozmiar nadal jest
ograniczony przez `Maks. skala`.

Podnies to pole, jesli najwazniejsze miejsca maja mocniej dominowac. Obniz je, jesli roznice miedzy
miejscami sa za agresywne.

### Krzywa priorytetu

Steruje tym, jak szybko kafel rosnie miedzy `Niski priorytet` i `Wysoki priorytet`.

```txt
Krzywa priorytetu = 1.12
```

Znaczenie praktyczne:

- wartosc blisko `1.0` daje prawie liniowe przejscie,
- wyzsza wartosc spokojniej traktuje srodek skali i mocniej wyroznia dopiero najwyzsze priorytety,
- nizsza wartosc szybciej powieksza miejsca ze srednim priorytetem.

## Zoom Mapy Tez Zmienia Rozmiar

Na rozmiar kafla wplywa tez zoom mapy. Te parametry sa obecnie w kodzie, nie w panelu admina:

```txt
zoom bazowy = 11
skala przy zoomie 11 = 0.72
wzrost na poziom zoomu = 0.11
minimalna skala zoomu = 0.68
maksymalna skala zoomu = 1.18
```

Uproszczony efekt:

```txt
zoom 11 -> kafle sa dodatkowo mnozone przez ok. 0.72
zoom 13 -> kafle sa dodatkowo mnozone przez ok. 0.94
zoom 15 -> kafle sa dodatkowo mnozone przez ok. 1.16
zoom 17 -> kafle sa dodatkowo mnozone przez ok. 1.18
```

To oznacza, ze ten sam priorytet miejsca moze dac inny rozmiar kafla przy innym zoomie.

## Przyklad Dla Aktualnych Wartosci

Dla ustawien:

```txt
Szerokosc px = 72
Wysokosc px = 58
Min. skala = 0.55
Maks. skala = 1.9
Niski priorytet = 0.72
Wysoki priorytet = 1.9
Krzywa priorytetu = 1.12
```

Orientacyjne rozmiary kafli:

| Priorytet miejsca | Zoom | Rozmiar kafla |
| --- | ---: | ---: |
| 0.5 | 11 | ok. 40 x 32 px |
| 1.0 | 11 | ok. 43 x 34 px |
| 3.0 | 11 | ok. 69 x 56 px |
| 5.0 | 11 | ok. 98 x 79 px |
| 0.5 | 13 | ok. 49 x 39 px |
| 1.0 | 13 | ok. 56 x 45 px |
| 3.0 | 13 | ok. 90 x 73 px |
| 5.0 | 13 | ok. 129 x 104 px |
| 0.5 | 15 | ok. 60 x 48 px |
| 1.0 | 15 | ok. 69 x 55 px |
| 3.0 | 15 | ok. 111 x 90 px |
| 5.0 | 15 | ok. 137 x 110 px |

Przy priorytecie `5.0` i zoomie `15` wynik dobija do `Maks. skala`, dlatego nie rosnie dalej
proporcjonalnie.

## Formula Techniczna

W uproszczeniu:

```txt
postep priorytetu =
  ((priorytet_miejsca - 0.5) / (5.0 - 0.5)) ^ krzywa_priorytetu

skala priorytetu =
  niski_priorytet
  + postep_priorytetu * (wysoki_priorytet - niski_priorytet)

skala zoomu =
  0.72 + (zoom - 11) * 0.11

skala surowa =
  skala priorytetu * skala zoomu

skala koncowa =
  skala surowa obcieta do zakresu Min. skala - Maks. skala

szerokosc koncowa =
  Szerokosc px * skala koncowa

wysokosc koncowa =
  Wysokosc px * skala koncowa
```

## Jak Stroic Ustawienia

Jesli wszystkie kafle sa za male:

- podnies `Szerokosc px` i `Wysokosc px`,
- albo podnies `Min. skala`, jesli problem dotyczy glownie mniej waznych kafli.

Jesli topowe kafle sa za duze:

- obniz `Maks. skala`,
- albo obniz `Wysoki priorytet`.

Jesli malo wazne miejsca sa zbyt widoczne:

- obniz `Niski priorytet`,
- ewentualnie obniz `Min. skala`, ale ostroznie, bo kafle moga stac sie zbyt male.

Jesli roznice miedzy miejscami sa za male:

- podnies `Wysoki priorytet`,
- obniz `Niski priorytet`,
- lekko podnies `Krzywa priorytetu`.

Jesli tylko topowe miejsca maja byc mocno wyroznione:

- zostaw `Niski priorytet` umiarkowany,
- podnies `Wysoki priorytet`,
- podnies `Krzywa priorytetu`.

Jesli srodek skali ma byc bardziej widoczny:

- obniz `Krzywa priorytetu` w okolice `1.0` albo nizej.

## Sekcja: Widocznosc Kafli

Ta sekcja odpowiada za to, ile kafli mapa probuje pokazac przy danym rozmiarze ekranu i zoomie.

Uproszczona formula:

```txt
pojemnosc viewportu =
  szerokosc ekranu x wysokosc ekranu / Powierzchnia na kafel

wypelnienie zoomu =
  wartosc miedzy Min. wypelnienie i Maks. wypelnienie,
  rosnaca od Zoom startowy do Zoom pelny

limit kafli =
  pojemnosc viewportu x wypelnienie zoomu
```

Ten limit oznacza: "tyle kafli mapa moze sprobowac pokazac". Realnie widocznych kafli moze byc mniej, bo:

- moze byc mniej miejsc w danych,
- mapa chroni reprezentacje miast przy widoku wielu miast,
- ranking widocznosci wybiera miejsca z najwyzszym priorytetem,
- po obliczeniu rozmiarow dodatkowa logika usuwa kafle, ktore nadal za mocno nachodza na siebie.

### Powierzchnia na kafel

To najwazniejsze pole gestosci.

Mowi, ile pikseli kwadratowych ekranu system rezerwuje orientacyjnie na jeden kafel.

Przyklad:

```txt
Powierzchnia na kafel = 18000
```

Dla ekranu `1440 x 900`:

```txt
viewport = 1 296 000 px2
pojemnosc = 1 296 000 / 18 000
pojemnosc = 72 kafle przy pelnym wypelnieniu
```

Znaczenie praktyczne:

- wieksza wartosc = mniej kafli,
- mniejsza wartosc = wiecej kafli,
- jezeli kafle robia tlok, podnies te wartosc,
- jezeli mapa jest pusta, obniz te wartosc.

To pole kalibruj po ustawieniu rozmiaru kafli. Duze kafle potrzebuja wiekszej powierzchni na kafel.

### Zoom startowy

Zoom, od ktorego mapa zaczyna zwiekszac liczbe widocznych kafli.

Przyklad:

```txt
Zoom startowy = 6
```

Przy zoomie `6` mapa uzywa `Min. wypelnienie`. Ponizej tego zoomu nie schodzi juz nizej.

Znaczenie praktyczne:

- nizsza wartosc = mapa zaczyna pokazywac wiecej kafli juz z daleka,
- wyzsza wartosc = daleki widok jest spokojniejszy i bardziej selektywny.

Jesli po oddaleniu mapa jest za pusta, obniz `Zoom startowy` albo podnies `Min. wypelnienie`.

### Zoom pelny

Zoom, przy ktorym mapa moze uzyc `Maks. wypelnienie`.

Przyklad:

```txt
Zoom pelny = 15
```

Przy zoomie `15` mapa moze uzyc pelnej pojemnosci wynikajacej z `Powierzchnia na kafel`.

Znaczenie praktyczne:

- nizsza wartosc = mapa szybciej robi sie gesta,
- wyzsza wartosc = pelna liczba kafli pojawia sie dopiero blizej.

Jesli mapa za szybko robi sie zatloczona podczas przyblizania, podnies `Zoom pelny`.

### Min. wypelnienie

Minimalna czesc pojemnosci viewportu, uzywana przy `Zoom startowy`.

Przyklad:

```txt
Min. wypelnienie = 0.12
```

To znaczy, ze przy dalekim widoku mapa probuje uzyc ok. `12%` pojemnosci ekranu.

Znaczenie praktyczne:

- wyzsza wartosc = wiecej kafli z daleka,
- nizsza wartosc = spokojniejszy, bardziej selektywny widok z daleka.

Jesli daleki widok ma pokazywac tylko kilka najmocniejszych miejsc, trzymaj te wartosc nisko.

### Maks. wypelnienie

Maksymalna czesc pojemnosci viewportu, dostepna przy `Zoom pelny`.

Przyklad:

```txt
Maks. wypelnienie = 1
```

To znaczy, ze przy pelnym zoomie mapa moze uzyc 100% pojemnosci wynikajacej z `Powierzchnia na kafel`.

Znaczenie praktyczne:

- wartosc `1` pozwala wypelnic ekran zgodnie z limitem,
- wartosc `0.8` zostawia wiecej oddechu,
- wartosc powyzej `1` zwiekszalaby agresywnosc, ale obecny panel trzyma sensowny zakres konfiguracji.

### Krzywa gestosci

Steruje tempem przejscia od `Min. wypelnienie` do `Maks. wypelnienie`.

Przyklad:

```txt
Krzywa gestosci = 1.35
```

Znaczenie praktyczne:

- wartosc blisko `1.0` daje prawie rowne narastanie,
- wyzsza wartosc dluzej trzyma spokojny widok i mocniej zageszcza dopiero blisko,
- nizsza wartosc szybciej dodaje kafle na srednich zoomach.

Jesli mapa na srednim zoomie jest za pusta, obniz `Krzywa gestosci`.

Jesli mapa na srednim zoomie jest za gesta, podnies `Krzywa gestosci`.

## Przyklad Widocznosci Dla Aktualnych Wartosci

Dla ustawien:

```txt
Powierzchnia na kafel = 18000
Zoom startowy = 6
Zoom pelny = 15
Min. wypelnienie = 0.12
Maks. wypelnienie = 1
Krzywa gestosci = 1.35
```

Mapa probuje pokazac orientacyjnie:

| Viewport | Zoom 6 | Zoom 8 | Zoom 10 | Zoom 12 | Zoom 13 | Zoom 15+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile 390 x 780 | 1 | 3 | 6 | 10 | 11 | 16 |
| Tablet 900 x 1000 | 6 | 11 | 20 | 31 | 37 | 50 |
| Desktop 1440 x 900 | 8 | 16 | 29 | 45 | 53 | 72 |

To sa limity przed ostatecznym usunieciem nachodzacych kafli. Jesli kafle sa duze albo miejsca leza blisko siebie,
finalnie moze zostac mniej kafli niz w tabeli.

## Procedura Kalibracji Bez Zgadywania

Kalibruj w tej kolejnosci:

1. Ustaw docelowy rozmiar kafli.
2. Ustaw roznice miedzy miejscami malo waznymi i topowymi.
3. Dopiero potem ustaw liczbe widocznych kafli.
4. Na koncu sprawdz ranking, czyli ktore miejsca wygrywaja, gdy limit jest za maly dla wszystkich.

### Krok 1: Wybierz trzy priorytety testowe

Ustaw w danych testowych albo w adminie trzy miejsca:

```txt
priorytet 1.0 - zwykle miejsce
priorytet 3.0 - mocne miejsce
priorytet 5.0 - topowe miejsce
```

Patrz na mape przy zoomach:

```txt
zoom 11 - daleki/szeroki widok
zoom 13 - podstawowy widok miasta
zoom 15 - bliski widok dzielnicy/miejsca
```

### Krok 2: Skalibruj `Kafelki miejsc`

Najpierw ustaw `Szerokosc px` i `Wysokosc px`, az zwykle miejsce ma dobry rozmiar przy zoomie `13`.

Potem:

- ustaw `Min. skala`, zeby zwykle i slabe miejsca nie byly mikroskopijne,
- ustaw `Maks. skala`, zeby topowe miejsca nie przykrywaly mapy,
- ustaw `Niski priorytet`, zeby slabe miejsca byly tlem,
- ustaw `Wysoki priorytet`, zeby topowe miejsca mialy wyrazna przewage,
- ustaw `Krzywa priorytetu`, zeby zdecydowac, czy srednie miejsca maja rosnac szybko czy dopiero top ma dominowac.

Nie stroi sie gestosci, dopoki rozmiary kafli nie sa akceptowalne. Gestosc z dobrym limitem moze wygladac zle,
jesli pojedynczy kafel jest za duzy.

### Krok 3: Skalibruj `Widocznosc kafli`

Zdecyduj, ile kafli chcesz widziec na typowym desktopie:

```txt
daleko / zoom 6-8       -> tylko najmocniejsze miejsca
srednio / zoom 10-13    -> atrakcyjna tablica miasta
blisko / zoom 15+       -> duzo miejsc, ale bez chaosu
```

Nastepnie dobierz pola:

- `Powierzchnia na kafel` ustaw tak, zeby przy `Zoom pelny` liczba kafli byla bliska oczekiwanej,
- `Min. wypelnienie` ustaw tak, zeby daleki widok nie byl pusty ani zatloczony,
- `Zoom startowy` ustaw tam, gdzie mapa ma zaczac dodawac wiecej miejsc,
- `Zoom pelny` ustaw tam, gdzie ma pojawic sie pelna gestosc,
- `Krzywa gestosci` ustaw dopiero na koncu, zeby dopracowac tempo narastania.

Przyklad:

```txt
Chcesz ok. 50 kafli na desktopie przy pelnym zoomie.
Desktop ma ok. 1 296 000 px2.

Powierzchnia na kafel = 1 296 000 / 50
Powierzchnia na kafel = ok. 26 000
```

Czyli:

- `18000` daje gestsza mape,
- `26000` daje spokojniejsza mape,
- `32000` daje jeszcze bardziej selektywny widok.

### Krok 4: Sprawdz Efekt Na Trzech Ekranach

Po kazdej wiekszej zmianie sprawdz:

```txt
mobile 390 x 780
tablet ok. 900 x 1000
desktop ok. 1440 x 900
```

Na mobile oczekuj znacznie mniejszej liczby kafli, bo pojemnosc viewportu jest mniejsza.

Jesli desktop wyglada dobrze, ale mobile jest zatloczony:

- podnies `Powierzchnia na kafel`,
- obniz `Maks. wypelnienie`,
- obniz rozmiar kafli albo `Maks. skala`.

Jesli mobile wyglada dobrze, ale desktop jest pusty:

- obniz `Powierzchnia na kafel`,
- podnies `Maks. wypelnienie`,
- sprawdz, czy ranking/kolizje nie odrzucaja wielu miejsc lezacych zbyt blisko siebie.

## Szybka Sciaga Decyzji

| Problem | Najpierw zmien | Jesli nie wystarczy |
| --- | --- | --- |
| Wszystkie kafle za male | `Szerokosc px`, `Wysokosc px` | `Min. skala` |
| Topowe kafle za duze | `Maks. skala` | `Wysoki priorytet` |
| Slabe miejsca sa zbyt widoczne | `Niski priorytet` | `Krzywa priorytetu` w gore |
| Srednie miejsca sa za male | `Krzywa priorytetu` w dol | `Niski priorytet` w gore |
| Z daleka jest za pusto | `Min. wypelnienie` w gore | `Zoom startowy` w dol |
| Z daleka jest za gesty tlok | `Min. wypelnienie` w dol | `Zoom startowy` w gore |
| Sredni zoom jest za pusty | `Krzywa gestosci` w dol | `Zoom pelny` w dol |
| Sredni zoom jest za gesty | `Krzywa gestosci` w gore | `Zoom pelny` w gore |
| Blisko nadal za malo miejsc | `Powierzchnia na kafel` w dol | `Maks. wypelnienie` w gore |
| Blisko zbyt duzo miejsc | `Powierzchnia na kafel` w gore | `Maks. wypelnienie` w dol |

## Czego Te Pola Nie Robia

Te pola steruja rozmiarem pojedynczego kafla. Nie decyduja bezposrednio, ile kafli wejdzie na mape.

Za liczbe widocznych kafli odpowiada sekcja `Widocznosc kafli`, m.in.:

- `Powierzchnia na kafel`,
- `Zoom startowy`,
- `Zoom pelny`,
- `Min. wypelnienie`,
- `Maks. wypelnienie`,
- `Krzywa gestosci`.

Za wybor, ktore miejsca przebijaja sie na mapie przy ograniczonej liczbie kafli, odpowiada sekcja
`Ranking widocznosci`, m.in.:

- `Priorytet redakcji`,
- `Zdjecia`,
- `Pamiatki`,
- `Score`.

Te trzy obszary sa powiazane:

```txt
Kafelki miejsc      -> jak duzy jest kafel
Widocznosc kafli    -> ile kafli mapa probuje pokazac
Ranking widocznosci -> ktore kafle dostaja pierwszenstwo
```
