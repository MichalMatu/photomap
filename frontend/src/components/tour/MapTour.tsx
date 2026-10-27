import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";

import { MAP_TOUR_STEPS, type MapTourStep } from "./mapTourSteps";

type TargetRect = { top: number; left: number; width: number; height: number };

type TourContent = {
  title: string;
  description: string;
  selector?: string;
  hint?: string;
};

const TOUR_CONTENT: Record<MapTourStep, TourContent> = {
  welcome: {
    title: "Odkryj PhotoMap",
    description: "Poznaj miasto przez zdjęcia i wspomnienia. Pokażemy Ci, jak przeglądać miejsca na interaktywnej mapie.",
  },
  place: {
    title: "Wybierz miejsce",
    description: "Kliknij jedną z miniaturek na mapie. Otworzysz galerię zdjęć tego miejsca.",
    selector: ".place-photo-marker:not(.is-selected) > span",
    hint: "Kliknij podświetlone miejsce",
  },
  gallery: {
    title: "Zajrzyj do galerii",
    description: "Każde miejsce może mieć wiele fotografii i pamiątek. Kliknij dowolną miniaturkę z rozwiniętej galerii.",
    selector: ".photo-gallery-marker > span",
    hint: "Otwórz zdjęcie z galerii",
  },
  photo: {
    title: "Historie ukryte w zdjęciach",
    description: "Otworzone zdjęcie ma informacje o miejscu, opis i dodatkowe akcje w górnym pasku.",
    selector: ".system-modal--media .photo-detail-content",
  },
  sound: {
    title: "Posłuchaj dźwięków miejsca",
    description: "Gdy fotografia ma nagranie, przycisk odtwarzania pozwoli posłuchać atmosfery miejsca. Nagranie jest opcjonalne i nie uruchamiamy go za Ciebie.",
    selector: ".system-modal--media .photo-detail-audio-toggle",
    hint: "Możesz włączyć i zatrzymać nagranie",
  },
  narration: {
    title: "Opis czytany przez lektora",
    description: "Przycisk lektora odczytuje opis fotografii. Obok jest ikona dokumentu, która otwiera tekst do samodzielnego przeczytania.",
    selector: '.system-modal--media button[aria-label="Odczytaj opis zdjęcia"]',
    hint: "Odtwarzanie lektora jest dobrowolne",
  },
  pin: {
    title: "Przypnij zdjęcie na mapie",
    description: "Pinezka tworzy pływającą kartę ze zdjęciem nad mapą. Możesz ją przesuwać, zmieniać rozmiar i później odpiąć.",
    selector: '.system-modal--media button[aria-label^="Przypnij"]',
    hint: "Kliknij pinezkę, aby przypiąć to zdjęcie",
  },
  pinned: {
    title: "Twoja przypięta fotografia",
    description: "Przypięte zdjęcie można przesuwać i powiększać. Ikona mapy wskazuje jego miejsce, a krzyżyk usuwa tylko tę kartę, nie fotografię z serwisu.",
    selector: ".pinned-media-card",
  },
  memory: {
    title: "Dodaj własne wspomnienie",
    description: "W rozwiniętej galerii miejsca kliknij kafelek z plusem. W ten sposób dodasz swoją fotografię i wspomnienie z odwiedzonego miejsca.",
    selector: ".photo-gallery-add-marker > span",
    hint: "Kliknij plus przy galerii miejsca",
  },
  "memory-form": {
    title: "Wspomnienie i jego token",
    description: "Wybierz lub wygeneruj token — pozwoli Ci później zarządzać wspomnieniem. Następnie dodaj zdjęcie i wymagane dane. Publikacja nastąpi dopiero po wysłaniu i moderacji. W tutorialu niczego nie wysyłamy.",
    selector: ".memory-sheet-content",
  },
  layers: {
    title: "Mapa na Twoich zasadach",
    description: "Włącz lub wyłącz warstwę w menu: Polecane, Miejsca albo Pamiątki. Zobacz, jak zmienia się widok mapy.",
    selector: "#app-side-drawer .drawer-section--layers",
    hint: "Wybierz jedną z warstw",
  },
  routes: {
    title: "Odkrywaj gotowe trasy",
    description: "W zakładce Trasy znajdziesz kolekcje miejsc do zobaczenia podczas spaceru. Możesz do nich wrócić w dowolnej chwili.",
    selector: '#app-side-drawer a[href="/guides"]',
  },
  done: {
    title: "Teraz Twoja kolej!",
    description: "Umiesz już otwierać zdjęcia, słuchać nagrań i lektora, przypinać fotografie oraz dodawać wspomnienia. Wróć do samouczka w dowolnym momencie z menu.",
  },
};

function visibleTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const elements = document.querySelectorAll<HTMLElement>(selector);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (
      rect.width >= 8 && rect.height >= 8 &&
      rect.bottom > 8 && rect.right > 8 &&
      rect.top < viewportHeight - 8 && rect.left < viewportWidth - 8
    ) return element;
  }
  return null;
}

