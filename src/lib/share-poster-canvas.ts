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
    // Only tag CORS for real http(s) sources; data: URLs never need it and
    // setting crossOrigin on them trips iOS Safari in some versions.
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
  // Split by chars for CJK (no natural word boundaries), by whitespace otherwise.
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
      // Truncate with ellipsis on the last allowed line.
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

export async function renderSharePosterToCanvas(
  opts: RenderOpts,
): Promise<{ blob: Blob; dataUrl: string }> {
  const { cocktail, illustrationSource, qrDataUrl, lang } = opts;

  // Preload images in parallel; wait for web fonts so serif renders correctly.
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
    SHARE_CARD_W * 0.2,
    SHARE_CARD_H * 0.15,
    0,
    SHARE_CARD_W * 0.2,
    SHARE_CARD_H * 0.15,
    Math.max(SHARE_CARD_W, SHARE_CARD_H) * 1.1,
  );
  base.addColorStop(0, "#F5EAD3");
  base.addColorStop(0.4, "#EFE3C8");
  base.addColorStop(0.85, "#E4D2AF");
  base.addColorStop(1, "#D9C69E");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);

  // 2. Watercolor blooms (multiply)
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const blooms: Array<[number, number, number, string]> = [
    [SHARE_CARD_W * 0.18, SHARE_CARD_H * 0.22, 520, "rgba(155,120,90,0.16)"],
    [SHARE_CARD_W * 0.82, SHARE_CARD_H * 0.78, 460, "rgba(120,90,70,0.14)"],
    [SHARE_CARD_W * 0.08, SHARE_CARD_H * 0.82, 360, "rgba(140,110,150,0.10)"],
  ];
  for (const [cx, cy, r, color] of blooms) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
  }
  ctx.restore();

  // 3. Illustration — object-fit: contain into box (-40, 120, 720, 1320),
  //    aligned to bottom-center. Painted with multiply so parchment shows.
  if (illustration) {
    const box = { x: -40, y: 120, w: 720, h: 1320 };
    const iw = illustration.naturalWidth || illustration.width;
    const ih = illustration.naturalHeight || illustration.height;
    if (iw > 0 && ih > 0) {
      const scale = Math.min(box.w / iw, box.h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = box.x + (box.w - dw) / 2;
      const dy = box.y + (box.h - dh); // bottom-align
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(illustration, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  // 4. Right column text stack
  const colX = 620;
  const colW = 500;
  let y = 160;

  // Cocktail name
  ctx.fillStyle = "#1E1710";
  ctx.font = `600 88px ${SERIF}`;
  const nameLines = drawWrapped(ctx, cocktail.cocktailName, colX, y, colW, 92, 3);
  y += nameLines * 92 + 28;

  // Divider
  ctx.fillStyle = "rgba(40,25,10,0.35)";
  ctx.fillRect(colX, y, 220, 1);
  y += 28;

  // Vibe quote
  const tastes = (cocktail.tastesLike ?? "").trim();
  const sentences = tastes.split(/(?<=[。.!?！？])\s*/).filter(Boolean);
  const quoteRaw = (sentences[0] ?? tastes).replace(/^["“”'']|["“”'']$/g, "").trim();
  const quote = clampChars(quoteRaw, 56);
  if (quote) {
    ctx.fillStyle = "#4A3A28";
    ctx.font = `italic 400 30px ${SERIF}`;
    const q = `"${quote}"`;
    const qLines = drawWrapped(ctx, q, colX, y, colW, 40, 3);
    y += qLines * 40 + 28;
  }

  // Merchant match block
  if (cocktail.matchedFromMenu && cocktail.menuItemName) {
    ctx.fillStyle = "#8A7A62";
    ctx.font = `500 13px ${SANS}`;
    // letter-spacing approximated by manual char-by-char draw
    const eyebrow = "MATCHED";
    let ex = colX;
    for (const ch of eyebrow) {
      ctx.fillText(ch, ex, y);
      ex += ctx.measureText(ch).width + 5;
    }
    y += 26;
    ctx.fillStyle = "#2A2118";
    ctx.font = `600 34px ${SERIF}`;
    const mLines = drawWrapped(ctx, cocktail.menuItemName, colX, y, colW, 40, 2);
    y += mLines * 40 + 20;
  }

  // User vibe
  const rawVibe = (cocktail.originalMood ?? "").trim();
  const userVibe = clampChars(rawVibe, 54);
  if (userVibe) {
    ctx.fillStyle = "#5A4A38";
    ctx.font = `italic 400 24px ${SERIF}`;
    const uLines = drawWrapped(ctx, `— ${userVibe}`, colX, y, colW, 34, 2);
    y += uLines * 34 + 20;
  }

  // Why
  const whyRaw = cocktail.matchedFromMenu
    ? (cocktail.whyThisMatch ?? sentences.slice(1).join(" "))
    : sentences.slice(1).join(" ");
  const why = clampChars((whyRaw ?? "").trim(), 160);
  if (why) {
    ctx.fillStyle = "#3A2E20";
    ctx.font = `400 19px ${SANS}`;
    drawWrapped(ctx, why, colX, y, colW, 30, 6);
  }

  // 5. Footer band gradient
  const footerH = 140;
  const footerY = SHARE_CARD_H - footerH;
  const fg = ctx.createLinearGradient(0, SHARE_CARD_H, 0, footerY);
  fg.addColorStop(0, "rgba(60,40,20,0.06)");
  fg.addColorStop(1, "rgba(60,40,20,0)");
  ctx.fillStyle = fg;
  ctx.fillRect(0, footerY, SHARE_CARD_W, footerH);

  // 6. QR
  let footerLeft = 70;
  if (qr) {
    const qrBoxSize = 120;
    const qrBoxY = SHARE_CARD_H - 110 - qrBoxSize / 2;
    ctx.fillStyle = "#FBF3E1";
    roundRect(ctx, footerLeft, qrBoxY, qrBoxSize, qrBoxSize, 8);
    ctx.fill();
    const pad = 8;
    ctx.drawImage(qr, footerLeft + pad, qrBoxY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);
    footerLeft += qrBoxSize + 24;
  }

  // 7. Wordmark + tagline
  const tagline =
    lang === "zh" ? "每一种心情，都值得一杯专属" : "EVERY MOOD DESERVES THE PERFECT POUR.";
  const wordmarkY = SHARE_CARD_H - 92;
  ctx.fillStyle = "#1E1710";
  ctx.font = `600 34px ${SERIF}`;
  ctx.fillText("Vibetail", footerLeft, wordmarkY);
  ctx.fillStyle = "#8A7A62";
  ctx.font = `500 13px ${SANS}`;
  const isZhTag = lang === "zh";
  if (isZhTag) {
    ctx.fillText(tagline, footerLeft, wordmarkY + 44);
  } else {
    let tx = footerLeft;
    for (const ch of tagline) {
      ctx.fillText(ch, tx, wordmarkY + 44);
      tx += ctx.measureText(ch).width + 3;
    }
  }

  // 8. Export
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/png",
    );
  });
  const dataUrl = await blobToDataUrl(blob);
  return { blob, dataUrl };
}
