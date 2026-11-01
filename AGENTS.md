# AGENTS.md - PhotoMap

## Local Agent - repository workflow

This repository is registered in the shared `MichalMatu/local-agent` multi-repository supervisor. Read the live daemon version, revision and execution model from `.agent/status/daemon.json` on `agent-control`; do not hard-code a Local Agent release number in this repository.

Repository identity:

- repository: `MichalMatu/photomap`
- local-agent repository id: `photomap`
- control branch: `agent-control`
- default source branch: `main`
- execution model: one shared bounded-parallel supervisor, with at most one task per repository and up to four independent repositories executing concurrently
- agent_binding: `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`

Every task must include this exact `agent_binding` and explicit `resources: []` for repository-scoped project work. Use a unique immutable task id and bounded command/task timeouts. Never invoke or delegate to local Codex from a task; ChatGPT plans and Local Agent executes deterministic commands. The registry binding, control binding and task binding must match before execution.

### New chat bootstrap

When starting work on PhotoMap in a new chat/session:

1. Read this `AGENTS.md` and the current `README.md` before proposing or executing changes.
2. Inspect the current GitHub state and the branch relevant to the requested work. Do not assume remembered conversation state is current.
3. Use this repository's own `agent-control` branch for Local Agent tasks. Never send PhotoMap tasks through LiteGraph, Growbox, or another repository's control branch.
4. Submit task requests under `.agent/tasks/<task-id>.json` on `agent-control`.
5. Follow execution through `.agent/runs/<task-id>.json` and `.agent/status/daemon.json`.
6. Read the terminal result from `.agent/results/<task-id>.json` before reporting completion.
7. Prefer repository status/results from GitHub over asking the user to copy local terminal logs when Local Agent can provide the state directly.
8. Keep repository workspaces isolated. A PhotoMap task must not read, modify, checkpoint, or publish results through another repository's Local Agent workspace.
9. `agent-control` is a control plane, not a development branch. Product/source changes belong on the explicitly requested source/work branch.

The canonical Local Agent implementation and operational documentation live in `MichalMatu/local-agent`. If the control protocol changes, update this bootstrap section so future chats do not depend on remembered conversation context.

For substantial coding tasks, prefer `workflow_policy: "efficient-verification-v1"` with explicit `work` / `focused` stages and exactly one final `full` verification stage. Task payloads are immutable: a claimed or interrupted task is not replayed automatically, so changed work or an intentional retry must use a new unique task id. A successful local task proves execution and verification; source publication remains an explicit final step.

## Cel projektu

PhotoMap to globalny produkt: wizualna mapa miejsc z klimatem. Uzytkownik ma wejsc na mape miasta i od razu zobaczyc atrakcyjna tablice miniaturek miejsc: zdjecia, covery, pamiatki ludzi i proste trasy/kolekcje.

Wroclaw jest pierwszym miastem startowym i datasetem do strojenia produktu. Nie jest marka produktu ani ograniczeniem domeny. Techniczne nazwy repozytorium albo pakietow moga zostac, jesli ich zmiana nie wnosi realnej wartosci, ale w UI, konfiguracji domyslnej, tytulach stron i dokumentacji produktowej uzywamy nazwy PhotoMap.

PhotoMap jest samodzielnym produktem. Kod i dokumentacja w repozytorium maja dotyczyc aktualnej domeny PhotoMap; nie dodawaj katalogow referencyjnych ani materialow z dawnych projektow.

## Aktualny Zakres

Aktualny rdzen produktu to publiczna mapa Wroclawia, miejsca, kategorie, zdjecia, covery, pamiatki, proste trasy/kolekcje, zgloszenia jakosci, admin do korekt/moderacji oraz content pipeline. Nowa praca ma wzmacniac ten rdzen albo naprawiac jego kontrakty.

W zakresie sa:

- stabilizacja publicznej mapy i jej lekkiego kontraktu,
- zgodnosc backendowych schematow, serializerow, frontendowego klienta API i typow,
- prywatnosc mediow oraz rozdzial publicznych i adminowych payloadow,
- jakosc admina jako narzedzia korekt, moderacji i pojedynczych zmian,
- import danych przez manifesty i idempotentny content pipeline,
- testy, diagnostyka i dokumentacja kontraktow, ktore chronia aktualne zachowanie.