function mapTourPlacement(
  target: TargetRect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const margin = 12;
  const gap = 18;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const left = target ? target.left + target.width / 2 - card.width / 2 : (viewport.width - card.width) / 2;
  const maxLeft = Math.max(margin, viewport.width - card.width - margin);
  const maxTop = Math.max(margin, viewport.height - card.height - margin);
  if (!target) {
    return { left: clamp(left, margin, maxLeft), top: clamp((viewport.height - card.height) / 2, margin, maxTop) };
  }
  const below = target.top + target.height + gap;
  const above = target.top - card.height - gap;
  const right = target.left + target.width + gap;
  const leftSide = target.left - card.width - gap;
  // On an interactive step the entire highlighted tile must stay clickable.
  // Try all four sides before clamping; clamping an overflowing tooltip onto
  // the tile would make the tutorial block the action it asks for.
  if (below + card.height + margin <= viewport.height) {
    return { left: clamp(left, margin, maxLeft), top: below };
  }
  if (above >= margin) {
    return { left: clamp(left, margin, maxLeft), top: above };
  }
  if (right + card.width + margin <= viewport.width) {
    return { left: right, top: clamp(target.top + target.height / 2 - card.height / 2, margin, maxTop) };
  }
  if (leftSide >= margin) {
    return { left: leftSide, top: clamp(target.top + target.height / 2 - card.height / 2, margin, maxTop) };
  }
  // Very small screens can lack space on all sides: keep the card in bounds
  // while minimizing overlap rather than masking the target entirely.
  const top = target.top > viewport.height / 2 ? margin : maxTop;
  return { left: clamp(left, margin, maxLeft), top: clamp(top, margin, maxTop) };
}

type Props = {
  step: MapTourStep;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function MapTour({ step, onBack, onNext, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const content = TOUR_CONTENT[step];
  const targetMissing = Boolean(content.selector && !targetRect);
  const isEnd = step === "done";
  const isWelcome = step === "welcome";
  const index = MAP_TOUR_STEPS.indexOf(step);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (lastFocused.current?.isConnected) lastFocused.current.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const target = visibleTarget(content.selector);
      const rect = target?.getBoundingClientRect();
      const pad = 7;
      const nextRect = rect ? {
        left: Math.max(8, rect.left - pad),
        top: Math.max(8, rect.top - pad),
        width: Math.min(window.innerWidth - 8, rect.right + pad) - Math.max(8, rect.left - pad),
        height: Math.min(window.innerHeight - 8, rect.bottom + pad) - Math.max(8, rect.top - pad),
      } : null;
      setTargetRect(nextRect);
      const card = cardRef.current?.getBoundingClientRect();
      if (card) setPosition(mapTourPlacement(nextRect, card, { width: window.innerWidth, height: window.innerHeight }));
    };
    measure();
    // Leaflet inserts/moves the marker DOM outside of React's commit cycle.
    const intervalId = window.setInterval(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [content.selector, step]);

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeys, true);
    return () => document.removeEventListener("keydown", handleKeys, true);
  }, [onClose]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [step]);

  const backdrop = "map-tour-shade";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cutout = targetRect && targetRect.width > 0 && targetRect.height > 0 ? targetRect : null;
  const shadeRects = cutout
    ? [
        { left: 0, top: 0, width: vw, height: cutout.top },
        { left: 0, top: cutout.top, width: cutout.left, height: cutout.height },
        { left: cutout.left + cutout.width, top: cutout.top, width: vw - cutout.left - cutout.width, height: cutout.height },
        { left: 0, top: cutout.top + cutout.height, width: vw, height: vh - cutout.top - cutout.height },
      ]
    : [{ left: 0, top: 0, width: vw, height: vh }];

  return createPortal(
    <div className="map-tour" data-tour-step={step}>
      {shadeRects.map((rect, idx) => (
        <div aria-hidden="true" className={backdrop} key={idx} style={rect} />
      ))}
      {cutout ? <div className={step === "place" || step === "gallery" ? "map-tour-spotlight is-media-tile" : "map-tour-spotlight"} aria-hidden="true" style={cutout} /> : null}
      <section
        aria-label="Samouczek PhotoMap"
        className="map-tour-card"
        ref={cardRef}
        role="region"
        tabIndex={-1}
        style={position}
      >
        <div className="map-tour-topline">
          <span className="map-tour-kicker"><Compass size={16} aria-hidden="true" /> PhotoMap</span>
          <button className="map-tour-close" type="button" aria-label="Zakończ samouczek" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="map-tour-progress" aria-label={`Krok ${index + 1} z ${MAP_TOUR_STEPS.length}`}>
          {MAP_TOUR_STEPS.map((item, i) => (
            <span key={item} className={i <= index ? "is-done" : ""} />
          ))}
        </div>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        {content.hint && !targetMissing ? <span className="map-tour-hint">{content.hint}</span> : null}
        {targetMissing ? <span className="map-tour-hint">Element niedostępny w tym widoku. Możesz przejść dalej.</span> : null}
        <div className="map-tour-actions">
          <button className="map-tour-skip" type="button" onClick={onClose}>Pomiń</button>
          <div className="map-tour-navigation">
            {!isWelcome ? (
              <button className="map-tour-secondary" type="button" onClick={onBack} aria-label="Poprzedni krok">
                <ArrowLeft size={17} aria-hidden="true" />
              </button>
            ) : null}
            <button className="map-tour-next" type="button" onClick={onNext}>
              {isEnd ? "Zaczynam!" : content.hint && !targetMissing ? "Dalej" : isWelcome ? "Odkrywaj" : "Dalej"}
              {isEnd ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
