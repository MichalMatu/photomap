# Scripts

`Makefile` jest głównym wejściem do skryptów PhotoMap. Codziennie używaj `make <cel>`, a pliki w `scripts/` traktuj jako implementację albo niższy poziom dla rzadkich operacji.

```bash
make help
make scripts
```

`make help` otwiera interaktywne menu kategorii i pozwala uruchomić wybraną komendę po numerze. Menu jest podzielone na najczęściej używane komendy, audyt/research opisów, import contentu, dev lokalny, diagnostykę/testy, backup/storage, publiczny runtime oraz operacje zaawansowane. Komendy zapisujące dane albo zmieniające runtime wymagają dodatkowego potwierdzenia. `make scripts` zostaje statycznym spisem skrótów do skryptów.

## Zasady

- Uruchamiaj komendy z katalogu repo.
- Dla operacji zmieniających dane najpierw używaj celu bez `-apply`.
- Przed większym importem albo czyszczeniem mediów zrób backup.
- Make domyślnie wybiera `backend/.venv/bin/python`, jeśli istnieje; możesz nadpisać interpreter przez `PYTHON=...`.

## Szybkie Komendy

| Potrzeba | Komenda | Działanie |
| --- | --- | --- |
| Lokalny dev | `make start` | Uruchamia backend i frontend. |
| Status dev | `make status` | Pokazuje PID-y, porty i health. |
| Logi dev | `make logs` | Pokazuje ostatnie logi procesów dev. |
| Pełny check | `make check` | Uruchamia główną weryfikację projektu. |
| Testy jakości | `make quality` | Uruchamia checki API, smoke, perf i E2E. |
| Prompt audytu | `make audit-prompt` | Generuje prompt do audytu opisów przez publiczne API. |
| Inventory miejsc | `make place-inventory` | Tworzy lekki JSON miast i miejsc do analizy braków przez AI. |
| Eksport miejsca | `make export-place-research` | Tworzy tekstowy ZIP opisów jednego miejsca. |
| Eksport miasta | `make export-city-research` | Tworzy jedną zbiorczą paczkę ZIP miasta. |
| Eksport wszystkiego | `make export-all-research` | Tworzy jedną zbiorczą paczkę ZIP wszystkich miejsc. |
| Publiczny runtime | `make server-start` | Buduje frontend i startuje `server.py`. |
| Autostart runtime | `make autostart-start` | Włącza runtime i tunnel. |

## Dane Lokalne I Storage

| Potrzeba | Komenda | Działanie |
| --- | --- | --- |
| Diagnostyka danych | `make diagnose-data` | Sprawdza SQLite i storage mediów. |
| Backup próbny | `make backup` | Uruchamia diagnostykę i pokazuje plan backupu. |
| Backup realny | `make backup-apply` | Tworzy `backups/local-*`. |
| Osierocone media | `make cleanup-media` | Pokazuje pliki do usunięcia. |
| Usunięcie mediów | `make cleanup-media-apply` | Usuwa tylko pliki zgłoszone przez diagnostykę. |
| Retencja oryginałów | `make retain-originals` | Pokazuje plan retencji prywatnych oryginałów. |
| Realna retencja | `make retain-originals-apply` | Stosuje reguły retencji. |
| Migracja zdjęć | `make migrate-photo-originals` | Dry-run przejścia `Photo` na publiczny oryginał + miniaturę. |
| Migracja zdjęć apply | `make migrate-photo-originals-apply` | Zmienia URL-e i usuwa stare pełne pochodne po commicie DB. |
| Reset dev data | `make reset-dev-data` | Czyści lokalną bazę i storage dev. |

## Content Pipeline

Domyślny manifest to `content/cities/wroclaw/manifest.json`.

```bash
make import-city
make import-city-apply
make import-city MANIFEST=content/cities/legnica/manifest.json
make import-city-apply MANIFEST=content/cities/legnica/manifest.json
```

`import-city` robi walidację i rollback, a `import-city-apply` zapisuje zmiany w bazie. Więcej zasad pipeline jest w [`docs/content-pipeline.md`](../docs/content-pipeline.md).

## Research Opisów

