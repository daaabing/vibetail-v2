import { useCallback, useEffect, useRef, useState } from "react";
import type { Cocktail } from "@/lib/cocktails-store";
import { renderSharePosterToCanvas } from "@/lib/share-poster-canvas";

type Status = "idle" | "preparing" | "ready" | "error";

export interface SharePosterState {
  status: Status;
  dataUrl: string | null;
  blob: Blob | null;
  file: File | null;
  error: string | null;
  retry: () => void;
}

/**
 * Prepares the export PNG for the 2:3 share poster in the background so the
 * Save button becomes instant. Rendered with pure canvas draws — no
 * html-to-image, no foreignObject, no CSS blend modes — so the illustration
 * and QR always land in the exported file.
 */
export function useSharePosterPreparation(opts: {
  cocktail: Cocktail | null | undefined;
  cocktailId: string | number | null | undefined;
  illustrationSource: string | null;
  qrDataUrl: string | null;
  filename: string;
  lang: "zh" | "en";
  enabled: boolean;
}): SharePosterState {
  const { cocktail, cocktailId, illustrationSource, qrDataUrl, filename, lang, enabled } = opts;
  const [status, setStatus] = useState<Status>("idle");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inflightKeyRef = useRef<string | null>(null);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!illustrationSource) return;
    if (!cocktail) return;

    const key = `${cocktailId ?? "preview"}::${illustrationSource}::${qrDataUrl ?? ""}::${lang}::${attempt}`;
    if (inflightKeyRef.current === key) return;
    inflightKeyRef.current = key;

    let cancelled = false;
    setStatus("preparing");
    setError(null);

    (async () => {
      try {
        const { blob: b, dataUrl: url } = await renderSharePosterToCanvas({
          cocktail,
          illustrationSource,
          qrDataUrl,
          lang,
        });
        if (cancelled) return;
        const f = new File([b], filename, { type: "image/png" });
        setDataUrl(url);
        setBlob(b);
        setFile(f);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        console.error("share poster prepare failed", e);
        setError((e as Error)?.message ?? "prepare failed");
        setStatus("error");
        inflightKeyRef.current = null; // allow retry
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cocktailId, illustrationSource, qrDataUrl, filename, lang, attempt]);

  return { status, dataUrl, blob, file, error, retry };
}