Poza zakresem bez wyraznej decyzji uzytkownika sa konta, platnosci, audio, pieczatki, ML, scraping, rozbudowane SEO, nowe miasta jako rollout, duzy redesign, nowe moduly "na przyszlosc" i funkcje, ktore nie poprawiaja obecnego rdzenia.

## Rdzen Domeny

Centralnym bytem systemu jest `place`.

Wszystko inne jest warstwa przypieta do miejsca albo kolekcja miejsc:

```txt
place
 ├── category
 ├── photos
 ├── memories
 ├── guides / collections
 ├── reports
 └── future layers      zamrozone poza aktualnym etapem
```

Nie tworz osobnych swiatow dla zdjec, pamiatek, tras, audio, historii ani pieczatek. `City` jest kontekstem organizacyjnym, `Category` opisuje charakter miejsca, a `Photo`, `Memory`, `Guide/Route` i `Report` sa przypiete do miejsca albo kolekcji miejsc. Przyszle warstwy nie sa aktywnym zakresem.

Techniczne `guide` moze zostac w backendzie i API. Produktowo w UI i dokumentacji preferuj `trasa` albo `kolekcja miejsc`, zaleznie od kontekstu.

## Mapa Publiczna

Publiczna mapa jest glownym produktem i ma dzialac jak zywa tablica miniaturek miejsc, nie jak pusta mapa z pinami.

- Pierwszy widok ma od razu pokazywac atrakcyjne miniatury miejsc albo klastry miniaturek.
- Publiczne markery domyslnie sa coverami/miniaturami miejsc. Opcjonalny publiczny tryb pinezek pokazuje wszystkie miejsca z aktualnego viewportu po filtrach kategorii/warstw, takze bez zdjec, bez ograniczen gestosci ani rankingu kafli; domyslny tryb miniaturek zachowuje swoje limity i ochrone przed kolizjami.
- Klikniecie miejsca pokazuje wiecej, ale nie moze byc wymagane, zeby mapa robila efekt wizualny.
- Rozwiniety wachlarz/galeria miejsca po kliknieciu ma pokazywac wszystkie zatwierdzone zdjecia miejsca dostepne w publicznej galerii, a nie tylko `map preview`. Nie optymalizuj tego przez limit liczby kafli ani przez redukcje do `preview_items`; problemy wydajnosciowe rozwiazuj przez lekkie miniatury, cache, layout i preload, bez zmniejszania kompletnego wachlarza.
- Zoom steruje gestoscia i rozmiarem miniaturek: daleko mniej elementow i klastry, blisko wiecej miejsc oraz galerie podgladow ulozone bez nachodzenia kafli. Ograniczenia miniaturek nie ograniczaja liczby pinezek w opcjonalnym trybie pinezek.
- Warstwy mapy sa sposobem ogladania danych. Aktualny rdzen to polecane, miejsca i pamiatki; kolekcje/trasy moga byc osobnym widokiem albo warstwa dopiero po wprowadzeniu jawnego kontraktu API i testow.
- Kategorie pochodza z admina/API; nie hardkoduj kategorii w filtrach UI. Techniczna allowlista wspieranych ikon UI jest dopuszczalna, ale nie moze zastapic danych kategorii z API.
- Kontekst miasta dla publicznej mapy ma byc jawny w API albo UI, gdy produkt obsluguje wiecej niz jedno miasto. Nie buduj nowych przeplywow, ktore wyprowadzaja miasto z przypadkowego pierwszego miejsca w odpowiedzi.
- `map preview` ma pozostac lekkim kontraktem: miejsce, miasto, kategorie, score/liczniki, cover i kilka kuratorowanych podgladow.
- Nie laduj pelnych galerii ani pelnych pamiatek do pierwszego renderu mapy.
- Optymalizacja kontraktu mapy nie moze zamienic pierwszego widoku w pusta mape bez miniaturek.

## Tresc I Import

Admin sluzy do korekt, moderacji i pojedynczych zmian. Wieksze partie danych i kolejne miasta prowadzi content pipeline:

- manifesty w `content/cities/{city}/manifest.json`,
- backup przez `scripts/backup_local_data.sh`,
- import przez `scripts/content/import_city.py`.

