# Editorial Media Workflow

Ten dokument opisuje powtarzalny sposob dodawania nowych miast, miejsc i wysokiej jakosci zdjec redakcyjnych do PhotoMap. Celem jest gladka seria pracy contentowej: bez duplikowania miejsc, bez przypadkowych licencji i bez nudnych, powtarzalnych galerii.

## Zasady

- Najpierw istnieje `city` i `place`, dopiero potem zdjecia. Zdjecie zawsze jest przypiete do konkretnego miejsca.
- Jeden realny obiekt lub jedna realna atrakcja ma miec jeden rekord `place`. Nie tworz drugiego miejsca dla tego samego obiektu tylko dlatego, ze ma inna nazwe, tlumaczenie, wejscie, adres albo zrodlo zdjec.
- Jesli miejsce juz istnieje, aktualizuj jego opis, kategorie, pozycje, cover i galerie zamiast tworzyc nowy `place`.
- Zdjecia maja budowac chec odwiedzenia miejsca. Galeria powinna miec rytm: szeroki kadr, detal, pora dnia, sezon, ruch ludzi, spokojniejszy moment, architektura, kontekst ulicy albo wnetrza.
- Nie importuj zdjec bez pewnego prawa uzycia, stabilnego URL zrodla, autora i zapisanej licencji.
- Nie importuj kilku prawie identycznych kadrow. Przy podobnych ujeciach wybierz jeden najlepszy plik: najmocniejszy wizualnie, najczytelniejszy dla miejsca, w najwyzszej jakosci i z najpewniejsza licencja.
- **Jakosc przed iloscia**: nie ma minimalnej liczby zdjec do osiagniecia. Jedno wybitne zdjecie jest lepsze od dziesieciu przecietnych. Kazde kolejne zdjecie musi dodawac inna perspektywe, porze dnia, unikatowy detal lub wiarygodny kontekst miejsca.
- Nie publikuj zdjec pokazujacych przypadkowa sciane, posadzke, monitoring, tablice informacyjna lub inny niezrozumialy szczegol, chyba ze to rzeczywisty, istotny temat miejsca; podpis musi zgodnie opisywac kadr.
- Usuwaj z bazy, poprzez istniejace admin API, trwale odrzucone i niskiej jakosci zdjecia, lacznie z ich oryginalami, miniaturami i audio. Przed partia destrukcyjna utrwal maly dziennik decyzji, a potem zweryfikuj liczniki i covery. Nie tworz lokalnego backupu SQLite przy kazdej partii. Po zakonczeniu calej selekcji wykonaj jeden spojny backup SQLite i aktualnych mediow na Macu przez `scripts/backup_pi_to_mac.sh --apply` (transfer przez SSH/rsync), bez trwalej dodatkowej kopii na Pi. Nie tworz archiwum odrzuconych oryginalow tylko dla zwiekszania liczby assetow.
- W audycie porownuj fotograficzne kadry, opisy i fakty. Najpierw wybieraj najlepszy cover; nie wypelniaj galerii przypadkowymi detaliami ani niemal identycznymi kadrami.
- W wyniku audytu odnotowuj ile zdjec zostalo usunietych i dlaczego, osobno od liczby samych heurystycznych kandydatow.
- Nie uzywaj generowanych ikon, tapet, obrazow AI ani ilustracyjnych coverow jako substytutu realnych zdjec miejsca.

## Kolejnosc Pracy

1. Wybierz miasto i ustal jego jawny `city.id`, nazwe, `city.region`, srodek mapy, `default_zoom`, `sort_order` i status.
2. Utworz albo zaktualizuj manifest `content/cities/{city}/manifest.json`.
3. Dodaj miejsca do manifestu: stabilny `slug`, tytul, opis, `local_comment`, `article_blocks`, `category_ids`, wspolrzedne, wage i status.
4. Przed dopisaniem kazdego miejsca sprawdz, czy ten sam obiekt juz nie istnieje w manifiescie albo adminie. Szukaj po tytule, aliasach, adresie, wspolrzednych i charakterze miejsca.
5. Uruchom dry-run importera, potem backup, potem import `--apply`.
6. Dopiero po imporcie miejsc przygotuj liste zdjec dla kazdego `place`.
7. Pobierz tylko najlepsze pliki z legalnych zrodel, zapisz atrybucje i zrob selekcje jakosci.
8. Wgraj zdjecia przez adminowy photo pipeline, uzupelniajac autora, URL zrodla, nazwe licencji i URL licencji.
9. Zatwierdz zdjecia w moderacji, ustaw najlepszy cover i sprawdz publiczna mape oraz galerie miejsca.

