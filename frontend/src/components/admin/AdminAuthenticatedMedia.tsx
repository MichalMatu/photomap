import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Volume2 } from "lucide-react";

import { mediaUrl, requestBlob } from "../../api/http";
import type { AudioAttachment } from "../../api/types";
import { requestAdminImageBlob } from "./adminMediaFetchQueue";

type AdminMediaImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string;
};

function isAdminMediaPath(path: string) {
  return path.startsWith("/api/admin/");
}

function useAuthenticatedMediaUrl(path: string | null, queued = false) {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path || !isAdminMediaPath(path)) {
      return undefined;
    }

    const controller = new AbortController();
    let nextObjectUrl: string | null = null;
    const fetchMedia = queued
      ? requestAdminImageBlob(path, controller.signal)
      : requestBlob(path, { signal: controller.signal });

    fetchMedia
      .then((blob) => {
        if (controller.signal.aborted) {
          return;
        }
        nextObjectUrl = URL.createObjectURL(blob);
        setLoaded({ path, url: nextObjectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded(null);
        }
      });

    return () => {
      controller.abort();
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [path, queued]);

  if (!path) {
    return null;
  }
  return isAdminMediaPath(path) ? (loaded?.path === path ? loaded.url : null) : mediaUrl(path);
}

export function AdminMediaImage({ src, ...props }: AdminMediaImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const privateMedia = isAdminMediaPath(src);

  useEffect(() => {
    if (!privateMedia) {
      return undefined;
    }
    const element = imageRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [privateMedia, src]);

  const resolvedSrc = useAuthenticatedMediaUrl(!privateMedia || visible ? src : null, true);

  // Keep the <img> mounted even before fetching: this allows IntersectionObserver
  // to detect offscreen thumbnails, unlike conditional rendering of the image.
  return <img {...props} ref={imageRef} src={resolvedSrc ?? undefined} />;
}

export function AdminAudioPlayer({ audio }: { audio: AudioAttachment | null }) {
  const resolvedSrc = useAuthenticatedMediaUrl(audio?.public_path ?? null);

  if (!audio || !resolvedSrc) {
    return null;
  }

  return (
    <div className="audio-attachment-player audio-attachment-player--default">
      <Volume2 aria-hidden="true" size={16} />
      <audio controls preload="metadata" src={resolvedSrc}>
        Twoja przeglądarka nie obsługuje odtwarzania audio.
      </audio>
    </div>
  );
}