Szczegoly workflow sa w [docs/content-pipeline.md](docs/content-pipeline.md) i [content/AGENTS.md](content/AGENTS.md).
Workflow pozyskiwania, selekcji, deduplikacji i uploadu zdjec redakcyjnych jest w [docs/editorial-media-workflow.md](docs/editorial-media-workflow.md).

## Zrodla Zdjec Redakcyjnych

Przy szukaniu redakcyjnych zdjec miejsc zaczynaj od zrodel z jasna licencja i mozliwoscia zapisania atrybucji przy konkretnym pliku:

- Wikimedia Commons: https://commons.wikimedia.org/
- Pexels: https://www.pexels.com/
- Unsplash: https://unsplash.com/
- Pixabay: https://pixabay.com/service/license-summary/
- StockSnap: https://stocksnap.io/license
- Openverse: https://openverse.org/
- Flickr Creative Commons: https://www.flickr.com/creativecommons/
- Flickr Commons: https://www.flickr.com/commons
- Europeana: https://www.europeana.eu/
- Library of Congress Free to Use and Reuse: https://www.loc.gov/free-to-use/
- NYPL Digital Collections Public Domain: https://www.nypl.org/research/collections/digital-collections/public-domain
- lokalne portale open data, miejskie biblioteki mediow, muzea i instytucje kultury tylko wtedy, gdy strona konkretnego pliku podaje jasne prawo ponownego uzycia.

Przed importem konkretnego zdjecia sprawdz aktualna licencje zrodla i zapisz autora, URL zrodla, nazwe licencji oraz URL licencji w polach atrybucji. Openverse traktuj jako wyszukiwarke i zawsze przechodz do oryginalnej strony pliku. Nie importuj zdjec bez pewnego prawa uzycia, bez stabilnego linku zrodlowego albo bez realnej wartosci wizualnej dla miejsca. Preferuj CC0, Public Domain Mark, public domain, CC BY i CC BY-SA; nie uzywaj materialow NC ani ND bez wyraznej decyzji. Przy zdjeciach stockowych przestrzegaj aktualnych warunkow serwisu i nie buduj galerii z masowo pobranych, powtarzalnych ujec.

## Jakosc Kodu

Domyslnie nie utrzymuj kompatybilnosci wstecznej dla wewnetrznych kontraktow. Jesli zmienia sie model, endpoint, pole requestu, konfiguracja, flaga albo komponent, w tej samej zmianie migruj aktualnych callerow i usun stare wejscia, fallbacki, adaptery, komentarze oraz martwe sciezki. Wyjatek tylko wtedy, gdy uzytkownik wyraznie poprosi o okres przejsciowy albo migracje danych produkcyjnych.

Kod ma byc prosty, modulowy i separowany wedlug odpowiedzialnosci:

- nie tworz zbednych warstw abstrakcji, wrapperow ani konfiguracji na pozniej,
- nie dopuszczaj do `god objectow`; rozbij plik, komponent, route albo serwis, jesli zaczyna obslugiwac kilka niezaleznych odpowiedzialnosci,
- logika domenowa nie powinna mieszkac w UI ani w route'ach, jesli nalezy do serwisu, helpera albo modelu,
- publiczny UI/API i admin UI/API trzymaj jako osobne przeplywy,
- zaleznosci dodawaj tylko wtedy, gdy rozwiazuja realny problem lepiej niz prosty kod lokalny,
- nie trzymaj martwych pol, stalych, typow, endpointow ani CSS po usunietych funkcjach.

Kontrakty API maja byc jawne i spiete po obu stronach:

- backendowe schematy i serializery sa zrodlem prawdy dla ksztaltu requestow i response'ow,
- frontendowe typy i klient w `frontend/src/api` musza odpowiadac aktualnemu backendowi,
- publiczne i adminowe DTO rozdzielaj, jesli maja rozne pola albo widocznosc danych,
- nie lacz roznych kontraktow jednym typem przez opcjonalne pola tylko po to, zeby uciszyc TypeScript,
- statusy, role i typy widoczne w API modeluj jako jawne unie/enumy w schematach, zeby OpenAPI i frontend nie zgadywaly dopuszczalnych wartosci,
- zmiana endpointu wymaga migracji aktualnych callerow, testu kontraktu albo helpera oraz usuniecia starych wejsc,
- dokumentacja kontraktu ma byc aktualizowana w tej samej zmianie, jesli zmienia sie zachowanie publiczne, adminowe, importowe albo storage.

