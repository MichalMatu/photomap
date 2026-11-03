# PhotoMap

PhotoMap to wizualna mapa miejsc, zdjęć i kolekcji. Wrocław jest pierwszym miastem i zestawem danych do strojenia produktu. Centralnym bytem jest `place`; zdjęcia, pamiątki i trasy są przypisane do miejsc.

**Produkcja:** https://photomap.pl — Raspberry Pi Zero 2W, zarządzana usługa `photomap.service` i niezależny tunel Cloudflare.

**Aktualny, kanoniczny stan projektu:** [GOLDEN_STATUS.md](docs/GOLDEN_STATUS.md). Tam są dokładny release SHA, testy, backup, rollback, cleanup i informacje do wznowienia projektu. Historyczne checkpointy zachowuje historia Git, nie nawigacja README.

## Utrzymanie i rozwój

- [AGENTS.md](AGENTS.md) — zasady projektu i integracja GitHub Connector + Mac Local Agent; kolejka `agent-control`.
- [docs/deploy-pi-zero2w.md](docs/deploy-pi-zero2w.md) — atomowy deploy i rollback.
- [docs/ops.md](docs/ops.md) — diagnostyka, dane, kopie bezpieczeństwa.
- [docs/dev.md](docs/dev.md) — uruchamianie i testowanie.
- [docs/code-structure.md](docs/code-structure.md) — organizacja kodu.
- [docs/product-direction.md](docs/product-direction.md) — kierunek produktu.
- [docs/content-pipeline.md](docs/content-pipeline.md) i [docs/editorial-media-workflow.md](docs/editorial-media-workflow.md) — import i zdjęcia.

Lokalnie: `make help`, `make status`, `make check`. Bez uruchamiania GitHub Actions.
