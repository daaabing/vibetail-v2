import {
  type RenderOpts,
  type RenderResult,
  makeScaler,
  loadPosterAssets,
  createPosterCanvas,
  exportCanvas,
  paintParchment,
  paintBlooms,
  drawFeatheredIllustration,
  buildTextBlocks,
  drawBlockStack,
  drawBrandFooter,
} from "./shared";

/* ────────────────────────────────────────────────────────────────────────
   "2:2" — square 1200×1200.
   The original side-by-side composition: illustration anchors the left
   half (feathered into the parchment), measured text stack vertically
   centered in the right column, QR + wordmark bottom-right.
   ──────────────────────────────────────────────────────────────────────── */

export const W_2X2 = 1200;
export const H_2X2 = 1200;

export async function render2x2(opts: RenderOpts): Promise<RenderResult> {
  const { cocktail, illustrationSource, qrDataUrl, lang } = opts;
  const S = makeScaler(opts.fontScale);
  const { illustration, qr } = await loadPosterAssets(illustrationSource, qrDataUrl);

  const W = W_2X2;
  const H = H_2X2;
  const { canvas, ctx } = createPosterCanvas(W, H);

  // 1. Background
  paintParchment(ctx, W, H);
  paintBlooms(ctx, W, H, [
    [W * 0.24, H * 0.62, 560, "rgba(150,115,85,0.18)"], // under the drink
    [W * 0.85, H * 0.26, 460, "rgba(120,90,70,0.14)"], // behind headline
    [W * 0.8, H * 0.9, 320, "rgba(140,110,150,0.09)"], // footer warmth
  ]);

  // 2. Right column text stack — measured, then vertically centered.
  const colX = 640;
  const colRight = W - 70;
  const colW = colRight - colX; // ~490
  const textTopLimit = 100;
  const textBottomLimit = H - 250; // clear of the footer row

  const blocks = buildTextBlocks(ctx, {
    cocktail,
    lang,
    S,
    colX,
    colW,
    topLimit: textTopLimit,
    bottomLimit: textBottomLimit,
  });
  drawBlockStack(blocks, textTopLimit, textBottomLimit);

  // 3. Illustration — anchors the LEFT half, vertically centered. The box
  //    extends a touch past the text edge but the radial feather keeps
  //    anything near the copy at near-zero alpha.
  if (illustration) {
    drawFeatheredIllustration(ctx, illustration, {
      x: -50,
      y: 60,
      w: 720,
      h: 1080,
    });
  }

  // 4. Brand footer — QR bottom-right, wordmark at the column start.
  drawBrandFooter(ctx, {
    qr,
    lang,
    S,
    textX: colX,
    right: colRight,
    bottom: H - 70,
  });

  return exportCanvas(canvas);
}
