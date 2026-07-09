# Vibetail — Mood Cocktail Lab Redesign

Complete visual + motion overhaul. **No flow, route, or business-logic changes.** All existing buttons, chips, inputs, i18n keys, analytics events, auth, DCP match, gallery, and API endpoints stay wired exactly as they are — we only replace the visual layer and add higher-craft motion.

---

## 1. Design tokens (src/styles.css)

Replace the warm-cream light theme with a dark Mood Lab palette. Keep all existing CSS variable *names* so components don't break — only swap values.

```
--app-bg-deep:      #101715   /* deep ink green */
--app-bg-charcoal:  #12151A   /* charcoal blue-black */
--app-bg-coffee:    #17120F   /* warm black coffee */
--app-text:         #E7D9C6   /* warm cream */
--app-text-secondary: #B8AFA3
--app-text-muted:   #7A7267
--app-primary:      #C96F54   /* muted vermouth */
--app-secondary:    #B98A87   /* dusty rose */
--app-accent-lav:   #9A91B2
--app-accent-sage:  #8FA99B
--app-accent-blue:  #748A9A
--app-glass-bg:     rgba(255,255,255,0.06)
--app-glass-bg-strong: rgba(255,255,255,0.10)
--app-glass-border: rgba(255,255,255,0.12)
--app-glass-shadow: 0 20px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)
--radius-lg: 28px
```

- Body background: radial + linear composite of deep-green → charcoal → coffee, fixed, with 3 slow-drifting blurred blobs (already have blob keyframes — retune colors to muted sage/lavender/vermouth at ~8% opacity).
- Update the shadcn `oklch` tokens (`--background`, `--card`, `--foreground`, `--primary`, `--border`, etc.) to dark equivalents so shadcn components inherit correctly.
- Add utility classes: `.glass-panel`, `.glass-panel-strong`, `.glass-chip`, `.liquid-shimmer`, `.breathing-glow`.
- Add fonts: keep Playfair Display for display; add **Cormorant Garamond** (headings/cocktail names) and **Inter** (UI/body) via `<link>` in `src/routes/__root.tsx` head. Register `--font-display: "Cormorant Garamond"`, `--font-heading: "Playfair Display"`, `--font-body: "Inter"`.

## 2. Global chrome

- `BottomNav.tsx`: dark glass bar, thin top border, muted icons; active tab gets soft amber glow instead of solid fill. Same 3 tabs (Home / Vibe Bar / Instagram).
- `Toaster`: dark theme variant.
- Root layout: swap the light gradient body background for the dark composite; blobs retinted.

## 3. Page-by-page

### Landing (`LandingScreen.tsx`)
- Dark hero, centered.
- Replace `VibetailLogo` decorative SVG with a **floating glass vessel** component (new `GlassVessel.tsx`): semi-transparent shaker silhouette with subtle inner liquid gradient, breathing halo (4–6s), 2px slow vertical float.
- Title "Vibetail" in Cormorant 56px, tagline in Inter 13px tracking-wide, subtitle in Playfair italic.
- Primary CTA "Check My Vibe" → glass button with amber inner glow + liquid shimmer sweep on hover; secondary "View the Vibe Bar" → ghost glass button.
- Top-right auth + language toggle → smaller, thinner glass pills.

### Step 01 — Choose Vibe (`MoodInputScreen.tsx` mood step)
- Header: "Exit Lab" text-only + minimal capsule progress `● ○` (Step 01 / 02).
- Central mini glass vessel above the title; when a chip is tapped, animate a colored droplet from chip → vessel (Framer Motion `layoutId` or absolute-positioned motion.div with keyframed path).
- Quick Vibe chips → translucent glass chips with a tiny colored mood dot (color derived from chip category). Selected state: inner amber glow + soft scale.
- "OR TYPE YOUR OWN" divider with hairline rules.
- Big textarea: dark glass, thin border that glows on focus (animated border-image or box-shadow transition).
- "Surprise Me" as inline ghost pill.
- Bottom "Next — Choose Flavor": disabled = flat glass; enabled = amber glow.

### Step 02 — Choose Flavor (same screen, flavor step)
- Selected vibe shows as a **sample vial card** at top (small vial SVG with liquid tinted by vibe color + text).
- Flavor Modifier chips: same glass-chip system, colored dots per flavor family (bitter=lav, citrusy=cream, smoky=blue-grey…).
- Base Spirit: custom dark glass Select with subtle backdrop-blur menu.
- Long / Short drink: two side-by-side glass cards, each with a mini glass shape that fills with liquid when selected.
- Reference input: wide dark glass input.
- "Mix My Drink": full-width primary glass CTA with amber glow.

### Mixing / Loading (`MixingOverlay.tsx` + `VibeBottle.tsx`)
This is the marquee upgrade. Rebuild `VibeBottle` as a layered SVG shaker:
- Glass body with gradient stroke + highlight sheen that shifts with rotation.
- Inner `<clipPath>` liquid rect animated with a sine-wave `<path>` surface (Framer Motion `useTime` driving a sinusoidal `d` attr) — liquid **lags** the shaker by ~150ms (separate `useSpring` with lower stiffness).
- 12–18 particles (dust/bubbles) floating around, radial-gaussian distribution, `animate={{ y: [-, +], opacity: [.2,.6,.2] }}` with staggered delays.
- Shaker rotation: small ±8° with easeInOut and 0.7s period (not stepped/cartoon).
- Below: rotating status lines from existing `lines` prop, but restyle with Cormorant italic + thin horizontal liquid progress line (already exists, retint to muted amber → transparent).
- Overlay backdrop: dark radial with heavy blur+saturate, not the current cream.
- Respect `prefers-reduced-motion`.

