import type { Cocktail } from "@/lib/cocktails-store";

export const SHARE_CARD_W = 1200;
export const SHARE_CARD_H = 1800;

interface RenderOpts {
  cocktail: Cocktail;
  illustrationSource: string;
  qrDataUrl: string | null;
  lang: "zh" | "en";
}

const SERIF =
  '"Cormorant Garamond","Cormorant","Songti SC","STSong","Georgia",serif';
const SANS =
  '"Inter","PingFang SC","Hiragino Sans GB","Helvetica Neue",sans-serif';

/** Load an image with sane cross-origin handling. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 60)}…`));
    img.src = src;
  });
}

/** Wrap a paragraph and return the number of lines drawn. */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Infinity,
): number {
  if (!text) return 0;
  const isCJK = /[\u3000-\u9fff]/.test(text);
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

function clampChars(text: string, max: number): string {
  const s = (text ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function roundRect(
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

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("FileReader failed"));
    r.readAsDataURL(blob);
  });
}

/**
 * Draw the illustration into a target rect with soft feathered edges so it
 * dissolves into the parchment rather than sitting as a rectangular paste.
 * Uses an offscreen canvas + destination-in radial mask, then composites the
 * result with multiply so the parchment texture shows through.
 */
function drawFeatheredIllustration(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  // Contain-fit, bottom-aligned inside box
  const scale = Math.min(box.w / iw, box.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + (box.h - dh);

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
  const cy = box.h * 0.62; // bias toward the drink body
  const rx = box.w * 0.52;
  const ry = box.h * 0.55;
  const bigger = Math.max(rx, ry);
  const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, bigger);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.55, "rgba(0,0,0,1)");
  grad.addColorStop(0.78, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.92, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");

  // Squash the gradient into an ellipse
  octx.save();
  octx.translate(cx, cy);
  octx.scale(rx / bigger, ry / bigger);
  octx.translate(-cx, -cy);
  octx.fillStyle = grad;
  octx.fillRect(0, 0, off.width, off.height);
  octx.restore();

  // Composite onto main canvas with multiply for the watercolor blend.
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(off, box.x, box.y);
  ctx.restore();
}

