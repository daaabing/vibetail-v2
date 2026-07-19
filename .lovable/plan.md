# Why "layoff" ends up as "接盘"-style relationship names

## Root cause

Three compounding issues in the Chinese vibe-reference pipeline:

1. **`pickVibeExample` can't see "layoff".** The prefill string in `src/lib/moodtail-data.ts:214` is `"公司马上要 layoff 了，在刷一亩三分地"` — the only work-related token is the English word `layoff`. Every `moodTag` / `sceneTag` in `src/lib/vibe-examples.ts` is Chinese (`上班`, `打工`, `加班`, `牛马`, …). No tag matches, so scoring for the work example `"上班如上坟"` is ~0. Then the random jitter (`Math.random() * 0.6` per example, line 309) decides the winner — often an `EMOTIONAL_EXAMPLES` entry like `"还以为是被爱了"` or `"所以我们现在是什么关系"`. That's exactly where the relationship / 接盘 tone leaks in from.

2. **`isEmotionalVibe` doesn't fire either**, so there's no emotional bonus to steer toward — but crucially there's also no *penalty* against emotional examples for a work vibe. The current rule (line 304) only penalizes generic examples when the mood is emotional; the reverse case isn't guarded.

3. **The prompt says "don't reuse strings" but not "don't reuse subject matter".** In `src/routes/api/generate-cocktail.ts` the vibe block tells Gemini to mimic tone/cadence and forbids copying strings, but doesn't forbid inheriting the *theme* (relationship, 接盘, 暧昧). With a mismatched reference forced in, Gemini happily writes a relationship-themed name for a layoff mood.

The same pipeline is used by `src/routes/api/menu-match.ts`, so the merchant side has the same bug.

## Fix

### 1. Teach the matcher about layoff / 裁员 / 失业 vocabulary
In `src/lib/vibe-examples.ts`:
- Expand the `"上班如上坟"` example's `moodTags` and `sceneTags` with: `layoff`, `裁员`, `被裁`, `失业`, `找工作`, `求职`, `跳槽`, `一亩三分地`, `刷题`, `简历`, `n+1`, `毕业`(职场语境), `optimize`, `优化`(裁员委婉说法), `毕业典礼`.
- Add the same tokens to `EMOTION_KEYWORDS` is *not* right — layoff isn't romantic. Instead add a small `WORK_KEYWORDS` list and a `isWorkVibe(mood)` helper.

### 2. Add a work-vs-emotional guard in `pickVibeExample`
- If `isWorkVibe(mood)` is true and the example is `emotional`, subtract 3 (hard steer away from relationship examples).
- If `isWorkVibe(mood)` is true and the example is `"上班如上坟"` (or any future work-tagged example), add 3.

### 3. Add a confidence floor
After the loop, if `bestScore < 2` (i.e. no example genuinely matched), return `null` instead of the least-bad example. Update `MoodInputScreen.tsx` to only send `vibeReference` when `pickVibeExample` returns a real hit — otherwise let the model free-write in the base Chinese style rules. This prevents forcing an unrelated tone reference in edge cases.

Signature change:
```ts
export function pickVibeExample(mood, ctx): VibeExample | null
```

### 4. Harden the prompt against theme-leak
In both `src/routes/api/generate-cocktail.ts` and `src/routes/api/menu-match.ts`, in the `vibeBlock`:
- Add an explicit line: *"参考条目只用来学语气和节奏。绝对不要沿用参考条目的主题 / 场景 / 关系对象（例如参考是恋爱/暧昧/接盘/前任类，但用户当下的 vibe 是失业/裁员/搬家/独处，那名字必须写用户当下的主题，不能出现恋爱、接盘、前任、暧昧等词）。"*
- Add layoff-specific negative examples to the existing "禁忌" block so the model doesn't wander into relationship territory when the user vibe is about work loss.

### 5. (Optional but cheap) Normalize the mood string before matching
In `MoodInputScreen.tsx` where `moodText` is passed to `pickVibeExample`, lowercase-normalize and expand a small alias map (`layoff → 裁员 失业`, `n+1 → 裁员补偿`, `一亩三分地 → 找工作`) purely for the matcher — the original user text still goes to Gemini untouched.

## Files touched

- `src/lib/vibe-examples.ts` — add work keywords, work-vibe guard, confidence floor, nullable return type, work moodTags on the existing office example.
- `src/components/screens/MoodInputScreen.tsx` — handle `null` from `pickVibeExample`; small mood-text normalization before matching.
- `src/routes/api/generate-cocktail.ts` — theme-leak guard in `vibeBlock`; layoff-aware negative examples.
- `src/routes/api/menu-match.ts` — same theme-leak guard for parity with the main app.

No schema changes, no new dependencies, no UI-visible changes beyond the improved output.