### Result — Cocktail Card (`ResultCardScreen.tsx`)
- Dark page background; central card becomes a **dark glass cocktail menu card** with hairline border, soft inner glow, 28px radius, subtle grain overlay.
- Front:
  - Small "VIBE CHECKED ✓" top badge (Inter 10px tracking).
  - Central visual: reuse the existing generated image but frame it in a **glass vessel silhouette** with a soft inner shadow and floating micro-particles overlay (absolute positioned).
  - Cocktail name in Cormorant 40px, centered.
  - Poetic quote in Playfair italic, `--app-secondary` (dusty rose).
  - Tag capsules: thin border, uppercase Inter 10px, tracked, low-sat colors.
  - "Tap to flip" hint at bottom in Inter 10px muted.
- Back:
  - Header "Your Mood Recipe" (Cormorant, small caps).
  - Structured rows: Base / Top Note / Middle / Finish / Intensity / Body Feel / Mood Color — hairline dividers between rows, label left (muted), value right (cream). Map from existing recipe/tasting-notes/roast data — no schema changes.
  - "Why this drink" block in italic.
  - DCP "Order this" block stays as-is per prior memory, restyled as an amber-tinted glass panel.
- Card flip: existing flip logic kept; upgrade to a longer, damped 3D flip (`rotateY` with spring stiffness ~90, damping ~18), soft shadow beneath during flip.
- Entrance: liquid → name → quote → tags staggered (0.15s apart) with `y: 12 → 0` + fade, no bounce.
- Action stack (unchanged order per memory): Save / Share / Follow grid → Save to Vibe Bar → Guest list glass panel → Check Another Vibe.
- Buttons: primary = dark glass + amber glow; secondary = ghost glass; guest list panel styled quiet and editorial (not marketing).

### Vibe Bar / Gallery (`GalleryScreen.tsx`)
- Header "My Vibe Bar" in Cormorant.
- Filter chips row (new UI only, no new filter logic unless trivial client-side): Today / Week / Month; Deep / Calm / Bright; flavor families. If existing store has no time/mood metadata, wire filters client-side over `createdAt` + tag arrays already present.
- Cards: horizontal glass "bottle-label" cards — left column has a mini liquid vial thumbnail (small SVG driven by mood color), right column stacks name (Cormorant), timestamp, vibe keywords, flavor tag capsules, one-line summary.
- Grid: 1-col mobile, 2-col ≥ md.
- Filter transitions: Framer Motion `AnimatePresence` with fade+slide, `layout` prop for reflow.
- Sign-in modal + auth handling: untouched (recent bugfixes preserved).

## 4. Motion system

- Standardize easings: `[0.22, 0.61, 0.36, 1]` for entrances, `[0.4, 0, 0.2, 1]` for exits.
- Page transitions via a single `<PageTransition>` wrapper around each route's content (fade + 8px y). Route-specific transitions (droplet-into-vessel between steps, chips-into-shaker before mixing) implemented locally with `layoutId` where possible; fallback to overlay component for cross-page.
- All animations respect `prefers-reduced-motion`.

## 5. File changes (all edits, no route changes)

Edit:
- `src/styles.css` — token overhaul + utilities + fonts.
- `src/routes/__root.tsx` — font `<link>`s, dark background blobs retint.
- `src/components/moodtail/VibetailLogo.tsx` → replace internals with glass vessel.
- `src/components/moodtail/VibeBottle.tsx` → new layered SVG shaker + liquid physics.
- `src/components/moodtail/MixingOverlay.tsx` → dark backdrop, new copy rotation styling.
- `src/components/moodtail/BottomNav.tsx` → dark glass.
- `src/components/moodtail/AuthModal.tsx` → dark glass panel.
- `src/components/moodtail/UserMenu.tsx` → dark glass.
- `src/components/screens/LandingScreen.tsx` → dark hero + glass CTAs.
- `src/components/screens/MoodInputScreen.tsx` → step 01 + 02 visuals, chips, vial, inputs.
- `src/components/screens/ResultCardScreen.tsx` → dark card, front/back restyle, action stack polish.
- `src/components/screens/GalleryScreen.tsx` → Vibe Bar restyle + filter chips.

Add:
- `src/components/moodtail/GlassVessel.tsx` — shared glass vessel/vial SVG (reused on Landing, Step 01 header, Gallery thumbs, Result frame). Props: `size`, `color`, `mode: "idle" | "mixing" | "thumb"`.
- `src/components/moodtail/GlassButton.tsx` — variants: `primary | secondary | ghost`, shared shimmer + glow.
- `src/components/moodtail/GlassChip.tsx` — used for vibes, flavors, filters.
- `src/components/moodtail/PageTransition.tsx` — motion wrapper.

Not touching: routes, API handlers, `analytics.ts`, `cocktails-store.ts`, `dcp-menu.ts`, i18n keys/strings (only where a new UI string is truly new), Supabase integration files, sitemap, SEO heads.

## 6. Verification

- `bun run build` clean.
- Playwright: screenshot each of the 6 screens (Landing, Step 01, Step 02, mid-mixing overlay, Result front, Result back, Gallery) at 390×844 to confirm dark theme, no clipped CTAs above the bottom nav, card flip works, action order preserved.
- Confirm existing bugfixes still hold: gallery sign-in stays on `/gallery`, DCP back nav returns to `/restaurants/double-chicken-please`, result card front fits above nav.

## Out of scope (call out before build)

- No copy rewrites beyond the exact strings you listed. Existing i18n Chinese strings stay.
- No new backend fields for Gallery filters — filter over data already in the store.
- Guest list form: visual restyle only; keep whatever submit behavior exists today.
- Not swapping generated cocktail imagery pipeline.
