# Mobile fix — bottle clipping + oversized vibe cloud

## What's actually happening (verified on 390×844)

Probed `/mood-input` on mobile with Playwright. Measured elements:
- Viewport: 844px tall
- `.bottle-visual` container: `y=94, h=219` (from `clamp(180, 26dvh, 240)` = 219)
- Bottle SVG bounding box: `y=52, h=219, w=115` — sits **42px above** its container
- `.mood-tags-section`: `y=339, h=391` — **~46% of the screen**
- `.stage-one-input`: `y=735, h=97`
- `.stage-one-cta`: `y=832, h=12` — CTA slot exists but is only 12px (below fold when button appears)

### Root cause 1 — bottle "cap missing / floating"

`VibeBottle` receives `size={300}` and `GlassVessel` renders an inner wrapper that is **300px tall** (aspect 220:420). Mobile CSS then applies:

```css
.bottle-visual { height: clamp(180px, 26dvh, 240px); overflow: hidden; }
.bottle-section svg { max-height: clamp(180px, 26dvh, 240px); }
```

Two problems compound:
1. `max-height` only clamps the inner `<svg>` element, **not** the outer wrapper `<div>` that GlassVessel uses for size. The wrapper stays 300px tall, gets flex-centered inside a 219px container, and `overflow: hidden` clips **~40px off both the cap and the base**. That's the "bottle displays wrong".
2. The `overflow: hidden` was added earlier only to contain the aura glow — it is what's now hiding the cap.

### Root cause 2 — vibe cloud eats half the screen

- `.mood-tags-section` uses `flex: 1 1 0` with no cap, so it grabs everything left over between bottle (bottom ~313) and input (top ~735) → **~391px, roughly half the viewport**.
- The scroll content is intentionally tripled for infinite loop (`scrollHeight ≈ 6503`), which is fine, but the visible viewport is what feels overwhelming.
- Because bottle-visual is clamped small and the "reply line" slot below it is only 24px, all the slack falls into the cloud.

### Root cause 3 — CTA slot squeezed

When a vibe is picked, the "继续调味" button appears in `.stage-one-cta` which currently reserves only ~12px. On short viewports the button pushes into safe-area / gets partially hidden. Need a real reserved height.

## Fix plan (frontend/CSS only in `MoodInputScreen.tsx`, plus one prop change)

All edits are in `src/components/screens/MoodInputScreen.tsx`. No API, no data, no other files.

### 1. Make the bottle actually fit its slot
- Pass a mobile-appropriate `size` to `<VibeBottle>` instead of hard-coding 300. Compute from viewport: `size = Math.min(bottleSize, window height-based value)`. Simplest: use the existing `bottleSize` prop path — set it to `220` for vibe stage on mobile (respect `useIsMobile`).
- Remove `overflow: hidden` from `.bottle-visual`. Instead, contain the aura by:
  - shrinking `.bottle-aura` to `width:100%; height:70%; top:15%` and clipping only the aura via its own `mask-image` (no clipping of siblings), OR
  - wrapping just the aura in an `overflow:hidden` inner div that sits behind the SVG (z-index 0), leaving the SVG free to render at natural size.
- Drop the CSS `max-height` override on `.bottle-section svg` (no longer needed once the JS `size` is correct); keep only a `width:auto; display:block` centering rule.

### 2. Give the vibe cloud a sensible cap on mobile
- Change `.mood-tags-section` from `flex: 1 1 0` to `flex: 0 1 auto` with an explicit `height: clamp(160px, 26dvh, 220px)` on mobile (`max-width: 767px`). Desktop keeps `flex: 1 1 0`.
- This makes the cloud a fixed "window" (~26% of viewport) rather than "everything left over", which is what the user is complaining about.
- Keep the infinite-loop scroll behavior in `FloatingVibes.tsx` unchanged.

### 3. Rebalance vertical space so the CTA is always visible
- Change the outer stage container from `flex-1` with everything relying on `flex-1-1-0` middle, to an explicit column with reserved slots on mobile:
  - title: auto
  - bottle+reply: auto (natural, driven by JS bottle size)
  - tags: `clamp(160, 26dvh, 220)` (capped, see #2)
  - input: auto (existing 72px textarea)
  - CTA: **`min-height: 60px`** reserved even when the button is hidden, so layout doesn't jump when a vibe is picked
- Tighten paddings around bottle/reply/tags so the whole column fits inside 100dvh minus safe areas on 390×844, 375×667, and 430×932.

### 4. Verify

After edits, re-run the Playwright probe on 390×844 and 375×667 to confirm:
- SVG bounding box top ≥ container top (no cap clipping)
- `.mood-tags-section` height ≤ 240 on mobile
- `.stage-one-cta` bottom ≤ viewport height and slot height ≥ 56
- Screenshot both viewports before/after.

## Out of scope

- No changes to `GlassVessel.tsx` internals, animation, or vibe library.
- No changes to Stage Two, transition stage, backend, or analytics.
- Desktop layout stays as-is (the media queries only alter mobile).
