import type { VenueMatchResult } from "@vibetail/contracts";

// Hand-drawn 2:3 share poster, following the v1 approach of painting the card
// directly onto a canvas instead of pulling in an html-to-image dependency.
// The layout mirrors the on-page card: vibe name up top, roast as the pull
// quote, then the order line, the guest's original vibe, and the reasoning.

const WIDTH = 1080;
const HEIGHT = 1620;
const MARGIN = 96;

const PAPER = "#f6f3ec";
const INK = "#171717";
const INK_SOFT = "#4c4a45";
const INK_MUTE = "#8a867d";
const LINE = "#d8d3c6";

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Helvetica Neue", Arial, sans-serif';

const COPY = {
  kicker: "VIBE CHECKED",
  orderThis: "ORDER THIS",
  originalVibe: "ORIGINAL VIBE",
  whyThisOne: "WHY THIS ONE",
  disclaimer: "Final interpretation & execution reserved by the bar",
  at: "@",
} as const;

// Exported for tests: measurement comes in as an interface so the wrap logic
// can be exercised without a real canvas.
export function wrapText(
  context: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  // CJK has no spaces to break on, so wrap character by character; latin text
  // wraps on words. Mixed lines fall back to characters when a word overflows.
  const units = /\s/.test(text.trim()) ? text.split(/\s+/) : [...text];
  const joiner = /\s/.test(text.trim()) ? " " : "";
  let current = "";
  for (const unit of units) {
    const candidate = current ? current + joiner + unit : unit;
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = unit;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSection(
  context: CanvasRenderingContext2D,
  label: string,
  body: string,
  y: number,
  options: { bodyFont: string; bodyColor: string; lineHeight: number },
): number {
  context.font = `600 26px ${SANS}`;
  context.fillStyle = INK_MUTE;
  drawTracked(context, label, MARGIN, y, 4);
  let cursor = y + 52;
  context.font = options.bodyFont;
  context.fillStyle = options.bodyColor;
  for (const line of wrapText(context, body, WIDTH - MARGIN * 2)) {
    context.fillText(line, MARGIN, cursor);
    cursor += options.lineHeight;
  }
  return cursor + 40;
}

// Letter-spaced small caps, drawn glyph by glyph since canvas has no
// letter-spacing control in every browser we target.
function drawTracked(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
): void {
  let cursor = x;
  for (const glyph of text) {
    context.fillText(glyph, cursor, y);
    cursor += context.measureText(glyph).width + tracking;
  }
}

export function renderShareCard(result: VenueMatchResult, originalVibe: string): HTMLCanvasElement {
  const copy = COPY;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");

  context.fillStyle = PAPER;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.strokeStyle = LINE;
  context.lineWidth = 2;
  context.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);

  context.textBaseline = "alphabetic";

  // Kicker
  context.font = `600 26px ${SANS}`;
  context.fillStyle = INK_MUTE;
  drawTracked(context, copy.kicker, MARGIN, 170, 6);

  // Vibe name — the human name for the drink, always the headline.
  context.fillStyle = INK;
  let y = 260;
  let vibeNameSize = 96;
  context.font = `400 ${vibeNameSize}px ${SERIF}`;
  while (vibeNameSize > 44 && wrapText(context, result.vibeName, WIDTH - MARGIN * 2).length > 2) {
    vibeNameSize -= 8;
    context.font = `400 ${vibeNameSize}px ${SERIF}`;
  }
  for (const line of wrapText(context, result.vibeName, WIDTH - MARGIN * 2)) {
    context.fillText(line, MARGIN, y);
    y += vibeNameSize * 1.08;
  }

  // Roast — the pull quote under the name.
  y += 20;
  context.font = `italic 400 40px ${SERIF}`;
  context.fillStyle = INK_SOFT;
  for (const line of wrapText(context, `“${result.roast}”`, WIDTH - MARGIN * 2)) {
    context.fillText(line, MARGIN, y);
    y += 56;
  }

  // Tastes like
  y += 24;
  context.font = `400 36px ${SANS}`;
  context.fillStyle = INK_SOFT;
  for (const line of wrapText(context, result.tastesLike, WIDTH - MARGIN * 2)) {
    context.fillText(line, MARGIN, y);
    y += 54;
  }

  // Divider
  y += 30;
  context.strokeStyle = LINE;
  context.beginPath();
  context.moveTo(MARGIN, y);
  context.lineTo(WIDTH - MARGIN, y);
  context.stroke();
  y += 80;

  y = drawSection(context, copy.orderThis, `${result.item.name} ${copy.at} ${result.venue.name}`, y, {
    bodyFont: `500 40px ${SANS}`,
    bodyColor: INK,
    lineHeight: 56,
  });

  if (originalVibe.trim()) {
    y = drawSection(context, copy.originalVibe, `“${originalVibe.trim()}”`, y, {
      bodyFont: `italic 400 36px ${SERIF}`,
      bodyColor: INK_SOFT,
      lineHeight: 52,
    });
  }

  y = drawSection(context, copy.whyThisOne, result.whyThisMatch, y, {
    bodyFont: `400 34px ${SANS}`,
    bodyColor: INK_SOFT,
    lineHeight: 52,
  });

  // Footer: disclaimer + wordmark, anchored to the bottom edge.
  context.font = `400 24px ${SANS}`;
  context.fillStyle = INK_MUTE;
  context.fillText(copy.disclaimer, MARGIN, HEIGHT - 150);
  context.font = `600 28px ${SANS}`;
  context.fillStyle = INK;
  drawTracked(context, "VIBETAL(E.)", MARGIN, HEIGHT - 96, 6);

  return canvas;
}

export async function shareCardFile(result: VenueMatchResult, originalVibe: string): Promise<{ file: File; dataUrl: string }> {
  const canvas = renderShareCard(result, originalVibe);
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Canvas export failed"))), "image/png");
  });
  const slug = result.vibeName.replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").toLowerCase() || "vibetail";
  return { file: new File([blob], `${slug}-vibetail.png`, { type: "image/png" }), dataUrl };
}

// Web Share on touch devices, plain download everywhere else — same policy the
// v1 flow settled on: the desktop share sheet is either absent or a worse UX
// than a straight download.
export async function deliverShareCard(payload: { file: File; dataUrl: string }): Promise<"shared" | "downloaded"> {
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };
  const isTouch = window.matchMedia?.("(pointer: coarse)").matches
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isTouch && nav.canShare && nav.share && nav.canShare({ files: [payload.file] })) {
    await nav.share({ files: [payload.file], title: payload.file.name });
    return "shared";
  }
  const anchor = document.createElement("a");
  anchor.href = payload.dataUrl;
  anchor.download = payload.file.name;
  anchor.click();
  return "downloaded";
}