Generator promptów tworzy instrukcję do web chatu bez pobierania paczek ZIP. Lista miast i miejsc pochodzi
z lokalnej bazy, ale sam prompt każe agentowi pobierać dane z publicznych endpointów PhotoMap:
`/llms.txt`, `/api/public/cities/{city_id}/places` i `/api/public/cities/{city_id}/places/{place_slug}`.
Dzięki temu workflow sprawdza dokładnie to, co zobaczy zewnętrzny agent AI albo crawler.

```bash
make audit-prompt
make audit-prompt CITY="Wrocław" PLACE="Rynek"
make audit-prompt CITY="Wrocław" ARGS="--scope city --audit tts --fields all"
make audit-prompt CITY="Wrocław" PLACE="Rynek" ARGS="--audit seo --fields place"
```

Domyślny prompt sprawdza `description`, `article_blocks`, `photos[].caption` i
`photos[].description_blocks`. Tryby audytu można składać przez `ARGS`, np. `--audit tts,seo`
albo użyć presetów `full`, `quick`, `tts`, `seo`. Pola można podać przez `--fields all`, `place`,
`photos`, `tts` albo listę `description,article_blocks,photo_captions,photo_blocks`.
Przy trybie `tts` albo polach zdjęć prompt zawiera skrót standardu z `docs/create_tts.md`:
dokładne cytaty bez wielokropków, widoczny tekst jako materiał TTS, podpis zdjęcia do 120 znaków,
dozwolone bloki `heading`, `subheading`, `paragraph`, `link` oraz kontrolę powtórzeń w galerii miejsca.
Generator zapisuje gotowy tekst do `research-exports/prompt.txt` i wypisuje go w terminalu.
W trybie nieinteraktywnym samo `CITY="Wrocław"` bez `PLACE` oznacza audyt całego miasta.

Inventory miejsc tworzy lekki JSON z aktualnej lokalnej bazy: miasta, liczniki, miejsca, opisy,
kategorie oraz publiczne `api_path`/`api_url` dla opublikowanych miejsc. To jest plik do wrzucenia
do czatu z poleceniem typu: „to już mam w PhotoMap, wskaż ważne brakujące miejsca bez duplikatów”.
Domyślnie eksport obejmuje aktywne miasta i opublikowane miejsca, czyli to, co widzi publiczna strona.
Drafty i archiwalne wpisy można uwzględnić jawnie przez `ARGS`.

```bash
make place-inventory
make place-inventory ARGS="--place-status all"
make place-inventory ARGS="--city-status all --place-status all --stdout"
```

Domyślny plik to `research-exports/place-inventory.json`. Eksport nie zawiera zdjęć, prywatnych
oryginałów, EXIF ani lokalnych ścieżek storage. Dla miejsc niepublicznych pola publicznego endpointu
są ustawione na `null`, żeby nie sugerować agentowi, że może je pobrać ze strony.

Eksport do Deep Research tworzy tekstowe paczki ZIP z opisami miejsc. Paczki nie zawierają zdjęć,
prywatnych oryginałów ani EXIF. Zawierają metadane opisów z bazy, czytelny `review.md`,
prompt `PROMPT.md`, `tts-guidelines.md` z aktualnym standardem TTS z `docs/create_tts.md`
i `requested_changes.template.json` do późniejszego zwrotu poprawek tekstowych.
Prompt wymaga porównania obecnej i proponowanej wersji oraz zwrotu finalnego
`requested_changes.json` z tekstami gotowymi do późniejszego zapisu w bazie. `description_blocks`
są traktowane jako tekst widoczny w aplikacji i materiał do TTS, więc audyt nie powinien
skracać ich mechanicznie do streszczeń. Wynik audytu ma być wklejony bezpośrednio w czacie,
bez linków i plików do pobrania.

```bash
make export-place-research
make export-place-research QUERY="Rynek"
make export-place-research CITY="Wrocław" PLACE="Rynek"
make export-city-research CITY="Wrocław"
make export-city-research QUERY="wroclaw"
make export-all-research ARGS="--yes"
```

Wyszukiwanie miejsca i miasta jest case-insensitive oraz ignoruje polskie znaki. Jeśli jest kilka wyników
albo tylko podobne nazwy, skrypt pokazuje listę wyboru. Bez parametrów tryby `place` i `city` pytają o nazwę.

