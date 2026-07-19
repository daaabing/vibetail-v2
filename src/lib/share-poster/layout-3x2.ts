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
   "3:2" — landscape 1800×1200.
   Wide card for desktop wallpaper / Twitter/X. Same DNA as the square:
   feathered illustration anchors the left half, measured text stack
   breathes in the right column, QR + wordmark bottom-right. No dividers —
   the composition is carried by air and the watercolor blooms.
   ──────────────────────────────────────────────────────────────────────── */

export const W_3X2 = 1800;
export const H_3X2 = 1200;

export async function render3x2(opts: RenderOpts): Promise<RenderResult> {
  const { cocktail, illustrationSource, qrDataUrl, lang } = opts;
  const S = makeScaler(opts.fontScale);
  const { illustration, qr } = await loadPosterAssets(illustrationSource, qrDataUrl);

  const W = W_3X2;
  const H = H_3X2;
  const { canvas, ctx } = createPosterCanvas(W, H);

  // 1. Background — parchment, then blooms placed for the wide composition.
  paintParchment(ctx, W, H);
  paintBlooms(ctx, W, H, [
    [W * 0.24, H * 0.62, 640, "rgba(150,115,85,0.18)"], // under the drink, left
    [W * 0.79, H * 0.24, 520, "rgba(120,90,70,0.14)"], // behind the headline, upper-right
    [W * 0.86, H * 0.92, 380, "rgba(140,110,150,0.09)"], // footer warmth, bottom-right
  ]);

  // 2. Illustration — anchors the LEFT half, near full-bleed vertically.
  //    Box spans x −40…900; its radial feather (center x≈430, rx≈489)
  //    reaches zero alpha by x≈919, and the opaque core ends well left of
  //    that, so the text column at x=920 never meets visible pigment.
  if (illustration) {
    drawFeatheredIllustration(ctx, illustration, {
      x: -40,
      y: 40,
      w: 940,
      h: 1120,
    });
  }

  // 3. Right column text stack — measured, then vertically centered.
  //    Wider column than the square card, so the name plays as a tighter
  //    two-line hero instead of stacking three deep.
  const colX = 920;
  const colRight = W - 90;
  const colW = colRight - colX; // ~790
  const textTopLimit = 110;
  const textBottomLimit = H - 250; // clear of the footer row

  // Overflow policy lives in the shared engine: buildTextBlocks degrades
  // quote/vibe line caps until the stack fits the budget, so the stack can
  // never run into the footer.
  const blocks = buildTextBlocks(ctx, {
    cocktail,
    lang,
    S,
    colX,
    colW,
    topLimit: textTopLimit,
    bottomLimit: textBottomLimit,
    nameMaxLines: 2,
    typeSizes: opts.typeSizes,
  });
  drawBlockStack(blocks, textTopLimit, textBottomLimit);

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