## Wzorce Projektowe

Stosuj te wzorce jako domyslne kierunki implementacji:

- `place-centered domain`: nowe dane i akcje przypinaj do `place`, miasta albo kolekcji miejsc; osobny byt wprowadzaj tylko wtedy, gdy ma realna odpowiedzialnosc domenowa.
- `contract-first repair`: przy rozjezdzie front/back znajdz backendowy model, schema, serializer, endpoint, frontendowy typ, klienta API, komponent i test; napraw caly lancuch w jednym domknietym etapie.
- `thin route, service, serializer`: route FastAPI przyjmuje request i sklada odpowiedz, serwis trzyma logike domenowa/skutki uboczne, serializer mapuje model na jawny response.
- `public/admin split`: publiczne API/UI i admin API/UI moga wspoldzielic modele oraz serwisy, ale maja osobne payloady, DTO, uprawnienia i widocznosc pol.
- `light map preview`: pierwszy render mapy uzywa lekkiego kontraktu z coverem i kilkoma podgladami; pelne galerie, pelne pamiatki i edycja ida przez osobne przeplywy.
- `city-aware flow`: gdy przeplyw dotyczy miasta, przekazuj jawny kontekst miasta przez API/UI; nie opieraj zachowania na kolejnosci rekordow albo aktualnym dummy datasecie.
- `content pipeline first`: wieksze partie danych, kolejne miasta i redakcyjne assety przechodza przez manifest, importer i testy idempotencji; admin sluzy do korekt i moderacji.
- `photo original + thumb, memory derivative`: redakcyjne `Photo` zachowuje jeden kanoniczny oryginal w private storage; po zatwierdzeniu publiczny endpoint obrazu serwuje dokladnie ten plik, a fizycznie generowana jest tylko miniatura. `Memory` zachowuje osobny prywatny oryginal, publiczna pochodna i miniatura. Publiczne serializery nigdy nie ujawniaja prywatnych sciezek storage. Po retencji odrzuconego `Photo` albo `Memory` pole `original_path` moze byc `NULL`; dla `pending` i `approved` brak oryginalu jest bledem kontraktu.
- `source-quality media`: zdjecia i pamiatki sa podstawowym materialem produktu, wiec zachowuj najwyzsza dostepna jakosc. Kanoniczny oryginal redakcyjnego `Photo` pozostaje bez zmian i nie jest zastepowany pochodna; skalowanie jest dopuszczalne tylko dla osobnych miniaturek i lekkich preview. Publiczna pochodna `Memory` nie moze byc sztucznie downsizowana ani agresywnie kompresowana. Limity rozmiaru pliku/pikseli sa wysokimi bezpiecznikami, nie limitem jakosci materialow.
- `tested helper`: logike filtrow, warstw mapy, selekcji miejsc, uploadu, grupowania mediow i stanu formularzy trzymaj w helperach/hookach z testami, nie w przypadkowym JSX.
- `explicit component mode`: komponent z kilkoma wariantami ma jawny tryb, np. `form-only`, `with-list`, `readonly`, zamiast zestawu luznych flag boolean.
- `tokenized UI`: nowe style opieraj na tokenach i klasach bazowych UI; lokalny CSS ma dodawac layout albo stan, nie powielac systemu wizualnego.
- `commercial finish`: przeplyw ma miec sensowne loading, empty, error i success states, realistyczne nazewnictwo PhotoMap oraz brak widocznych tymczasowych obejsc.

## Antywzorce

Traktuj te sygnaly jako problemy do usuniecia albo zatrzymania przed implementacja:

