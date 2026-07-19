# Why the saved card is missing the illustration + QR — and a clean fix

## What's actually wrong

Both bugs come from the same root cause: we're rendering the saved card with `html-to-image` (`toPng`) against the offscreen `ShareCard` React tree at `src/components/screens/ShareCard.tsx`, driven by `useSharePosterPreparation` in `src/hooks/use-share-poster.ts`. That pipeline has three fragile spots that add up to "the two `<img>` tags in the card don't make it into the PNG":

1. **`html-to-image` renders via SVG `<foreignObject>` + `mix-blend-mode`.** The cocktail illustration in `ShareCard.tsx` uses `mixBlendMode: "multiply"` on the `<img>`. Chromium's `<foreignObject>` rasterizer and iOS Safari both routinely drop the image (render as blank) when blend modes sit on the image element itself. That's the AI illustration disappearing.
2. **`crossOrigin="anonymous"` on data URLs / same-origin URLs.** Both the illustration and the QR set `crossOrigin="anonymous"`. For `data:` URLs and same-origin URLs iOS Safari sometimes marks the resulting canvas tainted or skips the image during serialization, producing the empty box.
3. **`skipFonts: true` + `pixelRatio: 1` + fixed `canvasWidth/Height` mismatch.** The offscreen container is at `left: -99999` at 1200×1800 CSS px, but `pixelRatio: 1` combined with `skipFonts: true` means html-to-image inlines images through `fetch` → data URL, and in the merchant path the illustration may be a remote `cocktail.imageUrl` without CORS headers, which fails silently and gets dropped from the poster.

Net effect: the two `<img>` tags in the poster (illustration + QR) are the exact elements that fail to serialize, which matches what the user is seeing.

Making html-to-image work reliably across iOS Safari + blend modes + remote images is a losing battle. The saved poster is a fixed 2:3 layout with a small number of well-defined boxes — it's a perfect canvas-drawing job. Doing it on a real `<canvas>` eliminates every failure mode above and removes html-to-image from the save path entirely.

## Fix — render the saved card on a real `<canvas>`

Replace the `htmlToImage.toPng(shareCardRef.current, …)` call inside `useSharePosterPreparation` with a `renderSharePosterToCanvas(cocktail, illustrationSource, qrDataUrl, lang)` function that draws the exact same layout to an offscreen 1200×1800 `<canvas>`, then exports it via `canvas.toBlob("image/png")`. `ShareCard.tsx` stays for the on-screen preview only (or is deleted — nothing else consumes it).

### New file: `src/lib/share-poster-canvas.ts`

Pure function, no React. Signature:

```ts
export async function renderSharePosterToCanvas(opts: {
  cocktail: Cocktail;
  illustrationSource: string;   // data: URL or https URL
  qrDataUrl: string | null;
  lang: "zh" | "en";
}): Promise<{ blob: Blob; dataUrl: string }>;
```

Internals — all synchronous canvas draws after images load:

1. Create a 1200×1800 canvas (`OffscreenCanvas` when available, else a detached `<canvas>`).
2. **Parchment background** — paint the same radial gradient the current ShareCard uses (`#F5EAD3 → #EFE3C8 → #E4D2AF → #D9C69E`) using `ctx.createRadialGradient`. Then paint three faint watercolor blooms using additional `createRadialGradient` calls with low alpha (`rgba(155,120,90,0.16)` etc.) — with `ctx.globalCompositeOperation = "multiply"` for those bloom layers. `multiply` on 2D canvas is broadly supported and reliable, unlike CSS `mix-blend-mode` in foreignObject.
3. **Illustration** — `loadImage(illustrationSource)` (helper below). Draw at `x = -40, y = 120, w = 720, h = 1320` with `object-fit: contain` math (compute scale to fit inside the box, center inside, `drawImage` once). Draw with `ctx.globalCompositeOperation = "multiply"` so the parchment shows through, then reset to `"source-over"`.
4. **Right column text stack** at `left: 620, top: 160, width: 500`, drawn via `ctx.fillText` with wrapping helper:
   - Cocktail name — Cormorant Garamond 88px, `#1E1710`, wrapped, line-height 1.02
   - 1px divider — `fillRect(620, y, 220, 1)` in `rgba(40,25,10,0.35)`
   - Vibe quote — italic Cormorant 30px, `#4A3A28`, clamped ~56 chars
   - Merchant match (if `matchedFromMenu`) — 13px letter-spaced eyebrow "MATCHED" + Cormorant 34px matched name
   - User vibe — italic Cormorant 24px, `#5A4A38`, prefixed `— `
   - Why — Inter 19px, `#3A2E20`, wrapped, clamped ~160 chars
