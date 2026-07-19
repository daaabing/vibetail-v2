# Redesign 2:3 Share Card — Editorial Cover Layout

## Problem
The current `ShareCard` renders empty on the left (no illustration visible in many cases), squeezes all text into the top-right, and treats the poster like a two-column web page with too many labeled sections. It also risks looking like a template because the AI cocktail from the app is not being reused as the visual anchor.

## Non-negotiable rules
1. **Reuse the exact same illustration** the user sees on the on-screen result card — no re-generation, no different asset. Source: the same `imageData` / `illustrationSource` string already resolved in `ResultCardScreen`. This is the only cocktail image that can appear on the poster.
2. Never render the ShareCard if `illustrationSource` is null — the poster only prepares once the AI illustration has actually loaded (`img.decode()` resolved). This is why the current left side sometimes appears empty.
3. Do not add any label or section not listed below. No `YOUR VIBETAIL` eyebrow, no separate `MATCHED DRINK`/`YOUR VIBE`/`WHY THIS DRINK` label stack, no `@vibe.tail · vibetail.com` handle line.

## New layout (1200 × 1800)

```
+--------------------------------------------------+
|                                                  |
|                                                  |
|                                                  |
|   [ COCKTAIL ILLUSTRATION ]     Cocktail Name    |
|      full-bleed, ~55% width     (display serif)  |
|      slightly overflows into    ── divider ──    |
|      right column & bleeds      one-line vibe    |
|      past top for magazine      quote (italic)   |
|      cover feel                                  |
|                                 Matched: {name}  |
|                                 {price if any}   |
|                                                  |
|                                 "your vibe" —    |
|                                 short user line  |
|                                                  |
|                                 why (3 lines max)|
|                                                  |
+--------------------------------------------------+
|  [QR 120px]   Vibetail · every mood, one pour    |
+--------------------------------------------------+
```

Concrete rules:
- Background: soft parchment gradient that **extends behind the cocktail** — no square/card boundary around the illustration. Illustration uses `mix-blend-multiply` on transparent-ish parchment so it feels painted onto the poster, not pasted.
- Illustration container: absolutely positioned, ~52% width, height ~78% of poster, bottom-anchored so the glass sits low and the top of the glass optionally bleeds slightly into the right column's whitespace. `object-fit: contain`, no border, no shadow box.
- Right column: starts at ~48% from left, top padding ~180px, right padding ~90px, width ~46%. Vertical rhythm handled with generous gaps, not with labeled section headers.
- Text stack (top → bottom, no eyebrow labels):
  1. **Cocktail name** — Cormorant Garamond 88px, `#1E1710`, tight leading.
  2. Thin divider rule (1px, 40% opacity ink).
  3. **Vibe quote** — italic Cormorant 30px, 2 lines max (from `tastesLike`).
  4. Small caps micro-label `MATCHED` 14px + drink name 34px (merchant only; solo mode omits this whole block).
  5. **User vibe** — italic 24px, prefixed with a hairline em-dash, e.g. `— {originalMood}`.
  6. **Why** — 20px sans, 3 lines max (`whyThisMatch` for merchant, otherwise the second sentence of `tastesLike`).
- Footer strip: 120px tall band at bottom, parchment darkened ~4%. Left: 120px QR on cream tile, no shadow. Right of QR: single line `Vibetail` (Cormorant 34px) + tagline `Every mood deserves the perfect pour.` (14px letter-spaced). No `@vibe.tail`, no URL text (the QR is the URL).

## Files touched

- `src/components/screens/ShareCard.tsx` — rewrite the JSX per layout above. Keep the exported `SHARE_CARD_W` / `SHARE_CARD_H` constants and the `forwardRef` signature so the hook and offscreen mount don't have to change. Remove the strict two-column flex split; use one relatively positioned root with the illustration absolutely positioned so it can bleed. Delete the eyebrow, the `YOUR VIBE` pill, the `WHY THIS DRINK` label, and the `@vibe.tail · vibetail.com` handle.
- `src/hooks/use-share-poster.ts` — no shape change. Confirm `enabled` is only true when `illustrationSource` is non-null (already the case). Add a small guard: also skip when the source `<img>` inside the ShareCard reports `naturalWidth === 0` after `waitForImages`, treating that as `error` so the button surfaces retry instead of exporting a blank left side.
- `src/components/screens/ResultCardScreen.tsx` — no layout change to on-screen card. Only tweak: pass `illustrationSource` unchanged (already same variable used by the on-screen `<img>`), so the poster is guaranteed byte-identical to the app's cocktail. Confirm the offscreen mount is inside a wrapper with fixed 1200×1800 sizing at `left: -99999px` so `html-to-image` measures correctly.

## Acceptance
- Poster left side always shows the same cocktail the user sees on-screen (same data URL / URL string).
- No visible rectangular frame or hard edge around the illustration — it reads as painted onto the parchment.
- Right column has only: name, quote, (optional) matched drink, user vibe line, why. No labeled sections.
- Bottom strip is a single compact row: QR + Vibetail wordmark + slogan.
- If the illustration is not yet ready, Save shows `Preparing…`, never exports a card with an empty left half.
