import type { Cocktail } from "@/lib/cocktails-store";

/* ────────────────────────────────────────────────────────────────────────
   Shared drawing engine for all share-poster layout strategies.
   Layout files (layout-2x2 / layout-2x3 / layout-3x2) compose these
   primitives; they own only geometry decisions.
   ──────────────────────────────────────────────────────────────────────── */

export interface RenderOpts {
  cocktail: Cocktail;
  illustrationSource: string;
  qrDataUrl: string | null;
  lang: "zh" | "en";
  /**
   * Multiplies every text size on the poster (dev-tunable via /dev/poster).
   * Default 1.45 — hand-tuned against real content on 2026-07-19.
   */
  fontScale?: number;
}

export interface RenderResult {
  blob: Blob;
  dataUrl: string;
}

export type Scaler = (n: number) => number;

export const DEFAULT_FONT_SCALE = 1.45;

export const SERIF =
  '"Cormorant Garamond","Cormorant","Songti SC","STSong","Georgia",serif';
export const SANS =
  '"Inter","PingFang SC","Hiragino Sans GB","Helvetica Neue",sans-serif';

export function makeScaler(fontScale?: number): Scaler {
  const fs = fontScale ?? DEFAULT_FONT_SCALE;
  return (n: number) => Math.round(n * fs);
}

/** Load an image with sane cross-origin handling. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 60)}…`));
    img.src = src;
  });
}

/** Load illustration + QR in parallel (either may fail → null) and wait for fonts. */
export async function loadPosterAssets(
  illustrationSource: string,
  qrDataUrl: string | null,
): Promise<{ illustration: HTMLImageElement | null; qr: HTMLImageElement | null }> {
  const [illustration, qr] = await Promise.all([
    loadImage(illustrationSource).catch((err) => {
      console.error("[share-poster] illustration load failed", err);
      return null;
    }),
    qrDataUrl
      ? loadImage(qrDataUrl).catch((err) => {
          console.error("[share-poster] qr load failed", err);
          return null;
        })
      : Promise.resolve(null),
  ]);
  try {
    if (typeof document !== "undefined" && (document as Document).fonts) {
      await (document as Document).fonts.ready;
    }
  } catch {
    /* noop */
  }
  return { illustration, qr };
}

export function createPosterCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.textBaseline = "top";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("FileReader failed"));
    r.readAsDataURL(blob);
  });
}

export async function exportCanvas(canvas: HTMLCanvasElement): Promise<RenderResult> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/png",
    );
  });
  const dataUrl = await blobToDataUrl(blob);
  return { blob, dataUrl };
}

/* ── Text primitives ─────────────────────────────────────────────────── */

/** Wrap a paragraph and return the number of lines drawn. */
export function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Infinity,
): number {
  if (!text) return 0;
  const isCJK = /[　-鿿]/.test(text);
  const tokens = isCJK ? Array.from(text) : text.split(/(\s+)/);
  let line = "";
  let lines = 0;
  const flush = () => {
    if (!line) return;
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
    line = "";
  };
  for (const tok of tokens) {
    const candidate = line + tok;
    const w = ctx.measureText(candidate.trimEnd()).width;
    if (w > maxWidth && line) {
      if (lines + 1 >= maxLines) {
        let truncated = line.trimEnd();
        while (truncated && ctx.measureText(truncated + "…").width > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "…", x, y + lines * lineHeight);
        lines += 1;
        return lines;
      }
      flush();
      line = isCJK ? tok : tok.trimStart();
    } else {
      line = candidate;
    }
  }
  flush();
  return lines;
}

/** Count how many lines `text` would wrap into — measure only, no drawing. */
export function measureWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Infinity,
): number {
  if (!text) return 0;
  const isCJK = /[　-鿿]/.test(text);
  const tokens = isCJK ? Array.from(text) : text.split(/(\s+)/);
  let line = "";
  let lines = 0;
  for (const tok of tokens) {
    const candidate = line + tok;
    const w = ctx.measureText(candidate.trimEnd()).width;
    if (w > maxWidth && line) {
      lines += 1;
      if (lines >= maxLines) return lines;
      line = isCJK ? tok : tok.trimStart();
    } else {
      line = candidate;
    }
  }
  if (line) lines += 1;
  return lines;
}