export async function renderSharePosterToCanvas(
  opts: RenderOpts,
): Promise<{ blob: Blob; dataUrl: string }> {
  const { cocktail, illustrationSource, qrDataUrl, lang } = opts;

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

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_W;
  canvas.height = SHARE_CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.textBaseline = "top";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Parchment base gradient
  const base = ctx.createRadialGradient(
    SHARE_CARD_W * 0.25,
    SHARE_CARD_H * 0.18,
    0,
    SHARE_CARD_W * 0.25,
    SHARE_CARD_H * 0.18,
    Math.max(SHARE_CARD_W, SHARE_CARD_H) * 1.15,
  );
  base.addColorStop(0, "#F6ECD6");
  base.addColorStop(0.4, "#F0E4CA");
  base.addColorStop(0.85, "#E5D3B1");
  base.addColorStop(1, "#DAC69E");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);

  // 2. Watercolor blooms (multiply) — repositioned to support the new layout
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const blooms: Array<[number, number, number, string]> = [
    [SHARE_CARD_W * 0.22, SHARE_CARD_H * 0.72, 640, "rgba(150,115,85,0.18)"], // under the drink
    [SHARE_CARD_W * 0.85, SHARE_CARD_H * 0.28, 520, "rgba(120,90,70,0.14)"], // behind headline
    [SHARE_CARD_W * 0.78, SHARE_CARD_H * 0.9, 380, "rgba(140,110,150,0.09)"], // footer warmth
  ];
  for (const [cx, cy, r, color] of blooms) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
  }
  ctx.restore();

  // 3. Right column text stack — upper/mid right, generous hierarchy
  const colX = 640;
  const colRight = SHARE_CARD_W - 90; // right margin 90
  const colW = colRight - colX; // ~470
  let y = 150;

  // Small eyebrow above the name
  ctx.fillStyle = "#8A7A62";
  ctx.font = `500 14px ${SANS}`;
  const eyebrowTop = lang === "zh" ? "今日一杯" : "TODAY'S POUR";
  {
    let ex = colX;
    for (const ch of eyebrowTop) {
      ctx.fillText(ch, ex, y);
      ex += ctx.measureText(ch).width + 4;
    }
  }
  y += 34;

  // Cocktail name — hero typography
  ctx.fillStyle = "#1E1710";
  ctx.font = `600 78px ${SERIF}`;
  const nameLines = drawWrapped(ctx, cocktail.cocktailName, colX, y, colW, 82, 3);
  y += nameLines * 82 + 26;

  // Thin divider
  ctx.fillStyle = "rgba(40,25,10,0.32)";
  ctx.fillRect(colX, y, 90, 1);
  y += 30;

  // Vibe quote
  const tastes = (cocktail.tastesLike ?? "").trim();
  const sentences = tastes.split(/(?<=[。.!?！？])\s*/).filter(Boolean);
  const quoteRaw = (sentences[0] ?? tastes).replace(/^["“”'']|["“”'']$/g, "").trim();
  const quote = clampChars(quoteRaw, 80);
  if (quote) {
    ctx.fillStyle = "#4A3A28";
    ctx.font = `italic 400 28px ${SERIF}`;
    const qLines = drawWrapped(ctx, `"${quote}"`, colX, y, colW, 40, 4);
    y += qLines * 40 + 34;
  }

  // Merchant match block
  if (cocktail.matchedFromMenu && cocktail.menuItemName) {
    ctx.fillStyle = "#8A7A62";
    ctx.font = `500 12px ${SANS}`;
    const eyebrow = lang === "zh" ? "为你匹配" : "MATCHED";
    let ex = colX;
    for (const ch of eyebrow) {
      ctx.fillText(ch, ex, y);
      ex += ctx.measureText(ch).width + 5;
    }
    y += 24;
    ctx.fillStyle = "#2A2118";
    ctx.font = `600 32px ${SERIF}`;
    const mLines = drawWrapped(ctx, cocktail.menuItemName, colX, y, colW, 38, 2);
    y += mLines * 38 + 24;
  }

  // User vibe (small eyebrow + quoted text)
  const rawVibe = (cocktail.originalMood ?? "").trim();
  const userVibe = clampChars(rawVibe, 70);
  if (userVibe) {
    ctx.fillStyle = "#8A7A62";
    ctx.font = `500 12px ${SANS}`;
    const label = lang === "zh" ? "你的心情" : "YOUR VIBE";
    let ex = colX;
    for (const ch of label) {
      ctx.fillText(ch, ex, y);
      ex += ctx.measureText(ch).width + 5;
    }
    y += 22;
    ctx.fillStyle = "#5A4A38";
    ctx.font = `italic 400 22px ${SERIF}`;
    const uLines = drawWrapped(ctx, userVibe, colX, y, colW, 32, 3);
    y += uLines * 32 + 24;
  }

  // Why this drink — anchor the mid-right area, fills the space toward the bottom
  const whyRaw = cocktail.matchedFromMenu
    ? (cocktail.whyThisMatch ?? sentences.slice(1).join(" "))
    : sentences.slice(1).join(" ");
  const why = clampChars((whyRaw ?? "").trim(), 320);
  if (why) {
    ctx.fillStyle = "#3A2E20";
    ctx.font = `400 18px ${SANS}`;
    drawWrapped(ctx, why, colX, y, colW, 29, 10);
  }

  // 4. Illustration — left/center anchor, large, bottom-aligned, feathered.
  //    Placed AFTER blooms so it multiplies onto them, BEFORE footer so the
  //    footer sits on top of any residual fade.
  if (illustration) {
    drawFeatheredIllustration(ctx, illustration, {
      x: -40,
      y: 620,
      w: 820,
      h: 1080,
    });
  }

  // 5. Compact centered footer module — QR + wordmark as one unit
  const footerY = SHARE_CARD_H - 130;
  const qrSize = 96;
  const wordmark = "Vibetail";
  const tagline =
    lang === "zh" ? "每一种心情，都值得一杯专属" : "EVERY MOOD DESERVES THE PERFECT POUR.";

  // Measure so we can center the whole module horizontally
  ctx.font = `600 34px ${SERIF}`;
  const wordmarkW = ctx.measureText(wordmark).width;
  ctx.font = `500 12px ${SANS}`;
  const isZhTag = lang === "zh";
  let taglineW = 0;
  if (isZhTag) {
    taglineW = ctx.measureText(tagline).width;
  } else {
    for (const ch of tagline) taglineW += ctx.measureText(ch).width + 3;
    taglineW -= 3;
  }
  const textBlockW = Math.max(wordmarkW, taglineW);
  const gap = 22;
  const moduleW = (qr ? qrSize + gap : 0) + textBlockW;
  const moduleX = (SHARE_CARD_W - moduleW) / 2;

  // Hairline above footer for quiet separation
  ctx.fillStyle = "rgba(40,25,10,0.18)";
  ctx.fillRect(SHARE_CARD_W / 2 - 60, footerY - 26, 120, 1);

  let cursorX = moduleX;
  if (qr) {
    ctx.fillStyle = "#FBF3E1";
    roundRect(ctx, cursorX, footerY, qrSize, qrSize, 10);
    ctx.fill();
    const pad = 7;
    ctx.drawImage(qr, cursorX + pad, footerY + pad, qrSize - pad * 2, qrSize - pad * 2);
    cursorX += qrSize + gap;
  }

  // Wordmark vertically centered against the QR box
  const textTop = footerY + (qrSize - (34 + 8 + 14)) / 2;
  ctx.fillStyle = "#1E1710";
  ctx.font = `600 34px ${SERIF}`;
  ctx.fillText(wordmark, cursorX, textTop);
  ctx.fillStyle = "#8A7A62";
  ctx.font = `500 12px ${SANS}`;
  const taglineY = textTop + 44;
  if (isZhTag) {
    ctx.fillText(tagline, cursorX, taglineY);
  } else {
    let tx = cursorX;
    for (const ch of tagline) {
      ctx.fillText(ch, tx, taglineY);
      tx += ctx.measureText(ch).width + 3;
    }
  }

  // 6. Export
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/png",
    );
  });
  const dataUrl = await blobToDataUrl(blob);
  return { blob, dataUrl };
}