- osobny "swiat" dla zdjec, pamiatek, tras, audio, historii, pieczatek albo innych warstw poza `place` i kolekcja miejsc,
- publiczna mapa jako pusta mapa z pinami, bez miniaturek, coverow albo wizualnych klastrow w pierwszym widoku,
- generowanie albo import ikonograficznych coverow miejsc zamiast korzystania z zatwierdzonych zdjec i pamiatek,
- sztuczne downsizowanie albo agresywna kompresja publicznych zdjec/pamiatek poza osobnymi miniaturami i lekkimi preview,
- pobieranie pelnych galerii lub pelnych pamiatek tylko po to, zeby wyrenderowac pierwszy/bazowy widok mapy; nie dotyczy to rozwinietego wachlarza miejsca po kliknieciu, ktory ma pokazac pelna publiczna galerie zdjec,
- hardkodowanie kategorii, miast albo contentu produktu w UI zamiast pobierania ich z API albo manifestu,
- wyprowadzanie kontraktu z przypadkowego stanu danych, np. miasta z pierwszego miejsca w odpowiedzi,
- kontrakt API opisany luznym `str`, gdy system ma zamkniety zestaw statusow, rol albo typow,
- jeden typ frontendu obslugujacy publiczne i adminowe response'y przez opcjonalne pola,
- route z logika review, storage, licznikow, usuwania zaleznosci albo walidacji domenowej, ktora powinna byc w serwisie,
- komponent laczacy formularz, liste, szczegoly, moderacje i akcje masowe bez jawnych trybow albo rozbicia odpowiedzialnosci,
- modal lub sheet pokazujacy dane niezwiazane z wykonywana akcja,
- plywajacy przycisk menu albo inna kontrolka, ktora nie jest wizualnie wycentrowana w swoim hit area, focus ringu albo kontenerze nawigacji,
- rezerwowanie pustego gornego pasa tylko po to, zeby kontrolka overlay nie nachodzila na content; kontrolki overlay maja dzielic pierwszy rzad albo nakladac sie swiadomie, bez tworzenia pustych obszarow,
- fallback, adapter, stary endpoint albo stare pole zostawione po migracji wewnetrznego kontraktu,
- nazwy, defaulty, tytuly albo komunikaty sugerujace dawny produkt zamiast PhotoMap,
- nowa duza funkcja produktowa dodana w trakcie stabilizacji kontraktow bez osobnej decyzji,
- dokumentacja, TODO albo roadmapa konkurujaca z `docs/product-direction.md`.

## Jakosc UI

UI ma byc kompaktowy, spojny i minimalistyczny. Nie duplikuj tytulow, opisow, licznikow ani etykiet, jesli ta sama informacja jest juz widoczna w aktywnej karcie, filtrze, naglowku albo bezposrednim kontekscie.

- Wykorzystuj miejsce layoutem, zamiast rozpychac strone dodatkowymi naglowkami i opisami.
- Usuwaj lokalne naglowki sekcji, jesli tylko powtarzaja nazwe wybranej zakladki albo karty.
- Liczniki pokazuj w jednym sensownym miejscu.
- Tekst pomocniczy trzymaj krotko i blisko kontrolki.
- Formularze i modale projektuj mozliwie nisko i wasko, bez pustych obszarow i niepotrzebnych blokow tekstu.
- Modal albo sheet akcji pokazuje tylko dane potrzebne do tej akcji.
- Formularz dodawania nie powinien automatycznie pokazywac listy istniejacych rekordow.
- Jesli komponent ma kilka wariantow, nazwij tryb w API komponentu, np. `form-only`, `with-list`, `readonly`, zamiast dodawac luzne flagi boolean.

## Prywatnosc Mediow

Dla redakcyjnych `Photo` oryginal trafia do private storage i pozostaje kanonicznym, niemodyfikowanym plikiem; po zatwierdzeniu publiczny endpoint obrazu serwuje jego bajty bez tworzenia pelnej kopii, a `/media/...` przechowuje tylko miniatury i inne jawne pochodne. Dla `Memory` pozostaje model private original + public derivative + thumb. Publiczne API nigdy nie ujawnia prywatnych sciezek i pokazuje tylko zatwierdzone tresci.