5. **Footer band** at `y = 1660..1800`, height 140, painted with a top-to-bottom gradient `linear-gradient(rgba(60,40,20,0.06), transparent)` reversed for footer.
6. **QR** — if `qrDataUrl` provided, `loadImage(qrDataUrl)`, paint a `#FBF3E1` rounded rect 120×120 at (`70, 1690`) then `drawImage(qr, 78, 1698, 104, 104)`.
7. **Wordmark** — right of QR: "Vibetail" 34px serif + tagline 13px letter-spaced sans.
8. `canvas.convertToBlob({ type: "image/png" })` (OffscreenCanvas) or `canvas.toBlob(..., "image/png")` (fallback wrapped in a Promise). Also produce a `dataUrl` for the `sharePreparedFile` fallback via `URL.createObjectURL(blob)` or `blob → dataUrl`.

### Helpers in the same file

- `loadImage(src)` — wraps `new Image()`, returns a promise, does NOT set `crossOrigin` for `data:` URLs, sets `crossOrigin = "anonymous"` only for `http(s):` URLs. Rejects on error so the caller shows a real error instead of an empty box.
- `wrapText(ctx, text, maxWidth, lineHeight)` — canonical canvas word-wrap.
- `clampChars(text, max)` — truncate with ellipsis.
- Font stack strings pre-registered via a `document.fonts.ready` await before drawing so Cormorant renders instead of falling back to Georgia.

### Rewire `src/hooks/use-share-poster.ts`

- Drop the `ref` / `waitForImages` / `htmlToImage.toPng` chain. Keep the same public API (`SharePosterState`, `retry`, `dataUrl`, `blob`, `file`, `status`, `error`) so `ResultCardScreen.tsx` needs no changes to its `handleSave` logic.
- Effect deps stay the same (`cocktailId`, `illustrationSource`, `qrDataUrl`, `filename`, `attempt`). On each key change: `renderSharePosterToCanvas(...)` → `File([blob], filename, {type:"image/png"})` → `setBlob/setFile/setDataUrl/setStatus("ready")`.
- Remove the `ref` prop from the hook's options.

### Trim `ResultCardScreen.tsx`

- Delete the offscreen `<ShareCard>` mount block (lines ~1188–1212) and the `shareCardRef` (`captureRef` for the flip card stays untouched).
- Delete the `ref` prop passed to `useSharePosterPreparation`.
- Keep `illustrationSource`, `qrDataUrl`, `handleSave` exactly as-is.

### `ShareCard.tsx`

Delete the file. Nothing else imports it after the rewire. (Confirmed by grep in this exploration — the only reference is the offscreen mount and the `SHARE_CARD_W`/`H` constants, which move into `share-poster-canvas.ts`.)

## Why this fixes both bugs at once

- **AI illustration** — drawn with `ctx.drawImage`, no `<foreignObject>`, no CSS blend mode on the image element. `multiply` runs through `globalCompositeOperation` which is fully supported. Remote merchant illustrations without CORS still work because we're drawing a plain image, not exporting a canvas that requires clean image data — but if we ever *do* need the exported PNG data and the source is cross-origin without CORS, `loadImage` will throw with a specific message instead of silently dropping.
- **QR** — same story: `drawImage` of a data URL always works; no serialization gap.
- Bonus: file size drops (no html-to-image, no font inlining), Save becomes noticeably faster, and the poster is pixel-identical across Safari/Chrome/Firefox.

## Files touched

- `src/lib/share-poster-canvas.ts` — new, ~200 lines, all canvas draw code.
- `src/hooks/use-share-poster.ts` — replace html-to-image call with `renderSharePosterToCanvas`; drop `ref` from options.
- `src/components/screens/ResultCardScreen.tsx` — remove offscreen `<ShareCard>` block, `shareCardRef`, and `ref` arg.
- `src/components/screens/ShareCard.tsx` — delete.

No schema, no API, no UI-visible changes beyond the save output actually containing the illustration and QR.
