import { useEffect, useRef, useState } from "react";

type Props = {
  ready: boolean;
  onExited: () => void;
};

const MIN_VISIBLE_MS = 950;
const FADE_DURATION_MS = 560;

export function MapLoadingScreen({ ready, onExited }: Props) {
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<"visible" | "fading" | "finished">("visible");

  useEffect(() => {
    if (!ready || phase !== "visible") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 0 : Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const timeout = window.setTimeout(() => {
      if (reducedMotion) {
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
        <path
          d="m110 550 42-22 48 14m278-31 45-31 49 34m369 3 45-40 52 36m219-16 34-22 52 18"
          stroke="var(--map-intro-mountain-highlight)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          opacity=".5"
        />
        <path
          d="M0 679q210-43 368-18t333-19q222-62 400-19t339-22"
          stroke="var(--map-intro-mountain-highlight)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity=".48"
        />
        <g fill="var(--map-intro-forest)" opacity=".62">
          <path d="m85 754 20-50 20 50h-11v30H96v-30Zm26-24 17-41 17 41h-9v26h-16v-26Zm1145-20 18-45 18 45h-10v28h-16v-28Zm25 26 20-51 20 51h-11v30h-18v-30Z" />
        </g>
        <path
          d="M0 863q215-75 450-24t462-7q264-80 528 3"
          stroke="var(--map-intro-mountain-highlight)"
          strokeWidth="5"
          fill="none"
          opacity=".26"
        />
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
              <stop offset=".55" stopColor="var(--map-intro-map-green)" />
              <stop offset="1" stopColor="var(--map-intro-map-light)" />
            </linearGradient>
            <clipPath id="map-intro-paper-clip">
              <path d="M42 169 193 113l155 40 159-49 172 58-30 222-155-43-154 43-159-40L25 377Z" />
            </clipPath>
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
            <g clipPath="url(#map-intro-paper-clip)">
              <path
                d="M70 196q53-40 103-18t83-4q43-16 78-1t92-23q43-20 87-5t114 13l44 18-6 68q-47 12-71 42t-74 18q-58-29-112 0t-93-7q-57-24-126 8t-131-11Z"
                fill="var(--map-intro-terrain)"
                opacity=".13"
              />
              <path
                d="M78 328q73-34 103-9t75-9q49-31 104-7t81-10q44-23 100-9t92 8M95 210q50-30 92-18t77-4q66-23 120-5t89-14q65-27 141-8"
                fill="none"
                stroke="var(--map-intro-terrain)"
                strokeWidth="2.5"
                opacity=".32"
                strokeLinecap="round"
              />
              <path
                d="m93 147 23 55 45 29m120-98-25 73 40 32m137-104-32 81 24 46m170-121-31 69 45 50m-478 90 48-39 61 23m79 18 75-51 58 20m78 36 54-35 62 22"
                fill="none"
                stroke="var(--map-intro-road)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity=".9"
              />
              <path
                d="m93 147 23 55 45 29m120-98-25 73 40 32m137-104-32 81 24 46m170-121-31 69 45 50m-478 90 48-39 61 23m79 18 75-51 58 20m78 36 54-35 62 22"
                fill="none"
                stroke="var(--map-intro-road-secondary)"
                strokeWidth="1.7"
                strokeDasharray="4 8"
                opacity=".7"
              />
              <path
                d="m231 271 48-32 33 13-17 50-57 1Zm296-70 54-19 36 32-17 36-50-8ZM89 315l54-20 22 18-28 40-54 5Z"
                fill="var(--map-intro-park)"
                opacity=".85"
              />
              <path
                d="M112 323c8-9 19-9 27-3m105-38c14-10 23-8 37-6m261-57c16-9 28-8 40 0"
                fill="none"
                stroke="var(--map-intro-map-light)"
                strokeWidth="3"
                opacity=".8"
              />
              <g fill="var(--map-intro-city)" opacity=".88">
                <rect x="306" y="188" width="19" height="13" rx="2" transform="rotate(13 315 195)" />
                <rect x="331" y="195" width="11" height="24" rx="2" transform="rotate(13 336 207)" />
                <rect x="299" y="211" width="25" height="13" rx="2" transform="rotate(13 311 217)" />
                <rect x="451" y="307" width="17" height="13" rx="2" transform="rotate(-15 460 313)" />
                <rect x="476" y="297" width="19" height="18" rx="2" transform="rotate(-15 485 306)" />
                <rect x="146" y="253" width="18" height="12" rx="2" />
              </g>
              <g fill="var(--map-intro-label)" fontSize="12" fontWeight="750" letterSpacing="2" opacity=".83">
                <text x="244" y="179" transform="rotate(9 244 179)" fontSize="10" letterSpacing="1.3">
                  STARE MIASTO
                </text>
                <text x="542" y="273" transform="rotate(-11 542 273)" fontSize="10">
                  PARK
                </text>
              </g>
              <path
                d="m347 228 40 12m-42 5 40 12"
                stroke="var(--map-intro-road)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity=".95"
              />
            </g>
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
            <path
              d="m88 206 23-7 27 9 36-12 27 9"
              fill="none"
              stroke="var(--map-intro-snow)"
              strokeWidth="2.5"
              opacity=".75"
            />
            <circle cx="188" cy="150" r="8" fill="var(--map-intro-sun)" />
            <path
              d="m108 191 5-14 6 14m-24 4 4-11 5 11"
              stroke="var(--map-intro-photo-land)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="map-loading-photo map-loading-photo--two">
            <rect x="400" y="35" width="142" height="102" rx="13" fill="var(--map-intro-snow)" />
            <rect x="407" y="42" width="128" height="88" rx="8" fill="var(--map-intro-photo-sky)" />
            <path d="m407 116 35-39 23 21 28-36 42 53v15H407Z" fill="var(--map-intro-mountain-mid)" />
            <path d="M407 118q32-19 66-4t62-6v22H407Z" fill="var(--map-intro-forest)" />
            <path
              d="m442 113 10-31 9 31m30-4 7-24 7 24"
              fill="none"
              stroke="var(--map-intro-photo-land)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path d="M407 124q33-8 64 2t64-4" fill="none" stroke="var(--map-intro-snow)" strokeWidth="2" opacity=".6" />
          </g>
          <g className="map-loading-photo map-loading-photo--three">
            <rect x="494" y="329" width="147" height="97" rx="13" fill="var(--map-intro-snow)" />
            <rect x="501" y="336" width="133" height="83" rx="8" fill="var(--map-intro-photo-sky)" />
            <path d="m501 404 43-41 28 26 24-32 38 47v15H501Z" fill="var(--map-intro-mountain-mid)" />
            <path d="M501 404q40-13 65 0t68-6v21H501Z" fill="var(--map-intro-forest)" />
            <path
              d="m516 401 7-21 7 21m54 0 8-28 8 28m14-3 7-19 6 19"
              fill="none"
              stroke="var(--map-intro-photo-land)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="m503 414 28-4 34 6 37-5 29 1"
              fill="none"
              stroke="var(--map-intro-water)"
              strokeWidth="2"
              opacity=".65"
            />
          </g>
        </svg>
        <p className="map-loading-label">
          Ładowanie mapy<span className="map-loading-ellipsis">...</span>
        </p>
      </div>
    </div>
  );
}