## Dodawanie Miasta

Miasto dodawaj przez manifest, nie przez reczne klikanie duzej serii rekordow w adminie.

Minimalny szkic:

```json
{
  "city": {
    "id": "krakow",
    "name": "Kraków",
    "region": "Małopolskie",
    "lat": 50.0614,
    "lon": 19.9366,
    "default_zoom": 13,
    "sort_order": 20,
    "status": "active"
  },
  "places": [],
  "guides": []
}
```

`city.id` jest stabilnym kluczem importu. Nie zmieniaj go po imporcie bez migracji aktualnych danych. Nazwa miasta moze miec polskie znaki, ale `id` powinien byc prostym slugiem. `city.region` przechowuje wojewodztwo widoczne w publicznym wyborze miasta.

## Dodawanie Miejsc

Przed dodaniem miejsca wykonaj kontrole duplikatu:

- sprawdz aktualny manifest miasta,
- sprawdz adminowa liste miejsc,
- porownaj aliasy i tlumaczenia nazwy,
- porownaj wspolrzedne i adres,
- sprawdz, czy obiekt nie jest juz czescia wiekszego miejsca albo trasy.

Nie rozbijaj obiektu tylko po to, zeby zmiescic wiecej zdjec. Osobny `place` ma sens wtedy, gdy uzytkownik realnie traktuje go jako osobna atrakcje lub osobny przystanek. Przyklad: `Hala Stulecia` i `Fontanna Multimedialna i Pergola` moga byc osobnymi miejscami, bo sa roznymi doswiadczeniami w tej samej okolicy. `Rynek Wrocław`, `Wrocław Market Square` i `Ratusz na Rynku` nie powinny automatycznie stac sie trzema rekordami bez jasnej decyzji produktowej.

Kazde miejsce powinno miec:

- stabilny `slug`,
- zrozumialy tytul produktowy,
- krotki opis do kart i mapy,
- `local_comment` z realna wskazowka redakcyjna,
- kategorie z API/admina, nie wymyslone lokalnie,
- precyzyjne wspolrzedne punktu, ktory uzytkownik rozpozna na mapie,
- status `published` tylko wtedy, gdy miejsce ma sensowna tresc i material wizualny albo jest celowo gotowe do publikacji.

## Zrodla Zdjec

Nie traktuj Wikimedia Commons jako jedynego ani domyslnie najlepszego zrodla. Commons jest bardzo dobry licencyjnie i archiwalnie, ale wiele kadrow jest dokumentacyjnych. Dla kazdego miejsca najpierw zbierz kandydatow z kilku zrodel, porownaj kadr i dopiero potem importuj najlepsze pliki.

Minimalny research przed importem miejsca:

- sprawdz co najmniej 3 rozne zrodla albo typy zrodel,
- zapisz kandydatow z rozmiarem, autorem, licencja i linkiem do oryginalnej strony pliku,
- wybierz zdjecia po jakosci kadru, roli w galerii i realnej wartosci dla miejsca, nie po kolejnosci wynikow API,
- odrzuc kandydatow, ktorzy powtarzaja ten sam punkt widzenia, te sama fasade, ten sam sezon i ten sam typ kadru,
- nie dobijaj licznika zdjeciami slabymi, tylko dlatego, ze sa latwe do pobrania,
- jesli dobre zrodlo wymaga API key albo ma limit, uzyj go zgodnie z zasadami zrodla zamiast obchodzic limit scrapingiem.

### Priorytet Zrodel

