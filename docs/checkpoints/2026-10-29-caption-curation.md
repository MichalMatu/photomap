# PhotoMap — korekta powtarzających się podpisów (29.10.2026)

## Stan i zakres

- Wersja wejściowa kodu GitHub `main`: `82cacecff8e93bd4977a847a9599922ed6e0b557`.
- Wersja produkcyjna Pi odczytana podczas audytu: `ac898d465bfca86d4259cdf76abea1dadb2e1f4c`.
- Produkcyjne SQLite w odczytanym stanie: **195** opublikowanych miejsc, **1140** zatwierdzonych zdjęć, `integrity_check=ok`.
- Wykryto **8** grup po co najmniej trzy identyczne podpisy w **7** galeriach, łącznie **27** zdjęć.
- Galerie: `aula-leopoldina`, `dworzec-glowny`, `fontanna-multimedialna` (dwie grupy), `hala-targowa`, `most-grunwaldzki`, `ossolineum`, `panorama-raclawicka`.

## Korekta

Plan `docs/audit/photo-captions-20261029-plan.json` zawiera dokładne ID zdjęcia, slug miejsca, wymagany poprzedni podpis, wymagany pierwszy nagłówek istniejącego opisu i nowy podpis. Wszystkie nowe podpisy powstały z **istniejących szczegółowych opisów zdjęć**, bez dodawania nowego materiału fotograficznego, treści historycznych ani atrybucji.

Narzędzie `scripts/content/photo_caption_editor.py` domyślnie robi **wyłącznie dry-run** na SQLite. Zanim zapisze choć jeden podpis, weryfikuje aktualne ID i statusy, tytuł z nagłówka opisu, stare podpisy, przynależność do miejsca, brak ingerencji w okładki oraz kolizje proponowanych podpisów. Tryb zapisu jest możliwy tylko po `--apply --confirm APPLY_CAPTIONS`, lokalnie na Pi, przy dostępności istniejącego admin API i tokena lokalnego. Przed pierwszą mutacją tworzy spójną kopię SQLite i manifest stanu. Każdy PATCH trafia do jawnego dziennika. Na końcu ponownie sprawdzane są pola nieobjęte zmianą, integralność SQLite i zanik wszystkich 8 grup powtórzeń.

**Ochrona zdjęć właściciela:** rekordy wymienione w `content/editorial-quality-exceptions.json` (Wieża Ciśnień Borek i dwa zdjęcia Wroclavii) są wykluczone ze zmian oraz weryfikowane przed/po. Ich autorstwo i licencje nadal pozostają niepotwierdzone. Żadnych zdjęć ani plików mediów nie wolno usuwać.

## Status wykonania — 2026-10-29

**PRODUKCYJNE DANE: PASS.** Sprint został wykonany przez Mac Local Agent po GitHub-owym odczycie kontrolowanej gałęzi. Nie było deployu runtime, usuwania mediów ani zmian przypisania autorstwa.

1. Testy gałęzi `work/caption-curation-20261029`: `pytest` testów narzędzia **7/7 PASS**, Ruff check i Ruff format PASS, `compileall` PASS. Pełna regresja backendu: po odtworzeniu izolowanych katalogów `backend/storage/{public,private}`, zadanie `photomap-caption-full-backend-20261029-v2` — **339/339 PASS**, Ruff check i format PASS. Pierwsza próba `v1`: 335 PASS i 4 błędy wyłącznie z powodu nieistniejącego ignorowanego katalogu `storage/public` w tymczasowym worktree; po korekcie środowiska wszystkie 339 testów PASS.
2. Produkcyjny **dry-run**: `photomap-caption-prod-dryrun-20261029-v2` — `planned=27`, `protected=3`, `repeated_caption_groups=8`.
3. Jawny `--apply --confirm APPLY_CAPTIONS`: `photomap-caption-prod-apply-20261029-v1` — `updated=27`, `repeated_groups_remaining=0`, `protected_unchanged=3`, `integrity=ok`.
4. Niezależny postcheck: `photomap-caption-independent-postcheck-20261029-v1` — porównanie z backupem wykazało **dokładnie 27 zmian samych podpisów**; 3 chronione rekordy identyczne przed/po; 0 powtórzeń (według progu audytu: grupy min. 3); 195 miejsc, 1140 zatwierdzonych zdjęć, `integrity_check=ok` dla obu baz, 27 wpisów w dzienniku.
5. Backup na Pi: `/home/michal/src/PhotoMaps/.dev/editorial/caption-20261029/audit/app-before-captions.sqlite`. Plan i dziennik w sąsiednim katalogu `audit/`. Backup zachować; **nie umieszczać SQLite ani mediów w GitHub**. Przywrócenie wymaga osobnej świadomej decyzji.
6. Skrypt i plan do odtworzenia w GitHub: `scripts/content/photo_caption_editor.py` i `docs/audit/photo-captions-20261029-plan.json`. Ponowny apply po PASS **nie jest wymagany**. Idempotencję i zgodność źródeł sprawdzono; nie uruchamiać starego planu po zmianie danych bez nowego audytu.
7. Końcowy status GitHub i Pi HEAD powinien być sprawdzony po merge PR #48; sama korekta podpisów nie wymaga restartu serwera.

