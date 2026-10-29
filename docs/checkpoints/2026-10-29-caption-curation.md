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

## Status wykonania

- Przygotowany plan, skrypt, testy i dokumentacja na gałęzi `work/caption-curation-20261029`.
- Skrypt przeszedł testy jednostkowe i Ruff na Mac Local Agent w pierwszej weryfikacji; poprawiono następnie kontrolę kolizji oraz dodano sprawdzenie rzeczywistego planu.
- **Produkcja nie została jeszcze zmodyfikowana tym planem.** Operacja staging/dry-run na Pi nie została wykonana z powodu ograniczenia narzędzia obsługującego zlecenie. Nie deklarować PASS produkcyjnego ani 27 zmian bez potwierdzonych wyników końcowych Local Agent.
- Wymagane: finalne testy gałęzi, dry-run na aktualnym SQLite i dopiero bezpieczny apply z potwierdzeniem liczników i kontrolą 3 chronionych rekordów. Po skutecznym zastosowaniu zaktualizować ten status, bez tworzenia zdublowanej dokumentacji.
