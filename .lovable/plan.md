# Change world-cup-final default language to English

## Goal
Update the `/m/vibetail/world-cup-final` menu landing page so it defaults to English instead of Chinese.

## Current state
In `src/routes/m.$merchantSlug.$menuSlug.tsx`, the `useEffect` in `MenuLanding` currently forces `zh` when `menu.menuSlug === "world-cup-final"` and also falls back to `zh` when no saved language exists.

## Proposed change
1. Flip the conditional branch for `world-cup-final` to call `setLang("en")`.
2. Keep the fallback for other merchant menus as `zh` (or preserve existing behavior) so the change only affects this specific event menu.

## Files to edit
- `src/routes/m.$merchantSlug.$menuSlug.tsx` (lines 92–101)

## Verification
- Open `/m/vibetail/world-cup-final` in a fresh browser context (no `vibetail-lang` localStorage).
- Confirm the landing page renders in English and the language toggle still allows switching to Chinese.