export function clampChars(text: string, max: number): string {
  const s = (text ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw a letter-spaced (tracked) label — used for the small eyebrows. */
export function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  sp: number,
) {
  let ex = x;
  for (const ch of text) {
    ctx.fillText(ch, ex, y);
    ex += ctx.measureText(ch).width + sp;
  }
}

/* ── Background painters ─────────────────────────────────────────────── */

/** Parchment base — warm radial gradient from the upper-left. */
export function paintParchment(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const base = ctx.createRadialGradient(
    W * 0.25,
    H * 0.18,
    0,
    W * 0.25,
    H * 0.18,
    Math.max(W, H) * 1.15,
  );
  base.addColorStop(0, "#F6ECD6");
  base.addColorStop(0.4, "#F0E4CA");
  base.addColorStop(0.85, "#E5D3B1");
  base.addColorStop(1, "#DAC69E");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
}

export type Bloom = [cx: number, cy: number, r: number, color: string];

/** Watercolor blooms composited with multiply. Positions are layout-specific. */
export function paintBlooms(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  blooms: Bloom[],
) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (const [cx, cy, r, color] of blooms) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/**
 * Draw the illustration into a target rect with soft feathered edges so it
 * dissolves into the parchment rather than sitting as a rectangular paste.
 * Contain-fit + centered. Composited with multiply so parchment shows through.
 */
export function drawFeatheredIllustration(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.min(box.w / iw, box.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh) / 2;

  // Offscreen canvas sized to the box (not the drawn image) so the feather
  // ellipse is centered on the *composition* area.
  const off = document.createElement("canvas");
  off.width = Math.ceil(box.w);
  off.height = Math.ceil(box.h);
  const octx = off.getContext("2d");
  if (!octx) return;

  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(img, dx - box.x, dy - box.y, dw, dh);

  // Feather mask: solid center, transparent edges — radial ellipse.
  octx.globalCompositeOperation = "destination-in";
  const cx = box.w / 2;
  const cy = box.h * 0.5;
  const rx = box.w * 0.52;
  const ry = box.h * 0.55;
  const bigger = Math.max(rx, ry);
  const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, bigger);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.55, "rgba(0,0,0,1)");
  grad.addColorStop(0.78, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.92, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");

  octx.save();
  octx.translate(cx, cy);
  octx.scale(rx / bigger, ry / bigger);
  octx.translate(-cx, -cy);
  octx.fillStyle = grad;
  octx.fillRect(0, 0, off.width, off.height);
  octx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(off, box.x, box.y);
  ctx.restore();
}

/* ── Copy derivation ─────────────────────────────────────────────────── */

export interface PosterCopy {
  /** First sentence of tastesLike, unquoted + clamped. */
  quote: string;
  /** The user's original mood, clamped. */
  userVibe: string;
  /** True when a real menu item was matched. */
  hasMatch: boolean;
  /** Menu item name (only meaningful when hasMatch). */
  menuItemName: string;
  /** Longer "why this drink" paragraph, clamped. */
  why: string;
}

export function derivePosterCopy(cocktail: Cocktail): PosterCopy {
  const tastes = (cocktail.tastesLike ?? "").trim();
  const sentences = tastes.split(/(?<=[。.!?！？])\s*/).filter(Boolean);
  const quoteRaw = (sentences[0] ?? tastes).replace(/^["“”'']|["“”'']$/g, "").trim();
  const quote = clampChars(quoteRaw, 80);
  const userVibe = clampChars((cocktail.originalMood ?? "").trim(), 70);
  const hasMatch = !!(cocktail.matchedFromMenu && cocktail.menuItemName);
  const whyRaw = cocktail.matchedFromMenu
    ? (cocktail.whyThisMatch ?? sentences.slice(1).join(" "))
    : sentences.slice(1).join(" ");
  const why = clampChars((whyRaw ?? "").trim(), 320);
  return { quote, userVibe, hasMatch, menuItemName: cocktail.menuItemName ?? "", why };
}

/* ── Standard text-block stack ───────────────────────────────────────── */

export interface TextBlock {
  h: number;
  draw: (atY: number) => void;
}

export interface TextStackConfig {
  cocktail: Cocktail;
  lang: "zh" | "en";
  S: Scaler;
  /** Column left edge. */
  colX: number;
  /** Column width. */
  colW: number;
  /** Vertical budget for the whole stack (used to cap the why-paragraph). */
  topLimit: number;
  bottomLimit: number;
  /** Max lines for the cocktail name before shrink stops (default 3). */
  nameMaxLines?: number;
  /** Name font size range, unscaled (defaults 78 → 52). */
  nameBase?: number;
  nameFloor?: number;
}

/**
 * Build the standard content stack: eyebrow → name (shrink-to-fit) → quote →
 * matched item → user vibe → why (line-budgeted to never overflow bottomLimit).
 *
 * If the fixed blocks alone would overflow the vertical budget, quote/vibe
 * line caps are tightened step by step (degrade ladder) until the stack fits —
 * so no layout can ever push text into its footer.
 *
 * Returns measured blocks; draw them with `drawBlockStack`.
 */
