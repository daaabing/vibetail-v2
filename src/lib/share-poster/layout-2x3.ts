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
   "2:3" — portrait 1200×1800.
   Tall card for phone screens / IG stories. The hero illustration owns
   the top half, feathered into the parchment; the measured text stack
   breathes in one generous full-width column beneath it; QR + wordmark
   anchor the bottom edge. No dividers — air and blooms carry it.
   ──────────────────────────────────────────────────────────────────────── */

export const W_2X3 = 1200;
export const H_2X3 = 1800;

export async function render2x3(opts: RenderOpts): Promise<RenderResult> {
  const { cocktail, illustrationSource, qrDataUrl, lang } = opts;
  const S = makeScaler(opts.fontScale);
  const { illustration, qr } = await loadPosterAssets(illustrationSource, qrDataUrl);

  const W = W_2X3;
  const H = H_2X3;
  const { canvas, ctx } = createPosterCanvas(W, H);

  // 1. Background — parchment, then blooms placed for the tall composition.
  paintParchment(ctx, W, H);
  paintBlooms(ctx, W, H, [
    [W * 0.5, H * 0.26, 640, "rgba(150,115,85,0.18)"], // under the drink, top half
    [W * 0.8, H * 0.62, 540, "rgba(120,90,70,0.14)"], // behind the headline
    [W * 0.85, H * 0.93, 360, "rgba(140,110,150,0.09)"], // footer warmth, bottom-right
  ]);

  // 2. Hero illustration — full-width box across the top half. Contain-fit
  //    centers any aspect; the feather is clipped at the box bottom (y=860)
  //    and the text stack starts 30px lower, so copy never meets pigment.
  //    Drawn before the text because it multiplies onto what sits below it.
  if (illustration) {
    drawFeatheredIllustration(ctx, illustration, {
      x: 60,
      y: 50,
      w: 1080,
      h: 810,
    });
  }

  // 3. Text stack below the hero — measured, then vertically centered
  //    between illustration and footer. At ~980px this is the widest
  //    column of the three layouts, so the name plays as a one- or
  //    two-line hero instead of stacking three deep.
  const colX = 110;
  const colW = W - 220; // ~980
  const textTopLimit = 890; // 30px below the illustration box
  const textBottomLimit = H - 260; // clear of the footer row

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

  // 4. Brand footer — QR pinned bottom-right, wordmark at the column start.
  drawBrandFooter(ctx, {
    qr,
    lang,
    S,
    textX: colX,
    right: W - 70,
    bottom: H - 80,
  });

  return exportCanvas(canvas);
}
