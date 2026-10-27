import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";

import { MAP_TOUR_STEPS, type MapTourStep, tourActionSelector } from "./mapTourSteps";

type TourContent = {
  title: string;
  description: string;
  hint?: string;
};

const TOUR_CONTENT: Record<MapTourStep, TourContent> = {
  welcome: {
    title: "Odkryj PhotoMap",
    description: "Poznaj miasto przez zdjęcia i wspomnienia. Pokażemy Ci, jak przeglądać miejsca na interaktywnej mapie.",
  },
  place: {
    title: "Wybierz miejsce",
    description: "Kliknij dowolną miniaturę miejsca na mapie. Otworzysz jego wachlarz fotografii.",
    hint: "Kliknij dowolne miejsce, aby kontynuować",
  },
  gallery: {
    title: "Zajrzyj do galerii",
    description: "Z rozwiniętego wachlarza wybierz dowolne zdjęcie, które Cię zainteresuje.",
    hint: "Kliknij dowolną fotografię w wachlarzu",
  },
  photo: {
    title: "Historie ukryte w zdjęciach",
    description: "Otworzone zdjęcie ma informacje o miejscu, opis i dodatkowe akcje w górnym pasku.",
  },
  sound: {
    title: "Posłuchaj dźwięków miejsca",
    description: "Jeśli fotografia ma nagranie, możesz odtworzyć dźwięki miejsca. Nie włączamy ich automatycznie.",
  },
  narration: {
    title: "Opis czytany przez lektora",
    description: "Lektor może przeczytać opis zdjęcia, a ikona dokumentu pozwoli przeczytać go samodzielnie.",
  },
  pin: {
    title: "Przypnij zdjęcie na mapie",
    description: "Kliknij pinezkę w oknie zdjęcia. Utworzysz pływającą kartę, którą możesz przesuwać i zmieniać jej rozmiar.",
    hint: "Kliknij przycisk przypinania w oknie zdjęcia",
  },
  pinned: {
    title: "Twoja przypięta fotografia",
    description: "Spróbuj przesunąć lub powiększyć kartę. Ikona mapy pokaże jej miejsce, a krzyżyk tylko odepnie kartę.",
  },
  memory: {
    title: "Dodaj własne wspomnienie",
    description: "W wachlarzu zdjęć wybranego miejsca znajdziesz kafelek z plusem. Kliknij go, aby otworzyć formularz wspomnienia.",
    hint: "Kliknij plus w galerii miejsca",
  },
  "memory-form": {
    title: "Wspomnienie i jego token",
    description: "Wybierz lub wygeneruj token, a następnie dodaj zdjęcie i wymagane dane. Publikacja nastąpi dopiero po wysłaniu i moderacji. Tutorial niczego nie wysyła.",
  },
  layers: {
    title: "Mapa na Twoich zasadach",
    description: "W menu możesz zmienić warstwy Polecane, Miejsca i Pamiątki. Znajdziesz tam również przełącznik automatycznego odtwarzania dźwięków.",
    hint: "Wybierz dowolną warstwę w menu",
  },
  routes: {
    title: "Odkrywaj gotowe trasy",
    description: "W zakładce Trasy znajdziesz kolekcje miejsc do zobaczenia podczas spaceru.",
  },
  done: {
    title: "Teraz Twoja kolej!",
    description: "Wiesz już, jak otwierać zdjęcia, słuchać nagrań, przypinać fotografie i dodawać wspomnienia. Samouczek możesz ponownie otworzyć z menu.",
  },
};

function actionAvailable(selector: string): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).some((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 8 && rect.height >= 8 &&
      rect.bottom > 0 && rect.right > 0 &&
      rect.top < window.innerHeight && rect.left < window.innerWidth;
  });
}

type Props = {
  step: MapTourStep;
  onBack: () => void;
  onNext: () => void;
  onSkipStep: () => void;
  onClose: () => void;
};

export function MapTour({ step, onBack, onNext, onSkipStep, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const [hasActionTarget, setHasActionTarget] = useState(false);
  const content = TOUR_CONTENT[step];
  const actionSelector = tourActionSelector(step);
  const actionRequired = actionSelector !== null;
  const actionMissing = actionRequired && !hasActionTarget;
  const index = MAP_TOUR_STEPS.indexOf(step);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (lastFocused.current?.isConnected) lastFocused.current.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!actionSelector) {
      setHasActionTarget(false);
      return;
    }

    const measure = () => setHasActionTarget(actionAvailable(actionSelector));
    measure();
    // Leaflet mounts the fan outside React and some controls become available
    // after an API response. We only observe availability, never choose a tile.
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [actionSelector]);

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

  return createPortal(
    <div className="map-tour" data-tour-step={step}>
      <section
        aria-label="Samouczek PhotoMap"
        className="map-tour-card"
        ref={cardRef}
        role="region"
        tabIndex={-1}
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
        {actionRequired && hasActionTarget ? (
          <span className="map-tour-hint">{content.hint}</span>
        ) : null}
        {actionMissing ? (
          <span className="map-tour-hint">Ta funkcja nie jest dostępna w aktualnym widoku. Możesz pominąć krok.</span>
        ) : null}
        <div className="map-tour-actions">
          <button className="map-tour-skip" type="button" onClick={onClose}>Pomiń</button>
          <div className="map-tour-navigation">
            {step !== "welcome" ? (
              <button className="map-tour-secondary" type="button" onClick={onBack} aria-label="Poprzedni krok">
                <ArrowLeft size={17} aria-hidden="true" />
              </button>
            ) : null}
            <button
              className="map-tour-next"
              type="button"
              disabled={actionRequired && hasActionTarget}
              onClick={actionMissing ? onSkipStep : onNext}
            >
              {step === "done" ? "Zaczynam!" : actionMissing ? "Pomiń krok" : step === "welcome" ? "Odkrywaj" : "Dalej"}
              {step === "done" ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