Lokalne paczki research w `research-exports/` są domyślnie tekstowym eksportem opisów miejsca, bez prywatnych oryginałów zdjęć, EXIF i lokalnych ścieżek storage. Struktura katalogów ma zostać czytelna: `miejsca/{place-slug}.zip` dla pojedynczego miejsca, `miasta/{city-slug}.zip` dla zbiorczej paczki miasta oraz `wszystkie/wszystkie.zip` dla zbiorczej paczki wszystkich miejsc. Paczki zawierają `tts-guidelines.md` z aktualnym standardem `docs/create_tts.md`, żeby audyt traktował `description_blocks` jako tekst widoczny i materiał do TTS. Zbiorcze paczki mają jeden wspólny `PROMPT.md` i `tts-guidelines.md` w głównym katalogu ZIP oraz osobne katalogi miejsc w środku. Każdy eksport odświeża też `research-exports/prompt.txt` z krótką instrukcją do skopiowania do czatu razem z ZIP-em. Wynik audytu ma być wklejony bezpośrednio w czacie, bez linków i plików do pobrania. Te paczki są lokalnym narzędziem redakcyjnym, nie publicznym payloadem ani materiałem do commita; katalog `research-exports/` ma pozostać ignorowany przez Git.

## Spojnosc Domeny

Nie wprowadzaj nazw, modeli, endpointow, komponentow ani dokumentacji spoza aktualnej domeny PhotoMap. Jesli trafisz na pozostalosci dawnych domen produktowych, usun je albo przemigruj do jezyka `place`, miasta, kategorii, zdjec, pamiatek, tras/kolekcji i zgloszen.

Nie uzywaj w nowym kodzie, API, UI, modelach, komponentach ani nazwach plikow:

```txt
wreck
wrecks
vehicle
candidate
scan
YOLO
field_photo
report_package
savedWreck
```

Wyjatek dotyczy tylko zmian, ktore usuwaja albo migruja pozostalosci dawnej domeny.

## Standard Pracy Autonomicznej

Pracuj etapami, ale kazdy etap ma zostawic repozytorium w domknietym stanie:

- przed edycja przeczytaj root `AGENTS.md` i najblizszy lokalny `AGENTS.md` dla zmienianej sciezki,
- najpierw ustal realny kontrakt w kodzie, testach i dokumentacji, a dopiero potem zmieniaj implementacje,
- nie koncz etapu na czesciowej migracji: aktualni callerzy, typy, testy i dokumentacja maja byc zgodne,
- nie zostawiaj `TODO`, starych fallbackow, martwych galezi ani komentarzy opisujacych usuniety stan,
- rozdzielaj zmiany tematycznie; nie mieszaj stabilizacji kontraktu z nowa funkcja produktowa,
- jesli wymagany backend albo frontend dev server juz dziala, nie uruchamiaj wlasnego alternatywnego serwera; waliduj na istniejacym procesie albo popros uzytkownika o restart,
- jesli wieloetapowy goal wymaga commit/push, commituj tylko spojny etap po adekwatnej weryfikacji i pushuj te same zmiany przed przejsciem dalej,
- w podsumowaniu podawaj zmienione kontrakty, uruchomione testy oraz jawnie wymieniaj testy pominiete z powodu ograniczen srodowiska.

## Praca Na Dwoch Komputerach

Repozytorium ma jeden kod i dwa tryby uruchomienia: lokalny dev oraz publiczny runtime, ktory moze dzialac na Raspberry Pi runtime. To nie sa osobne linie kompatybilnosci.

- `main` traktuj jako stabilna wersje kodu gotowa do wystawienia. Nie prowadz zwyklej pracy bezposrednio na `main`, chyba ze uzytkownik wyraznie prosi o hotfix albo publikacje gotowego etapu.
- Nowa prace zaczynaj na tematycznym branchu z aktualnego `main`, np. `work/admin-ui-cleanup`, `work/place-collections` albo `fix/moderation-counts`. Unikaj jednego stalego brancha `dev`, ktory miesza kilka tematow.
- Gotowy etap na branchu roboczym ma miec adekwatna weryfikacje, commit i push tego brancha. Do `main` przenos tylko wersje uznane za gotowe po testach i swiadomej decyzji o publikacji.
- Jesli zaczynasz zadanie i jestes na `main`, a zmiana nie jest trywialna, najpierw utworz branch roboczy. Jesli worktree jest brudny, nie przelaczaj ani nie pulluj bez sprawdzenia statusu i ustalenia, co z lokalnymi zmianami.