1. **Zrodla z wolnymi licencjami i konkretnymi stronami pliku**
   - Wikimedia Commons: https://commons.wikimedia.org/
   - Flickr Creative Commons: https://www.flickr.com/creativecommons/
   - Flickr Commons: https://www.flickr.com/commons
   - Openverse jako wyszukiwarka: https://openverse.org/

2. **Wysokiej jakosci stocki i biblioteki autorskie**
   - Pexels: https://www.pexels.com/license/
   - Unsplash: https://unsplash.com/license
   - Pixabay: https://pixabay.com/service/license-summary/
   - StockSnap: https://stocksnap.io/license

3. **Archiwa, dziedzictwo i public domain**
   - Europeana: https://www.europeana.eu/
   - Library of Congress Free to Use and Reuse: https://www.loc.gov/free-to-use/
   - NYPL Digital Collections Public Domain: https://www.nypl.org/research/collections/digital-collections/public-domain
   - Polona / Biblioteka Narodowa: https://polona.pl/
   - Szukaj w Archiwach / NAC: https://www.szukajwarchiwach.gov.pl/

4. **Lokalne i instytucjonalne zrodla**
   - miejskie biblioteki mediow,
   - portale open data,
   - muzea, zamki, parki narodowe, instytucje kultury,
   - oficjalne media kits obiektow.

   Uzywaj ich tylko wtedy, gdy strona konkretnego pliku lub materialu podaje jasne prawo ponownego uzycia, autora, zrodlo i licencje albo status public domain.

### Zasady Dla Poszczegolnych Zrodel

- **Wikimedia Commons** - korzystaj z oryginalnej strony pliku, autora, licencji i URL licencji. Respektuj `429`, `Retry-After` i polityke robotow. Jesli pojawia sie `robot policy`, zatrzymaj serie, zrob cooldown i przejdz do pojedynczych plikow albo innych zrodel; nie ponawiaj agresywnie pobierania. Nie rotuj adresow IP ani user-agentow, zeby obejsc limit zrodla. Jesli oryginal jest chwilowo blokowany, mozna pobrac oficjalny wariant preview tylko wtedy, gdy ma wystarczajaca rozdzielczosc i zapisujesz ten sam stabilny URL strony pliku oraz licencje. Przy bezposrednich URL-ach thumbnail uzywaj tylko standardowych rozmiarow Wikimedia, np. `500px`, `1920px` albo `3840px`; niestandardowe rozmiary moga zwracac blad. Nie traktuj Commons jako automatycznego wypelniacza galerii.
- **Openverse** - sluzy do wyszukiwania i porownywania zrodel, nie jako samodzielne zrodlo praw. API Openverse moze wymagac uwierzytelnienia tokenem; jesli zwraca `401`, nie ponawiaj anonimowych requestow w petli, tylko uzyj poprawnych credentials, webowego UI albo przejdz do innych zrodel. Po znalezieniu kandydata zawsze przejdz do oryginalnej strony pliku, sprawdz licencje tam i dopiero z niej przepisz atrybucje.
- **Flickr CC** - uzywaj tylko zdjec z licencjami pozwalajacymi na uzycie komercyjne i modyfikacje: CC0, Public Domain Mark, CC BY, CC BY-SA. Odrzucaj NC, ND i `All rights reserved`. Zapisuj URL strony Flickr konkretnego zdjecia, autora, nazwe licencji i URL licencji. Preferuj najwiekszy dostepny rozmiar.
- **Flickr Commons** - traktuj jako dobre zrodlo historyczne i instytucjonalne, ale nadal sprawdz prawa na stronie konkretnego zdjecia. Przy statusie `no known copyright restrictions` zapisz instytucje jako autora/zrodlo, a jako licencje zapisz dokladny status praw podany przez Flickr lub instytucje.
- **Pexels** - licencja pozwala uzywac zdjec bez oplat i bez obowiazkowej atrybucji, ale PhotoMap i tak zapisuje autora i URL zdjecia. API wymaga linku do Pexels i zaleca kredyt fotografa; nie kopiuj funkcji stockowej biblioteki i nie pobieraj masowo. Uzywaj tylko zdjec, ktore realnie przedstawiaja konkretne miejsce, nie ogolny klimat miasta.
- **Unsplash** - licencja pozwala pobierac i uzywac zdjec, ale integracje API maja wlasne zasady: wymagaja klucza, hotlinkowania URL-i zwroconych przez API i/lub rejestrowania downloadu. Dla aktualnego pipeline'u z lokalnym storage uzywaj Unsplash tylko po sprawdzeniu konkretnej strony zdjecia i zapisaniu autora oraz URL, albo po zbudowaniu zgodnej integracji API. Jesli oficjalny link download zwraca `403`, nie obchodz go przez kopiowanie CDN URL z podgladu; pomin zdjecie albo wroc po poprawnej integracji API. Nie scrapuj masowo wynikow.
- **Pixabay** - Content License pozwala uzywac materialow bez obowiazkowej atrybucji, ale zabrania samodzielnej dystrybucji niezmienionych plikow jako stocku i wymaga uwagi przy znakach towarowych/ludziach. API wymaga klucza, cache wynikow przez 24h, szanowania limitow i zakazuje systematycznych masowych pobran. Do stalego uzycia pobieraj plik na serwer i zapisuj `pageURL`, autora oraz licencje.
- **StockSnap** - zdjecia sa CC0, ale nadal zapisuj autora i URL strony zdjecia, jesli sa dostepne. Uzywaj tylko wtedy, gdy zdjecie przedstawia konkretne miejsce; nie importuj neutralnych tapet jako materialu miejsca.
- **Europeana** - metadane sa czesto CC0, ale prawa do obrazu wynikaja z pola praw konkretnego obiektu i strony instytucji. Importuj tylko obiekty z prawami pozwalajacymi na reuse, np. CC0, Public Domain Mark, public domain, CC BY albo CC BY-SA.
- **Polona, NAC, Szukaj w Archiwach, LOC, NYPL** - dobre glownie dla materialow historycznych. Kazdy rekord musi miec jawny status praw lub domeny publicznej. Jesli rekord ma status ograniczony, nieustalony albo brak jasnego prawa ponownego uzycia, pomin go.

