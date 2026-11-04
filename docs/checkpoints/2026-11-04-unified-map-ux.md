# PhotoMap — jeden spójny UX mapy (04.11.2026)

## Zakres sprintu

- Jednoznaczne menu nawigacyjne: **Mapa, Trasy, Samouczek**. Jeden przycisk otwiera i zamyka menu; usunięto pośrednią szynę nawigacyjną.
- **Filtry** to osobny panel wyboru rodzaju treści i kategorii. Kategorie pochodzą z publicznego API bez uzależnienia od obsługiwanej ikony. Każda opcja ma czytelną nazwę; licznik wyników i reset pozostają w panelu.
- **Widok** to osobny panel preferencji prezentacji (miniatury/pinezki, szuflada zdjęć, automatyczne audio), a nie część filtrów.
- Dolna szuflada startuje **zwinięta**, bez zmniejszania mapy. Kliknięcie uchwytu przełącza zwinięta ↔ kolekcja; jawny przycisk Więcej/Mniej zdjęć przełącza poziom odkrywania. Pionowy gest uchwytu nadal zmienia poziom o jeden krok.
- Usunięto konflikt mobilnej reguły min-height z mapą zmniejszaną przez szufladę. Szuflada i mapa współdzielą przestrzeń na desktopie, tablecie i telefonie.
- Uchwyt szuflady jest zawsze widoczny; ukryta zawartość nie jest dostępna dla fokusu. Dock/undock, podgląd i trwałość przypięć pozostają dotychczasowym kontraktem.
- Samouczek przechodzi do nowego panelu filtrów i podświetla rzeczywistą klikalną kontrolkę, nie cały panel. Promocja moderacji nie konkuruje z pierwszym uruchomieniem samouczka.
- Zachowano mapę z miniaturami, pełny wachlarz galerii i lekki kontrakt API bez zmian backendu.

## Weryfikacja

- W Mac Local Agencie: format, TypeScript, ESLint, knip, build produkcyjny oraz **369/369** testów Vitest — PASS.
- E2E Chrome: osobny zestaw `map-unified-ux.spec.ts` sprawdza zamkniętą/otwartą szufladę na pięciu viewportach (1440×900, 768×1024, 390×844, 360×740, 844×390) oraz rozdział filtrów i ustawień.
- Testy regresji obejmują `app-shell-swipe`, `discovery-drawer`, `pinned-media-drawer`, `map-tour`.
- Finalny wspólny przebieg 14 scenariuszy Chrome: **14/14 PASS** na gałęzi `feat/unified-map-ux-20261104`, po ostatniej korekcie transparentnego tła panelu filtrów (`photomap-unified-ux-final-polish-gates-20261104-v2`).
- Pełne sprawdzenie na ostatnim kodzie: Vitest **369/369 PASS**, Prettier, knip, TypeScript, lint i Vite build **PASS**.
- Rozszerzona regresja 24 scenariuszy mapy, tras, ustawień i zapisanych mediów: **19 PASS, 5 FAIL**; **identyczne pięć niezgodności odtworzono na czystym `main` `30bff5c`**. To istniejący dług bazowy: dwa niezgodne snapshoty obrazu, test punktu trafienia przesuniętego markera, test podwójnego kliknięcia przypiętej karty oraz test tekstu celowo ukrytej kopii karty pionowej. Sprint nie dodał nowych błędów w tej grupie; nie kasować asercji ani nie nadpisywać automatycznie referencyjnych screenshotów bez odrębnego audytu.
- Kontrola tokenów CSS: pełny gate nie przechodzi zarówno na bazowym `main`, jak i gałęzi UX; lista niezgodności jest identyczna (historyczny dług, bez nowych naruszeń).
- Raspberry Pi read-only preflight `photomap-unified-ux-pi-preflight-20261104-v1`: gałąź `main`, katalog czysty, usługa i tunel aktywne, `/health` OK, `/api/places/map` 200, wolne miejsce 42 GB. Preflight **nie jest wdrożeniem**.

## Zasady wydania

- Wydawać wyłącznie zweryfikowany commit `main`, bez GitHub Actions/Codex/Work.
- Dla frontendu tylko atomowy deploy `dist` na Pi Zero 2W z backupem poprzedniego indeksu i spójnym backupem SQLite, bez restartu backendu ani tunelu.
- Po wdrożeniu sprawdzić publiczne HTTP `/`, `/health`, `/api/places/map`, hashe assetów i nienaruszony PID usługi.
- Ostateczny status aktywacji zapisać w `docs/GOLDEN_STATUS.md` dopiero po publicznym smoke PASS.