export function buildTextBlocks(
  ctx: CanvasRenderingContext2D,
  cfg: TextStackConfig,
): TextBlock[] {
  const { cocktail, lang, S, colX, colW, topLimit, bottomLimit } = cfg;
  const nameMaxLines = cfg.nameMaxLines ?? 3;
  const { quote, userVibe, hasMatch, menuItemName, why } = derivePosterCopy(cocktail);
  const availH = bottomLimit - topLimit;

  // Name — shrink-to-fit so long names keep their full text instead of "…".
  let nameSize = S(cfg.nameBase ?? 78);
  const nameFloor = S(cfg.nameFloor ?? 52);
  for (; nameSize > nameFloor; nameSize -= 4) {
    ctx.font = `600 ${nameSize}px ${SERIF}`;
    if (measureWrappedLines(ctx, cocktail.cocktailName, colW, nameMaxLines + 1) <= nameMaxLines)
      break;
  }
  const nameLH = Math.round(nameSize * 1.05);
  ctx.font = `600 ${nameSize}px ${SERIF}`;
  const nameLineCount = Math.min(
    nameMaxLines,
    measureWrappedLines(ctx, cocktail.cocktailName, colW, nameMaxLines),
  );

  const buildOnce = (quoteMax: number, vibeMax: number): TextBlock[] => {
    const blocks: TextBlock[] = [];

    // Eyebrow
    blocks.push({
      h: S(38),
      draw: (atY) => {
        ctx.fillStyle = "#8A7A62";
        ctx.font = `500 ${S(15)}px ${SANS}`;
        drawTracked(ctx, lang === "zh" ? "今日一杯" : "TODAY'S POUR", colX, atY, 4);
      },
    });

    // Name — no divider underneath, just generous air
    blocks.push({
      h: nameLineCount * nameLH + S(44),
      draw: (atY) => {
        ctx.fillStyle = "#1E1710";
        ctx.font = `600 ${nameSize}px ${SERIF}`;
        drawWrapped(ctx, cocktail.cocktailName, colX, atY, colW, nameLH, nameMaxLines);
      },
    });

    // Vibe quote
    if (quote && quoteMax >= 1) {
      ctx.font = `italic 400 ${S(33)}px ${SERIF}`;
      const qLines = Math.min(quoteMax, measureWrappedLines(ctx, `"${quote}"`, colW, quoteMax));
      blocks.push({
        h: qLines * S(46) + S(48),
        draw: (atY) => {
          ctx.fillStyle = "#4A3A28";
          ctx.font = `italic 400 ${S(33)}px ${SERIF}`;
          drawWrapped(ctx, `"${quote}"`, colX, atY, colW, S(46), quoteMax);
        },
      });
    }

    // Merchant match block
    if (hasMatch) {
      ctx.font = `600 ${S(36)}px ${SERIF}`;
      const mLines = Math.min(2, measureWrappedLines(ctx, menuItemName, colW, 2));
      blocks.push({
        h: S(26) + mLines * S(42) + S(34),
        draw: (atY) => {
          ctx.fillStyle = "#8A7A62";
          ctx.font = `500 ${S(13)}px ${SANS}`;
          drawTracked(ctx, lang === "zh" ? "为你匹配" : "MATCHED", colX, atY, 5);
          ctx.fillStyle = "#2A2118";
          ctx.font = `600 ${S(36)}px ${SERIF}`;
          drawWrapped(ctx, menuItemName, colX, atY + S(26), colW, S(42), 2);
        },
      });
    }

    // User vibe (small eyebrow + quoted text)
    if (userVibe && vibeMax >= 1) {
      ctx.font = `italic 400 ${S(26)}px ${SERIF}`;
      const uLines = Math.min(vibeMax, measureWrappedLines(ctx, userVibe, colW, vibeMax));
      blocks.push({
        h: S(24) + uLines * S(36) + S(34),
        draw: (atY) => {
          ctx.fillStyle = "#8A7A62";
          ctx.font = `500 ${S(13)}px ${SANS}`;
          drawTracked(ctx, lang === "zh" ? "你的心情" : "YOUR VIBE", colX, atY, 5);
          ctx.fillStyle = "#5A4A38";
          ctx.font = `italic 400 ${S(26)}px ${SERIF}`;
          drawWrapped(ctx, userVibe, colX, atY + S(24), colW, S(36), vibeMax);
        },
      });
    }

    return blocks;
  };

  // Degrade ladder: tighten quote/vibe caps until the fixed stack fits the
  // budget. The last rung (name + match only) is used even if it overflows —
  // drawBlockStack top-aligns in that pathological case.
  const ladder: Array<[number, number]> = [
    [4, 3],
    [3, 2],
    [2, 1],
    [1, 1],
    [1, 0],
    [0, 0],
  ];
  let blocks = buildOnce(4, 3);
  for (const [qMax, vMax] of ladder) {
    const candidate = buildOnce(qMax, vMax);
    const fixedH = candidate.reduce((s, b) => s + b.h, 0);
    blocks = candidate;
    if (fixedH <= availH) break;
  }

  // Why this drink — cap lines to whatever space is left so the stack can
  // never exceed the available height (and thus never touches the footer).
  const whyLH = S(33);
  if (why) {
    ctx.font = `400 ${S(22)}px ${SANS}`;
    const fixedH = blocks.reduce((s, b) => s + b.h, 0);
    const roomH = availH - fixedH;
    const whyLines = Math.max(
      0,
      Math.min(measureWrappedLines(ctx, why, colW, 10), 10, Math.floor(roomH / whyLH)),
    );
    if (whyLines >= 1) {
      blocks.push({
        h: whyLines * whyLH,
        draw: (atY) => {
          ctx.fillStyle = "#3A2E20";
          ctx.font = `400 ${S(22)}px ${SANS}`;
          drawWrapped(ctx, why, colX, atY, colW, whyLH, whyLines);
        },
      });
    }
  }

  return blocks;
}