Preferowane licencje i statusy: CC0, Public Domain Mark, public domain, CC BY i CC BY-SA. Nie uzywaj materialow z ograniczeniem NC lub ND bez wyraznej decyzji, bo PhotoMap moze byc produktem komercyjnym, a pipeline tworzy publiczne kopie i miniatury. Nie uzywaj zdjec z Google Images, Pinteresta, Instagrama, Facebooka, Tripadvisor, blogow, prasy, stron z tapetami ani cudzych galerii bez jednoznacznej licencji przy konkretnym pliku.

### Workflow Wielozrodlowy

Przed importem serii dla miejsca wykonaj taki proces:

1. Zbuduj liste zapytan dla miejsca: polska nazwa, nazwa bez znakow diakrytycznych, nazwa angielska/niemiecka/czeska, nazwa historyczna, nazwa obiektu nadrzednego i lokalizacja.
2. Pobierz kandydatow z kilku zrodel rownolegle, ale tylko metadane i miniatury do oceny. Nie pobieraj od razu pelnych plikow.
3. Zrob arkusz kandydatow albo inny szybki przeglad miniatur z podpisem zrodla, autora, licencji i wymiarow.
4. Ocen kadr: kompozycja, rozpoznawalnosc miejsca, swiatlo, brak watermarkow, brak przypadkowego balaganu, wartosc jako miniatura mapy i to, czy zdjecie pokazuje cos, czego nie pokazuja juz inni kandydaci.
5. Pogrupuj podobne ujecia: ten sam punkt widzenia, ten sam obiekt w centrum, podobna ogniskowa, podobna pora dnia, podobny sezon. Z kazdej grupy wybierz najwyzej jeden plik, chyba ze drugi pokazuje wyraznie inny detal, wnetrze, kontekst albo moment.
6. Wybierz najlepsze zdjecia z calej puli, mieszajac zrodla i role wizualne. Nie wybieraj siedmiu zdjec z jednego portalu tylko dlatego, ze API odpowiedzialo pierwsze.
7. Dopiero po selekcji pobierz pelne pliki i importuj przez backendowy media pipeline.
8. Jesli portal zwraca limit, przejdz do kolejnego zrodla albo poczekaj zgodnie z `Retry-After`; nie obchodz limitow agresywnym retry, rotacja IP ani podszywaniem sie pod inne klienty. Jesli limit dotyczy samych miniatur do arkusza selekcji, zmniejsz partie kandydatow albo sprawdz pojedyncze pliki. Nie importuj zdjec, ktorych kadru nie udalo sie obejrzec.

