import { useCallback, useEffect, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { SHARE_CARD_H, SHARE_CARD_W } from "@/components/screens/ShareCard";

type Status = "idle" | "preparing" | "ready" | "error";

export interface SharePosterState {
  status: Status;
  dataUrl: string | null;
  blob: Blob | null;
  file: File | null;
  error: string | null;
  retry: () => void;
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      try {
        if (typeof img.decode === "function") {
          await img.decode();
          if (img.naturalWidth > 0) return;
        }
      } catch {
        /* fall through */
      }
      await new Promise<void>((resolve) => {
        const to = window.setTimeout(resolve, 3000);
        img.onload = () => { window.clearTimeout(to); resolve(); };
        img.onerror = () => { window.clearTimeout(to); resolve(); };
      });
    }),
  );
}

/**
 * Prepares the export PNG for the offscreen ShareCard in the background,
 * caching it so the Save button becomes instant. Re-runs when identity of
 * the cocktail / illustration / QR changes.
 */
export function useSharePosterPreparation(opts: {
  ref: React.RefObject<HTMLDivElement | null>;
  cocktailId: string | number | null | undefined;
  illustrationSource: string | null;
  qrDataUrl: string | null;
  filename: string;
  enabled: boolean;
}): SharePosterState {
  const { ref, cocktailId, illustrationSource, qrDataUrl, filename, enabled } = opts;
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
    const node = ref.current;
    if (!node) return;

    const key = `${cocktailId ?? "preview"}::${illustrationSource}::${qrDataUrl ?? ""}::${attempt}`;
    if (inflightKeyRef.current === key) return;
    inflightKeyRef.current = key;

    let cancelled = false;
    setStatus("preparing");
    setError(null);

    (async () => {
      try {
        // give layout a tick
        await new Promise((r) => setTimeout(r, 30));
        await waitForImages(node);
        const png = await htmlToImage.toPng(node, {
          pixelRatio: 1,
          cacheBust: true,
          canvasWidth: SHARE_CARD_W,
          canvasHeight: SHARE_CARD_H,
          width: SHARE_CARD_W,
          height: SHARE_CARD_H,
          backgroundColor: "#EFE4CE",
          skipFonts: true,
        });
        if (cancelled) return;
        const b = await (await fetch(png)).blob();
        const f = new File([b], filename, { type: "image/png" });
        setDataUrl(png);
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
  }, [enabled, cocktailId, illustrationSource, qrDataUrl, filename, attempt]);

  return { status, dataUrl, blob, file, error, retry };
}