- Na poczatku pracy na dowolnym komputerze sprawdz stan i pobierz zmiany bez tworzenia merge commita:

```bash
git status --short --branch
git pull --ff-only
```

- Przed pushowaniem domknij lokalny etap i zweryfikuj go adekwatnie do zmiany:

```bash
./scripts/check.sh
git add .
git commit -m "..."
git push -u origin <branch>
```

- Jesli `git push` zostanie odrzucony, bo drugi komputer wypchnal nowsze commity, najpierw zsynchronizuj historie przez rebase, potem powtorz weryfikacje i push:

```bash
git pull --rebase
./scripts/check.sh
git push
```

- Nie rob `git pull` ani `git pull --rebase` na brudnym worktree bez swiadomej decyzji uzytkownika. Najpierw pokaz `git status --short --branch` i ustal, czy zmiany trzeba commitowac, stashowac albo zostawic lokalnie.
- Unikaj dlugiej rownoleglej pracy na obu komputerach w tych samych plikach. To jest normalne zrodlo konfliktow Git, nie problem kompatybilnosci PhotoMap.
- Lokalne artefakty nie sa synchronizowane przez Git: `.env`, `.dev`, `.cloudflared`, `backend/.venv`, `node_modules`, `frontend/dist`, `backend/data` oraz `backend/storage`.
- Tryb dev uruchamiaj przez `make start`. Publiczny runtime uruchamiaj przez `make server-start`, `make autostart-start` albo alias `make serwerstart`. Raspberry Pi najlepiej traktowac jako runtime/deploy, chyba ze uzytkownik jawnie koduje tam zmiany. Aktualny flow dla Pi Zero 2W jest w `docs/deploy-pi-zero2w.md`.

## Testowanie

Kazda zmiana kontraktu albo zachowania powinna miec adekwatne pokrycie testami:

- test publicznego kontraktu API, jesli zmienia sie publiczny endpoint,
- test admin API, jesli zmienia sie akcja admina,
- test schematu albo migracji, jesli zmienia sie model bazy,
- build frontendu, jesli zmienia sie TypeScript albo komponenty,
- test helpera/trybu komponentu, jesli UI ma rozne warianty,
- diagnostyka albo skrypt check, jesli problem moze wrocic przez lokalne dane lub srodowisko.

W obecnym workflow Codex jako wtyczka VS Code nie udostepnia wbudowanej przegladarki `iab`. Przy walidacji renderowanego frontendu nie probuj najpierw Browser plugin; od razu uzywaj lokalnego Playwrighta i opisz to w podsumowaniu jako ograniczenie srodowiska.

Po wiekszej zmianie uruchom:

```bash
./scripts/check.sh
```

Nie ignoruj czerwonych testow komenda typu `|| true`. Jesli test nie moze przejsc z powodu znanego ograniczenia srodowiska, opisz to jawnie w podsumowaniu.

## Hierarchia AGENTS.md

Ten plik jest glownym kontraktem projektu. Lokalne `AGENTS.md` sluza tylko do trwalych granic odpowiedzialnosci i nie powinny powtarzac zasad z roota.

Przed edycja sciezki objetej lokalnym plikiem przeczytaj root `AGENTS.md` oraz najblizszy lokalny `AGENTS.md`.

- `backend/AGENTS.md` - backend FastAPI, modele, migracje, serwisy, storage i testy API.
- `frontend/AGENTS.md` - frontend React/Vite, klient API, style i ogolne reguly UI.
- `frontend/src/components/admin/AGENTS.md` - admin UI, CRUD, moderacja, raporty i flow korekt.
- `frontend/src/components/map/AGENTS.md` - publiczna mapa, miniatury, warstwy, sheets i markery.
- `content/AGENTS.md` - manifesty miast i redakcyjny content importowany masowo.
- `scripts/content/AGENTS.md` - importer manifestow i jego kontrakt idempotencji.

## Kierunek Produktu

Biezacy kierunek produktu jest w [docs/product-direction.md](docs/product-direction.md). Nie dopisuj osobnych roadmap, list zadan ani rownoleglych planow produktu; jesli kierunek sie zmienia, aktualizuj ten dokument i powiazane lokalne kontrakty.