## Karta Kandydata Zdjecia

Przed uploadem dla kazdego zdjecia zapisz roboczo:

```txt
place_slug:
source_name:
source_file_url:
download_url:
author:
license_name:
license_url:
source_file_id:
original_width:
original_height:
caption:
description:
reason_to_use:
visual_role:
uniqueness_note:
place_value_note:
```

`source_file_id` moze byc identyfikatorem pliku Wikimedia, Flickr photo id, Europeana item id, slugiem strony zrodla albo innym stabilnym identyfikatorem. Pomaga wykryc, ze ten sam plik wraca z kilku agregatorow.

`visual_role` opisuje funkcje zdjecia w galerii, np. `cover`, `wide_context`, `detail`, `interior`, `street_context`, `night`, `seasonal`, `historical`, `activity`. `uniqueness_note` ma krotko wyjasniac, czym kadr rozni sie od pozostalych wybranych zdjec. `place_value_note` ma odpowiadac na pytanie, jaka realna wartosc miejsca zdjecie pokazuje: skale, material, atmosfere, funkcje, historie, polozenie, rytm ulicy, widok z trasy albo detal, ktory pomaga uzytkownikowi zrozumiec, po co tam isc.

## Selekcja Jakosci

Dla coverow preferuj oryginalne pliki o dlugim boku co najmniej 2000 px. Dla zdjec wspierajacych preferuj co najmniej 1600 px. Slabszy plik moze zostac tylko wtedy, gdy jest unikalny, historycznie wazny albo pokazuje miejsce lepiej niz wszystkie inne legalne zrodla.

Odrzucaj:

- rozmazane, poruszone albo sztucznie wyostrzone zdjecia,
- agresywne HDR, filtry, watermarki, ramki i podpisy w obrazie,
- nudne kadry katalogowe bez punktu zainteresowania,
- kadry z przypadkowym balaganem zaslaniajacym miejsce,
- zdjecia z niepewna licencja albo bez autora,
- wiele ujec z tego samego miejsca, obiektywu, pory dnia i kompozycji.

Dobra galeria miejsca powinna miec zroznicowanie:

- jeden mocny cover, ktory czyta sie jako miniatura na mapie,
- szeroki kadr pokazujacy kontekst,
- blizszy detal albo fakture miejsca,
- inna pora dnia lub inne swiatlo,
- ujecie z ruchem ludzi, jesli nie narusza prywatnosci i licencja na to pozwala,
- ujecie sezonowe, nocne albo artystyczne, jesli dodaje charakteru zamiast robic pocztowkowy szum.

Zdjecie ma realna wartosc dla miejsca, gdy pokazuje przynajmniej jedna rzecz, ktorej uzytkownik nie dostaje juz z innych zdjec w galerii:

- rozpoznawalny widok, ktory pomaga od razu zidentyfikowac miejsce,
- skale obiektu albo jego relacje z ulica, parkiem, rzeka lub krajobrazem,
- detal architektoniczny, przyrodniczy, historyczny albo uzytkowy,
- wnetrze, wejscie, dziedziniec, punkt widokowy albo trase dojscia,
- atmosfere wynikajaca z pory dnia, sezonu, wydarzenia lub aktywnosci ludzi,
- material historyczny pokazujacy zmiane miejsca, jesli jest czytelny i prawnie pewny.

Nie importuj zdjecia, jesli jego jedyna zaleta to poprawna ostrosc albo wysoka rozdzielczosc. Technicznie dobre, ale neutralne ujecie nie wystarcza, gdy nie wnosi nowej informacji, emocji ani rozpoznawalnego kadru.