## Chronione materiały

Trzech zdjęć (Wieża Ciśnień Borek, dwa zdjęcia Wroclavii) **nie zmieniono**. Są to potencjalnie własne zdjęcia użytkownika, ale brak jeszcze weryfikacji praw/autorów. Ich metadanych nie uzupełniać domysłami, nie usuwać ich oraz nie wykorzystywać jako niejawnego wyjątku licencyjnego.

## Przyszły etap (nie otwierać kolejnej pracy w tym sprincie)

Nowa sesja powinna zacząć od aktualnych `main`, `AGENTS.md`, tego checkpointu oraz rzeczywistego odczytu produkcji. Ewentualny dalszy rozwój: pomiar wydajności mapy na telefonie i redakcyjne opcjonalne opisy 62 zdjęć — wyłącznie jeśli pomiar lub potrzeba produktu uzasadniają zmianę. Nie ponawiać ukończonych 27 poprawek.

## Końcowy checkpoint sprintu — 29.10.2026

- **Kod:** PR #47 (read-only quality gate) i PR #48 (27 podpisów) zostały scalone do `main`. Po merge #48 główny commit był `155a704a4fba83f14d7b8c4ae52e1fa7198eab85`. Kolejne commity dokumentacyjne mogą zmienić HEAD; na początku nowego czatu odczytać rzeczywisty `main`.
- **Testy:** 7/7 focused i 339/339 pełnego backendu PASS na osobnym Mac Local Agent worktree; Ruff check i Ruff format PASS. Nie uruchamiano GitHub Actions.
- **Baza produkcyjna:** 27/27 podpisów zmienionych, 0 grup o co najmniej trzech identycznych podpisach, 3/3 wskazane zdjęcia całkowicie nietknięte. Niezależna kontrola pokrycia dokładnie 27 ID, backup SQLite i bieżąca baza `integrity_check=ok`, 195 published places i 1140 approved photos.
- **Stare PR-y:** #45 i #46 zamknięte **bez merge** jako historyczne; ich przestarzałe opisy opatrzono adnotacjami. Nie usuwać archiwów/bakcupów na podstawie starych liczb.
- **Stan wdrożenia:** działający runtime Pi pozostaje na `main` SHA `ac898d465bfca86d4259cdf76abea1dadb2e1f4c`. Po tym SHA w GitHub `main` zmieniły się wyłącznie skrypty redakcyjne, ich testy, dokumentacja i Makefile; **nie zmieniono backendowego runtime ani frontendu**, dlatego nie wykonywano restartu. Pi pomyślnie pobrał aktualny commit GitHub, lecz lokalne fast-forward checkoutu **nie zostało wykonane** z powodu ograniczenia mechanizmu wykonawczego. Traktować to jako niewpływające na działanie strony zadanie housekeeping do ewentualnego wykonania podczas przyszłych prac, nie jako niespełnioną korektę danych.
- **Git remote Pi:** `origin` wskazuje historyczną nazwę `https://github.com/MichalMatu/PhotoMaps.git`; nowy commit poprawnie pobrano z kanonicznego `https://github.com/MichalMatu/photomap.git`. Nie przełączać runtime tylko po to, by poprawić remote. Przyszły preflight powinien to sprawdzić przed synchronizacją.
- **Brak otwartych zadań bieżącego sprintu dotyczących kodu lub danych.** Przy kolejnym uruchomieniu nie stosować drugi raz starego planu 27 zmian, nie usuwać chronionych zdjęć i nie zgadywać ich autorstwa.