Eksport trafia do czytelnej struktury:

```txt
research-exports/
  miejsca/{place-slug}.zip
  miasta/{city-slug}.zip
  wszystkie/wszystkie.zip
```

Paczka pojedynczego miejsca, np. `miejsca/rynek-wroclaw.zip`, ma pliki opisu bez dodatkowych katalogów.
Paczka miasta, np. `miasta/walbrzych.zip`, ma jeden wspólny `PROMPT.md` w głównym katalogu ZIP
i osobne katalogi miejsc w środku. Paczka `wszystkie/wszystkie.zip` ma katalogi miast, a w nich katalogi miejsc.
Każdy eksport odświeża też `research-exports/prompt.txt` z krótką instrukcją do skopiowania
do czatu razem z załączonym ZIP-em.

`research-exports/` jest ignorowane przez Git. Paczki są lokalnym artefaktem roboczym; nie zawierają
plików zdjęć ani prywatnych ścieżek storage.

## Redakcyjny audyt jakości (bez zapisów)

`make audit-editorial` tworzy raport `research-exports/editorial-quality.json` z aktualnego SQLite: braki w opisach i okładkach miejsc, podpisach i atrybucjach zatwierdzonych zdjęć oraz sygnały powtarzalnej treści. Nie zmienia bazy ani plików zdjęć.

```bash
make audit-editorial
make audit-editorial ARGS="--strict"
```

`--strict` zwraca błąd dla nowych nierozwiązanych braków krytycznych. Puste `photo.description_blocks` są tylko informacją: rozbudowany opis zdjęcia jest opcjonalny. Jawne wyjątki w `content/editorial-quality-exceptions.json` oznaczają wyłącznie decyzję „pozostaw bez zmian”, **nie** potwierdzają autorstwa ani licencji. Trzy istniejące, potencjalnie prywatne fotografie (Borek i Wroclavia) nie mogą być automatycznie modyfikowane lub usuwane. Wyjątki niewystępujące już w opublikowanych albumach są raportowane jako wymagające przeglądu. Po zmianie produkcyjnych metadanych uruchom audyt ponownie, bez bezrefleksyjnego odtwarzania starszych raportów PR #45/#46.

## Diagnostyka

| Potrzeba | Komenda |
| --- | --- |
| Schemat bazy | `make schema-check` |
| Raport architektury | `make diagnose-architecture` |
| Kontrakt publicznego API | `make api-contract` |
| Flow API | `make api-flow` |
| Smoke backendu i frontendu | `make smoke` |
| Smoke wydajności | `make perf-smoke` |
| Playwright E2E | `make e2e` |

## Rzadkie Operacje

Ręczna redakcja mediów wymaga jawnych argumentów, więc Make tylko przekazuje `ARGS` do skryptu:

```bash
make redact-media ARGS="--dry-run --kind memory --id <memory-id> --rect 0.1,0.1,0.4,0.3"
make redact-media ARGS="--apply --kind memory --id <memory-id> --rect 0.2,0.2,0.5,0.5"
```

Redakcyjne `Photo` nie są anonimizowane w miejscu: kanoniczny oryginał należy odrzucić i zastąpić bezpieczną wersją. Szczegóły operacji na danych, backupu, migracji zdjęć, retencji i redakcji są w [`docs/ops.md`](../docs/ops.md).

## Niskopoziomowe Pliki

- `scripts/devctl.sh` i `scripts/serverctl.sh` są wywoływane przez targety `make`.
- `scripts/dev/*.sh` to helpery procesów, nie osobne wejście operacyjne.
- `scripts/quality/*.sh` mają targety w `Makefile`.
- `scripts/quality/*.py` są helperami dla checków i smoke testów.
- `scripts/generate_audit_prompt.py` generuje prompt audytu opisów oparty na publicznym API.
- `scripts/export_place_inventory.py` eksportuje lekki JSON miast i miejsc do analizy braków przez AI.
- `scripts/export_place_research.py` eksportuje opisy miejsc do tekstowych paczek research.
- `scripts/content/import_city.py` jest głównym importerem manifestów, zwykle uruchamianym przez `make import-city`.
