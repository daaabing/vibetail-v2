# Redesigned Save/Share Card

Build a dedicated 2:3 portrait share-card pipeline that is separate from the on-screen result page, reuses the exact AI cocktail image the user sees, and is pre-rendered in the background so tapping Save is instant.

## What changes

### 1. New offscreen share-card component
Create `src/components/screens/ShareCard.tsx` — a fixed-size (1200×1800) React node rendered offscreen (absolutely positioned at `left: -99999px`, `pointer-events: none`) inside `ResultCardScreen`, not visible to the user and not affected by the mobile viewport.

Layout (matches the reference image):
- Warm cream background (`#EFE6D4`) with subtle watercolor splash accents behind the cocktail (reuse existing parchment tones from `compositeQr`).
- **Left column (~55% width)**: the AI cocktail illustration (`illustrationSource`) rendered full-bleed with `object-contain` + `mix-blend-multiply` — the *same image asset* the user already sees. No re-generation.
- **Right column (~45%)**: editorial text stack with generous padding:
  - Eyebrow: `YOUR VIBETAIL`
  - Display title: Chinese `cocktailName` in Cormorant Garamond, large
  - Italic quote: `tastesLike` (max 2 lines)
  - Divider
  - `MATCHED DRINK` label + `menuItemName || cocktailName` (merchant vs solo)
  - `YOUR VIBE` label + pill containing `originalMood` (short, truncated)
  - `WHY THIS DRINK` label + short explanation (`whyThisMatch` for merchant, else first 2–3 lines of `tastesLike`/`roast`), 3–4 lines max
  - QR block bottom-left of column with "Scan to mix your own ↙" handwritten-style caption
- **Footer strip**: `Every mood deserves the perfect pour.` + `@vibe.tail · vibetail.com`

All typography uses tokens already loaded (Cormorant Garamond + Inter). Dark espresso ink `#2A2118`, muted `#8A7A62`.

### 2. Background pre-generation pipeline
New hook `useSharePosterPreparation(cocktail, illustrationSource, qrDataUrl)`:
- Runs a `useEffect` that fires as soon as `cocktail` + `illustrationSource` + `qrDataUrl` are all ready.
- Waits for the offscreen ShareCard's `<img>` tags to `decode()` (reuse `waitForCaptureImages`).
- Calls `htmlToImage.toPng(shareCardRef.current, { pixelRatio: 1.5, canvasWidth: 1200, canvasHeight: 1800, backgroundColor: "#EFE6D4", skipFonts: true })` — output is already 2:3, no compositeQr band needed.
- Stores result in state: `{ status: "idle" | "preparing" | "ready" | "error", dataUrl, blob, file }`.
- Cached per `cocktail.id`; re-runs only when cocktail identity or illustration changes.
- On error, exposes a `retry()` fn.

### 3. Rewire Save button
Replace the current `handleSave` logic:
- If `status === "preparing"`: button shows `Preparing your card…` / `正在准备卡片…`, disabled or tappable-with-spinner.
- If `status === "ready"`: tap immediately calls `sharePreparedFile(file, dataUrl, filename)` — no capture step, no waiting.
- If `status === "error"`: button shows `Retry preparing card` / `重新准备卡片`, calls `retry()`.
- Guardrail: never export if `illustrationSource` is missing — surface an explanatory toast.

Remove the current on-the-fly `htmlToImage.toPng(captureRef.current, ...)` + `compositeQr` path from Save. Keep `compositeQr`/`handlePrint` intact for the existing Print flow (it prints the on-screen card, a different use case).

### 4. Merchant vs solo parity
The ShareCard reads the same `cocktail` object already in scope, so merchant flow (`matchedFromMenu`, `menuItemName`, `whyThisMatch`, `menuItemImageUrl`) and solo flow share one renderer. Merchant matches keep using the AI illustration (`imageUrl`) as the hero, matching current on-screen behavior; menu item photo is not shown on the share card (out-of-scope per the "one hero image" spec).

## Acceptance checks
- Exported PNG is exactly 1200×1800.
- Cocktail visual on the share card is byte-identical to `illustrationSource` (same URL fed into the same `<img>`).
- Result page shows → within ~1–2s the ShareCard is ready → tapping Save triggers native share/download instantly.
- No screenshot of the mobile page is used.
- Failure path shows retry, never exports a broken card.

## Technical notes
- Offscreen container must have explicit `width: 1200px; height: 1800px` and `transform: none` so `html-to-image` measures correctly regardless of viewport.
- Use `canvasWidth`/`canvasHeight` options to guarantee 2:3 output independent of `pixelRatio`.
- Pre-generation is client-only — no new server function, no additional AI call, no cost.
- The QR (`qrDataUrl`) is already generated upstream; reuse as-is.

## Files touched
- `src/components/screens/ShareCard.tsx` (new)
- `src/hooks/use-share-poster.ts` (new)
- `src/components/screens/ResultCardScreen.tsx` (mount ShareCard offscreen, replace `handleSave`, update button label states; leave `compositeQr` + `handlePrint` untouched)
