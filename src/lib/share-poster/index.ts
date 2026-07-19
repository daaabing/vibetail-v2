import type { RenderOpts, RenderResult } from "./shared";
import { render2x2, W_2X2, H_2X2 } from "./layout-2x2";
import { render2x3, W_2X3, H_2X3 } from "./layout-2x3";
import { render3x2, W_3X2, H_3X2 } from "./layout-3x2";

export type { RenderOpts, RenderResult, TypeSizes } from "./shared";
export { DEFAULT_FONT_SCALE, TYPE_DEFAULTS } from "./shared";

/* ────────────────────────────────────────────────────────────────────────
   Share-poster layout strategies, named by aspect ratio:
     "2:2" — square, illustration left / text right (the original design)
     "2:3" — portrait (tall), hero illustration top / text below
     "3:2" — landscape (wide), illustration left / text right, more air
   ──────────────────────────────────────────────────────────────────────── */

export type PosterLayoutId = "2:2" | "2:3" | "3:2";

export interface PosterLayoutDef {
  id: PosterLayoutId;
  /** Human label for pickers/UI. */
  label: string;
  width: number;
  height: number;
  render: (opts: RenderOpts) => Promise<RenderResult>;
}

export const POSTER_LAYOUTS: Record<PosterLayoutId, PosterLayoutDef> = {
  "2:2": { id: "2:2", label: "2:2 Square", width: W_2X2, height: H_2X2, render: render2x2 },
  "2:3": { id: "2:3", label: "2:3 Portrait", width: W_2X3, height: H_2X3, render: render2x3 },
  "3:2": { id: "3:2", label: "3:2 Landscape", width: W_3X2, height: H_3X2, render: render3x2 },
};

/** Production default — the layout the Save button ships. */
export const DEFAULT_POSTER_LAYOUT: PosterLayoutId = "3:2";

export async function renderSharePosterToCanvas(
  opts: RenderOpts & { layout?: PosterLayoutId },
): Promise<RenderResult> {
  const def = POSTER_LAYOUTS[opts.layout ?? DEFAULT_POSTER_LAYOUT];
  return def.render(opts);
}