/** Vertically center the stack in [top, bottom]; top-align if it overflows. */
export function drawBlockStack(blocks: TextBlock[], top: number, bottom: number) {
  const totalH = blocks.reduce((s, b) => s + b.h, 0);
  const availH = bottom - top;
  let cursorY = totalH >= availH ? top : top + (availH - totalH) / 2;
  for (const b of blocks) {
    b.draw(cursorY);
    cursorY += b.h;
  }
}

/* ── Brand footer (QR bottom-right + wordmark) ───────────────────────── */

export interface BrandFooterConfig {
  qr: HTMLImageElement | null;
  lang: "zh" | "en";
  S: Scaler;
  /** Left x where the wordmark/tagline starts. */
  textX: number;
  /** Right edge the QR aligns to. */
  right: number;
  /** Bottom edge of the footer (QR bottom sits here). */
  bottom: number;
  qrSize?: number;
}

/** Draw the QR pinned bottom-right with the wordmark + tagline beside it. */
export function drawBrandFooter(ctx: CanvasRenderingContext2D, cfg: BrandFooterConfig) {
  const { qr, lang, S, textX, right, bottom } = cfg;
  const qrSize = cfg.qrSize ?? 128;
  const qrX = right - qrSize;
  const qrY = bottom - qrSize;
  const wordmark = "Vibetail";
  const tagline =
    lang === "zh" ? "每一种心情，都值得一杯专属" : "EVERY MOOD DESERVES THE PERFECT POUR.";
  const isZhTag = lang === "zh";

  if (qr) {
    ctx.fillStyle = "#FBF3E1";
    roundRect(ctx, qrX, qrY, qrSize, qrSize, 12);
    ctx.fill();
    const pad = 9;
    ctx.drawImage(qr, qrX + pad, qrY + pad, qrSize - pad * 2, qrSize - pad * 2);
  }

  const textAvailW = (qr ? qrX - 24 : right) - textX;
  const textTop = qrY + (qrSize - (S(44) + S(14) + S(16))) / 2;
  ctx.fillStyle = "#1E1710";
  ctx.font = `600 ${S(44)}px ${SERIF}`;
  ctx.fillText(wordmark, textX, textTop);
  const taglineY = textTop + S(58);
  ctx.fillStyle = "#8A7A62";
  if (isZhTag) {
    ctx.font = `500 ${S(14)}px ${SANS}`;
    ctx.fillText(tagline, textX, taglineY);
  } else {
    // Letter-spaced caps; shrink a touch if needed to fit beside the QR.
    const trackedW = (size: number, sp: number) => {
      ctx.font = `500 ${size}px ${SANS}`;
      let w = 0;
      for (const ch of tagline) w += ctx.measureText(ch).width + sp;
      return w - sp;
    };
    const sp = 2;
    let tSize = S(14);
    const tFloor = S(10);
    while (tSize > tFloor && trackedW(tSize, sp) > textAvailW) tSize -= 1;
    ctx.font = `500 ${tSize}px ${SANS}`;
    let tx = textX;
    for (const ch of tagline) {
      ctx.fillText(ch, tx, taglineY);
      tx += ctx.measureText(ch).width + sp;
    }
  }
}
