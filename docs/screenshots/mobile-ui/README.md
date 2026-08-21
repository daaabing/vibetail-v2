# Mobile layout pass — before / after

Captured at 375×812 against the local stack with the `menus.json` seed.
Each `compare-*` image is the same page before and after the fix, side by side.

| File | Page | What it shows |
| --- | --- | --- |
| `compare-wizard.png` | `/m/:venue` | The pour stage's glass overflowed its 36svh box onto the wordmark and the status ledger. |
| `compare-forbars.jpg` | `/for-bars` | Hero copy started at y=0 and rendered under the absolute overlay header. |
| `compare-venues.png` | `/venues` | A superseded card rule squeezed each venue into a half-width column. |
| `compare-result.png` | `/m/:venue` (result) | `.vt-match-main` had no width, so the result header sat flush against the screen edge. |
| `check-burger-fixed.png` | any page, menu open | The burger's open state, after correcting the bar pitch from 11px to 6px. |