## Deduplikacja Zdjec

Przed uploadem porownaj:

- URL zrodla i `source_file_id`,
- autora i tytul pliku,
- rozmiar oraz proporcje obrazu,
- wizualnie podobne kadry w tej samej galerii,
- czy identyczne zdjecie nie jest juz przy innym miejscu.

Jesli ten sam plik jest dostepny w kilku miejscach, wybierz strone z najlepsza atrybucja i najwyzsza jakoscia oryginalu. Nie uploaduj kopii tego samego kadru tylko dlatego, ze pochodzi z innego agregatora.

Przy deduplikacji traktuj jako powtorzenie nie tylko identyczny plik, ale tez prawie ten sam kadr: ta sama fasada z tej samej strony, podobny zoom, podobne swiatlo i brak nowego elementu opowiesci. Jesli dwa zdjecia konkuruja o te sama role w galerii, zostaw jedno lepsze i szukaj brakujacej roli gdzie indziej.

## Upload I Moderacja

Aktualnie zdjecia redakcyjne ida przez adminowy photo pipeline. Manifest miasta nie pobiera internetu i nie importuje plikow mediow.

Uploaduj do istniejacego `place` przez admin UI albo endpoint:

```txt
POST /api/admin/places/{place_id}/photos
```

Uzupelnij pola:

- `caption` - krotki podpis zdjecia widoczny przy miniaturach i w metadanych,
- `description_blocks` - opcjonalna lista blokow dluzszego opisu/narracji zdjecia przygotowana pod tekst na ekranie i TTS,
- `attribution_author`,
- `attribution_source_url`,
- `attribution_license`,
- `attribution_license_url`.

Styl opisow TTS trzymaj wedlug [`docs/create_tts.md`](create_tts.md): edutainment turystyczny, krotkie wejscie ze zdjecia i jedna ciekawostka, anegdota albo historyczny zwrot akcji. Nie zapisuj atrybucji, licencji ani niezweryfikowanych faktow w `description_blocks`.

Po uploadzie zdjecie ma status `pending`, pozostaje w private storage i nie ma jeszcze `public_path`, `thumb_path` ani publicznego audio. Adminowy payload zwraca chronione sciezki `admin_public_path`, `admin_thumb_path` i opcjonalne `admin_audio`; nigdy nie ujawnia prywatnej sciezki oryginalu. Dopiero zatwierdzenie tworzy publiczna kopie, miniaturę i opcjonalne publiczne audio. Odrzucenie usuwa publiczne pochodne i zeruje ich sciezki. Cover miejsca ustawiaj na najczytelniejsze zatwierdzone zdjecie w malej miniaturze, niekoniecznie najbardziej artystyczne w pelnym rozmiarze.

Do korekt konkretnego miejsca uzywaj panelu zdjec miejsca albo `GET /api/admin/places/{place_id}/photos`, bo zwraca pelna liste zdjec tego miejsca. `GET /api/admin/photos` jest paginowana kolejka moderacji i nie moze sluzyc jako zrodlo prawdy dla galerii pojedynczego miejsca.

## Weryfikacja Serii

Po wiekszej serii:

```bash
./scripts/backup_local_data.sh --apply
backend/.venv/bin/python scripts/content/import_city.py --dry-run content/cities/{city}/manifest.json
backend/.venv/bin/python scripts/content/import_city.py --apply content/cities/{city}/manifest.json
python3 scripts/diagnose_local_data.py
```

Nastepnie sprawdz publicznie:

- `/api/places/map?city_id={city}`,
- `/api/places/{place_id_or_slug}/photos`,
- publiczna mape miasta,
- galerie miejsc z najwieksza liczba zdjec,
- czy rozwiniety wachlarz miejsca pokazuje wszystkie zatwierdzone zdjecia.

Seria jest gotowa dopiero wtedy, gdy mapa od razu wyglada wizualnie, galerie sa roznorodne, a kazdy plik ma kompletna atrybucje.
