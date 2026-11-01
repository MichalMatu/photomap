# AGENTS.md - Public Map

## Purpose

Publiczna mapa jest glownym produktem: wizualna tablica miniaturek miejsc, warstw i szybkich podgladow.

## Ownership

- `PlaceMap.tsx` sklada publiczne doswiadczenie mapy.
- `PlaceMarker.tsx`, `mapHtml.ts` i `mapMarkerScale.ts` trzymaja marker, HTML Leafleta oraz skale zoomu.
- `placeMarkerMotion.ts` trzyma marker motion signatures oraz marker-entry timing/style; marker-specific motion nie nalezy do `mapMotion.ts`.
- `mapMotion.ts` trzyma motion/layout helpers galerii.
- `placePreview.ts` trzyma transformacje danych do lekkiego podgladu.
- `photo-detail/` trzyma modal medium, jego prezentacje, nawigacje i gesty.
- `pinned-media/` trzyma przypiete media, ich board, layout, persistence i interakcje.
- Sheets i modale mapy obsluguja akcje uzytkownika przypiete do miejsca.

## Local Contracts

- Pierwszy widok mapy nie moze byc pusty wizualnie; powinien pokazac miniatury miejsc albo klastry miniaturek.
- Publiczne markery domyślnie są miniaturami miejsc; jawny przełącznik widoku pozwala wyświetlić opcjonalne pinezki, zachowując ten sam wybór miejsc i dostęp do galerii.
- `map preview` pozostaje lekkim kontraktem: miejsce, miasto, kategorie, score, liczniki, cover i kilka podgladow.
- Nie pobieraj pelnych galerii ani pelnych pamiatek tylko po to, zeby wyrenderowac pierwszy widok mapy.
- Warstwy mapy sa sposobem ogladania danych; kategorie i filtry maja byc dynamiczne z API.
- Publicznie renderuj tylko opublikowane miejsca oraz zatwierdzone media i pamiatki.
- Klikniecie miniatury galerii miejsca otwiera bezposrednio jeden modal medium. Nie tworz posredniego viewera, ktory tylko powtarza to samo zdjecie.
- Rozwiniety wachlarz miejsca po kliknieciu pokazuje wszystkie zatwierdzone zdjecia z publicznej galerii miejsca. Nie redukuj go do `preview_items` i nie dodawaj limitu liczby widocznych zdjec jako optymalizacji wydajnosci.
- Rozwinieta galeria miejsca zachowuje efekt chmury/wachlarza i skaluje obszar oraz miniatury wedlug realnego viewportu, dostepnego miejsca i liczby mediow. Nie przywracaj stalego niskiego limitu rozmiaru ani limitu widocznych zdjec bez jawnej decyzji produktowej.
- Modal medium pokazuje jeden kompaktowy blok tekstu na obrazie: podpis zdjecia z opisem miejsca albo dane pamiatki. Akcje edycji i zgloszenia pozostaja kompaktowe.
- Zmiany pierwszego widoku mapy powinny wynikac z realnych problemow z czytelnoscia, kolizjami, kadrowaniem albo pustym stanem.

## Work Guidance

- Zmiany gestosci, rozmiaru i priorytetu markerow trzymaj w helperach, z testami jednostkowymi.
- Ciągły zoom gładzika MacBooka nie może wysyłać `zoomend` ani `moveend` w każdej klatce. Kończ gest jednym zdarzeniem terminalnym; zachowaj osobne ścieżki kółka myszy i mobilnego touch zoomu.
- Testy zoomu sprawdzają `map.getZoom()` i liczbę końcowych zdarzeń Leaflet, nie szerokość pierwszej miniaturki (zestaw markerów zmienia się wraz z gęstością).
- Leaflet-specific HTML i event edge cases trzymaj poza duzym komponentem mapy.
- Sheets mapy maja byc akcjocentryczne: pokazuj tylko dane potrzebne do raportu, pamiatki, zdjecia albo podgladu.
- Po optymalizacji danych sprawdz, czy mapa nadal ma efekt miniatur w pierwszym widoku.

## Verification

- `cd frontend && npm run test -- src/components/map`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e` po zmianach markerow, warstw, sheets albo pierwszego widoku mapy.

## Child Index

Brak lokalnych child docs.
