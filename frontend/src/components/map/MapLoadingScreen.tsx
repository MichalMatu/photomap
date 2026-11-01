import { useEffect, useRef, useState } from "react";

type Props = {
  ready: boolean;
  onExited: () => void;
};

const MIN_VISIBLE_MS = 450;
const FADE_DURATION_MS = 520;

export function MapLoadingScreen({ ready, onExited }: Props) {
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<"visible" | "fading" | "finished">("visible");

  useEffect(() => {
    if (!ready || phase !== "visible") return;

    const delay = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const timeout = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPhase("finished");
        onExited();
      } else {
        setPhase("fading");
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [onExited, phase, ready]);

  useEffect(() => {
    if (phase !== "fading") return;
    const timeout = window.setTimeout(() => {
      setPhase("finished");
      onExited();
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [onExited, phase]);

  if (phase === "finished") return null;

  return (
    <div
      className={`map-loading-screen${phase === "fading" ? " map-loading-screen--fading" : ""}`}
      data-testid="map-loading-screen"
      role="status"
      aria-label="Ładowanie mapy PhotoMap"
      aria-live="polite"
    >
      <svg
        className="map-loading-landscape"
        aria-hidden="true"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="map-intro-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--map-intro-sky-top)" />
            <stop offset=".68" stopColor="var(--map-intro-sky-bottom)" />
            <stop offset="1" stopColor="var(--map-intro-horizon)" />
          </linearGradient>
          <radialGradient id="map-intro-sun-glow">
            <stop offset="0" stopColor="var(--map-intro-sun)" stopOpacity=".78" />
            <stop offset="1" stopColor="var(--map-intro-sun)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#map-intro-sky)" />
        <circle cx="1150" cy="360" r="360" fill="url(#map-intro-sun-glow)" />
        <circle cx="1150" cy="360" r="48" fill="var(--map-intro-sun)" opacity=".75" />
        <path
          d="M0 545 145 445 260 492 400 335 545 482 664 391 818 521 942 383 1130 502 1280 380 1440 488V900H0Z"
          fill="var(--map-intro-mountain-far)"
        />
        <path
          d="m315 411 85-76 84 87-68-26-28 23-24-15Z M881 460l61-77 78 89-68-29-34 22Z M1238 425l42-45 68 59-56-18-19 14Z"
          fill="var(--map-intro-snow)"
          opacity=".82"
        />
        <path
          d="M0 640 152 540 290 599 458 468 615 608 760 523 940 627 1120 479 1290 558 1440 475V900H0Z"
          fill="var(--map-intro-mountain-mid)"
        />
        <path
          d="M0 750 200 647 330 699 505 615 670 713 827 610 1020 705 1172 605 1440 678V900H0Z"
          fill="var(--map-intro-mountain-near)"
        />
        <path d="M0 797q240-108 490-40t480-28q230-100 470 12v159H0Z" fill="var(--map-intro-forest)" opacity=".78" />
      </svg>

      <div className="map-loading-content">
        <div className="map-loading-brand">
          <svg className="map-loading-logo" viewBox="0 0 88 88" aria-hidden="true">
            <path
              d="M19 23h12l7-9h18l7 9h10a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H15a8 8 0 0 1-8-8V31a8 8 0 0 1 8-8Z"
              fill="none"
              stroke="var(--map-intro-brand-blue)"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path d="m16 63 18-17 11 11 12-16 16 22Z" fill="var(--map-intro-brand-green)" />
            <path
              d="M58 29c-12 0-20 9-20 20 0 13 20 31 20 31s20-18 20-31c0-11-8-20-20-20Z"
              fill="var(--map-intro-brand-green)"
              stroke="var(--map-intro-snow)"
              strokeWidth="3"
            />
            <circle cx="58" cy="48" r="7" fill="var(--map-intro-snow)" />
          </svg>
          <div className="map-loading-brand-name">
            Photo<span>Map</span>
          </div>
          <p>Odkrywaj miejsca przez zdjęcia</p>
        </div>

        <svg className="map-loading-map" viewBox="0 0 720 440" aria-hidden="true">
          <defs>
            <linearGradient id="map-intro-paper" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--map-intro-map-light)" />
              <stop offset="1" stopColor="var(--map-intro-map-green)" />
            </linearGradient>
          </defs>
          <g className="map-loading-paper">
            <path
              d="M42 169 193 113l155 40 159-49 172 58-30 222-155-43-154 43-159-40L25 377Z"
              fill="url(#map-intro-paper)"
              stroke="var(--map-intro-snow)"
              strokeWidth="11"
              strokeLinejoin="round"
            />
            <path
              d="m193 113-12 231 159 40 8-231ZM507 104l-13 237-154 43 8-231Z"
              fill="var(--map-intro-map-fold)"
              opacity=".38"
            />
            <path
              d="m193 113-12 231 159 40 8-231 159-49-13 237"
              fill="none"
              stroke="var(--map-intro-snow)"
              strokeWidth="3"
              opacity=".63"
            />
            <path
              d="M55 300q67-81 143-74t136 19q93 25 169-33t150 46"
              fill="none"
              stroke="var(--map-intro-water)"
              strokeWidth="15"
              opacity=".67"
            />
            <path
              className="map-loading-route"
              d="M72 301q92-90 180-63t133 50q49 18 95-37t169 8"
              stroke="var(--map-intro-route)"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="map-loading-route map-loading-route--secondary"
              d="M219 140q15 94 93 105t45 121M521 123q-79 100-48 200"
              stroke="var(--map-intro-snow)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <g className="map-loading-pin map-loading-pin--one">
              <path
                d="M196 241c-13 0-23 10-23 23 0 17 23 43 23 43s23-26 23-43c0-13-10-23-23-23Z"
                fill="var(--map-intro-pin)"
                stroke="var(--map-intro-snow)"
                strokeWidth="4"
              />
              <circle cx="196" cy="264" r="8" fill="var(--map-intro-snow)" />
            </g>
            <g className="map-loading-pin map-loading-pin--two">
              <path
                d="M386 169c-13 0-23 10-23 23 0 17 23 43 23 43s23-26 23-43c0-13-10-23-23-23Z"
                fill="var(--map-intro-pin)"
                stroke="var(--map-intro-snow)"
                strokeWidth="4"
              />
              <circle cx="386" cy="192" r="8" fill="var(--map-intro-snow)" />
            </g>
            <g className="map-loading-pin map-loading-pin--three">
              <path
                d="M553 277c-13 0-23 10-23 23 0 17 23 43 23 43s23-26 23-43c0-13-10-23-23-23Z"
                fill="var(--map-intro-pin)"
                stroke="var(--map-intro-snow)"
                strokeWidth="4"
              />
              <circle cx="553" cy="300" r="8" fill="var(--map-intro-snow)" />
            </g>
          </g>
          <g className="map-loading-photo map-loading-photo--one">
            <rect x="75" y="124" width="145" height="102" rx="13" fill="var(--map-intro-snow)" />
            <rect x="82" y="131" width="131" height="88" rx="8" fill="var(--map-intro-photo-sky)" />
            <path d="m82 205 33-48 30 31 25-42 43 59v14H82Z" fill="var(--map-intro-mountain-mid)" />
            <path d="m82 203 38-11 31 15 35-20 27 13v19H82Z" fill="var(--map-intro-water)" />
          </g>
          <g className="map-loading-photo map-loading-photo--two">
            <rect x="400" y="35" width="142" height="102" rx="13" fill="var(--map-intro-snow)" />
            <rect x="407" y="42" width="128" height="88" rx="8" fill="var(--map-intro-photo-sky)" />
            <path d="m407 116 35-39 23 21 28-36 42 53v15H407Z" fill="var(--map-intro-mountain-mid)" />
            <path d="M407 118q32-19 66-4t62-6v22H407Z" fill="var(--map-intro-forest)" />
          </g>
          <g className="map-loading-photo map-loading-photo--three">
            <rect x="494" y="329" width="147" height="97" rx="13" fill="var(--map-intro-snow)" />
            <rect x="501" y="336" width="133" height="83" rx="8" fill="var(--map-intro-photo-sky)" />
            <path d="m501 404 43-41 28 26 24-32 38 47v15H501Z" fill="var(--map-intro-mountain-mid)" />
            <path d="M501 404q40-13 65 0t68-6v21H501Z" fill="var(--map-intro-forest)" />
          </g>
        </svg>
        <p className="map-loading-label">
          Ładowanie mapy<span className="map-loading-ellipsis">...</span>
        </p>
      </div>
    </div>
  );
}
