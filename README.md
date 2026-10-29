# PhotoMap

PhotoMap to wizualna mapa miejsc z klimatem. Wroclaw jest pierwszym miastem startowym, na ktorym redukujemy produkt do najmocniejszego rdzenia: mapa miniaturek, miejsca, covery, pamiatki, proste kolekcje, moderacja i content pipeline.

Glownym bytem systemu jest `place`. Zdjecia, pamiatki, kolekcje i zgloszenia sa przypiete do miejsca albo kolekcji miejsc. Nowe moduly nie wchodza do aktualnego zakresu, jesli nie wzmacniaja publicznej mapy.

## Local Agent integration

PhotoMap jest zarejestrowany jako `photomap` w wielorepozytoryjnym workflow [`local-agent`](https://github.com/MichalMatu/local-agent). Nowy chat powinien zaczac od przeczytania aktualnego `AGENTS.md`; zadania lokalne dla tego repo trafiaja wylacznie przez branch `agent-control` PhotoMap. Szczegolowy bootstrap i kontrakt kolejki sa zapisane w `AGENTS.md`.

Dokumentacja celowo nie przypina tej integracji do numeru wersji `local-agent` — aktualny kontrakt wykonawczy jest utrzymywany w repozytorium agenta.

## Sandbox i ChatGPT Library

Software-only buildy i testy moga byc wykonywane w sandboxie ChatGPT z zaleznosciami odtwarzanymi offline z ChatGPT Library. GitHub Actions generuje snapshot zrodel po dokladnym SHA oraz paczke Python/npm/Playwright. Szczegolowy flow, nazwy artefaktow i bootstrap sa w [docs/SANDBOX_EXECUTION_FLOW.md](docs/SANDBOX_EXECUTION_FLOW.md).

## Dokumenty

- [Kierunek produktu](docs/product-direction.md)
- [Interaktywny samouczek mapy i lokalny podgląd Mac](docs/interactive-map-tour.md)
- [Sandbox / ChatGPT Library](docs/SANDBOX_EXECUTION_FLOW.md)
- [Content pipeline](docs/content-pipeline.md)
- [Workflow mediow redakcyjnych](docs/editorial-media-workflow.md)
- [Checkpoint ostatniego zamkniętego sprintu — korekta 27 podpisów](docs/checkpoints/2026-10-29-caption-curation.md)
- [Operacje, diagnostyka i storage](docs/ops.md)
- [Opisy TTS zdjec](docs/create_tts.md)
- [Prompt miniatur miejsc](docs/image_generation/place-thumbnails.md)
- [Assety redakcyjne](assets/README.md)
- [Uruchamianie i testy](docs/dev.md)
- [Deploy na Raspberry Pi Zero 2W](docs/deploy-pi-zero2w.md)
- [Skrypty i Make](scripts/README.md)
- [Struktura kodu](docs/code-structure.md)

## Dev

```bash
make help
make scripts
make start
make restart
make stop
make status
make logs
make check
```
