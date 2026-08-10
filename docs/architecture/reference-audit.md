# Reference audit

## Phase 2.5 addendum

The landing and management references were re-audited before Core Product Migration. The old root marketing route, `MarketingLanding`, landing styles, `manage.$privateToken.tsx`, `manage.functions.ts`, token helper, and their direct Supabase schema dependencies were read from reference commit `602b08d` without modifying the old repository.

Selected migration decisions: retain the platform-to-restaurant journey and the server-side SHA-256 token ownership pattern; reimplement them against current contracts and isolated clients. Rejected: copying the full old `src`, Lovable packages/gateway, broad marketing pages, generated drink facts, uploads, analytics, advanced games/templates, and production migrations. The result is a narrow temporary token adapter with an Auth/RBAC deletion condition.

Status: Phase 1 complete on 2026-08-09. The legacy repository was inspected read-only at commit `602b08d56148cb7e35a51072fbfc7420bb375e26`.

## Scope and evidence

Legacy repository: `/Users/wanghan/Desktop/projects/vibetail`

The legacy worktree was not clean (`docs/` and `tmp/` were untracked), so all source evidence below was read with `git show 602b08d:<path>`. No legacy file, index, branch, dependency directory, or generated artifact was changed. The migration and architecture documents were read in full from the requested repository, and the specified restaurant, matching, analytics, generated database type, Supabase configuration, and migration files were inspected at the reference commit.

The Alibaba Cloud FC Sandbox handbook was also read in full. Despite `1-page A4` in its filename, PDF metadata and rendering show **3 pages**. Its key constraints are carried into the target architecture: a real execute-wait-execute scenario, actual hibernation rather than idle polling, external-event wake, durable checkpoints and trace continuity, measured wake latency and cost saving, isolation evidence, FC/E2B parity evidence, SLS/trace/metrics/alerting, one real debugging story, and a public no-login demo.

## Disposition vocabulary

- **Temporary port**: may be selectively copied in Phase 2 into `apps/web/src/features/restaurant-legacy/`; it must remain view/interaction/adapter-only and be deletable.
- **Extract knowledge only**: preserve behavior, copy, or constraints in new code; do not copy the implementation.
- **Rewrite**: the capability remains but must be implemented behind the new contract.
- **Defer**: not part of the current phase or critical demo path.
- **Do not port**: excluded product/runtime scope.

## File-by-file audit

| Legacy path or area | Disposition | Knowledge retained / reason |
| --- | --- | --- |
| `docs/MIGRATION_FROM_LOVABLE.md` | Extract knowledge only | Restaurant-first scope, independent runtime, canonical ID validation, parallel UI ownership, data cutover risks. |
| `docs/ARCHITECTURE.md` | Extract knowledge only | Current topology, route inventory, Lovable coupling map, reduced target domain, schema and RLS risks. |
| `src/routes/m.$merchantSlug.$menuSlug.tsx` | Rewrite | Keep `/m/:merchantSlug/:menuSlug`, loader states, metadata/canonical semantics, restaurant context, language behavior, error states. Rebuild the route against `RestaurantClient`; do not retain games registry or hard-coded production canonical host. |
| `src/components/screens/MoodInputScreen.tsx` | Temporary port (selective, Phase 2 only) | Mobile interaction, two-stage mood/sensory progression, loading and retry behaviors may be isolated. Remove standalone generation, old result encoding, Tashi recipes, analytics names, old navigation, and domain/backend logic. |
| `src/components/screens/ResultCardScreen.tsx` | Do not port | It is deeply coupled to generated cocktail types, image generation, Supabase browser access, Auth, save/gallery, QR poster, share, print, newsletter, and retired routes. A minimal restaurant result view may be rebuilt later from canonical contract fields. |
| `src/lib/mood-config.ts` | Temporary port (selected entries only) | Useful bilingual mood labels, short replies, and colors. Review product tone and remove irrelevant/unsafe alcohol or work-specific copy before use. |
| `src/lib/i18n.tsx` | Temporary port (restaurant keys only) | Preserve `en`/`zh` locale behavior and restaurant loading/error copy. Do not port landing, auth, gallery, ingredients-photo, save/share/print keys. |
| `src/lib/matching/types.ts` | Rewrite | Preserve mood/flavor/exclusion concepts and canonical item metadata; replace games/results with `packages/contracts` restaurant types. |
| `src/lib/vibe-examples.ts` | Extract knowledge only | Bilingual brand-tone examples and theme-isolation concept. Do not make example text or randomized style selection part of the domain contract. |
| `src/lib/vibe-cloud.ts` | Temporary port (optional visual data only) | May support the temporary mood picker. It is UI content, not matching truth. |
| `src/lib/vibeflow.ts` | Extract knowledge only | Deterministic sensory mapping and loading progression are useful interaction references. Reassess preference fields with the new restaurant-flow owner before porting. |
| `src/lib/menu/public.functions.ts` | Rewrite | Retain active merchant lookup, published menu check, `published_version_id` validation, ordering, and normalized public fields. New server repository must explicitly filter public data and matching eligibility. |
| `src/routes/api/menu-match.ts` | Rewrite | Retain active-item filtering, bilingual tone constraints, literal exclusions, structured output, failure UX. Change name selection to `matchedItemId`, use provider adapter, validate schema/allowlist/ownership/current availability, and return canonical facts from the repository. |
| `src/lib/analytics.ts` | Extract knowledge only | PostHog host and best-effort failure behavior are useful. Replace hard-coded key/host/production-domain logic and old event names with validated environment configuration and the new funnel taxonomy. |
| `src/integrations/supabase/types.ts` | Rewrite (regenerate) | Schema reference only. New types must be generated from the controlled Supabase project; do not manually carry this generated file forward. |
| `supabase/config.toml` | Extract knowledge only | Records legacy project reference `jaekvnauuqrpuwmclsib`; it is not copied into runtime configuration. |
| `supabase/migrations/20260715031925_a9455233-9170-4862-9cb2-c1a18db39c33.sql` | Extract knowledge only | Source for merchant/menu/item/version tables, enum values, policies, and legacy telemetry schema. It also contains seed data and must not be replayed automatically. |
| `supabase/migrations/20260715051355_b888bf20-9d6c-41e6-83b4-5a18f457221d.sql` | Extract knowledge only | Shows the later lock-down of game telemetry and service-role-only access. |
| `supabase/migrations/20260719045844_18f5ee44-ea78-46e5-b17f-0f7507b276ad.sql` | Extract knowledge only | Adds `menu_file_url` and `menu_file_type`; retain only if the final result/menu experience uses them. |
| `src/lib/menu/manage.functions.ts`, `src/routes/manage.$privateToken.tsx`, `src/lib/dcp-menu.ts` | Rewrite selectively (Phase 2.5) | Retain server-side token hashing, merchant ownership, publish snapshot, and immediate availability behavior. Rebuild only the minimum loop behind current contracts; exclude upload, delete, games, analytics, and full admin scope. |
| `src/integrations/lovable/`, `.lovable/`, Lovable build files/packages | Do not port | The new repo must be independently installable, buildable, and deployable. |
| `src/routes/api/generate-cocktail.ts`, `src/routes/api/generate-cocktail-image.ts` | Do not port | Standalone recipe and image generation are retired from MVP scope. |
| Gallery, save, poster, print, newsletter, unrelated marketing/games/auth/admin | Do not port | Outside restaurant and agent demo scope; would import unrelated domain and UI coupling. |

## Public menu and RLS findings

1. `merchants` public SELECT policy requires `is_active = true`.
2. `menus` public SELECT policy requires `status = published` and an active parent merchant.
3. `menu_items` public SELECT policy checks only the published/active parent relationship. It does **not** exclude `hidden` or `sold_out` rows.
4. The legacy public loader explicitly returns `active` and `sold_out` rows, while the legacy match endpoint filters to `active`.
5. The published loader rejects menus without `published_version_id` and confirms the referenced version exists, but reads live `menu_items`, not the version snapshot.
6. The legacy endpoint matches by a case-normalized item name. Duplicate names or stale/renamed items make that unsafe compared with ID selection.

Required new behavior: the server repository may return sold-out rows only when the UI contract deliberately needs display state; the model allowlist contains **only current active items**. After the provider returns an ID, the service must re-read or otherwise validate current merchant/menu ownership, active status, and visibility. Unknown, hidden, sold-out, foreign-menu, or stale IDs fail closed. Any future RLS correction must be an additive reviewed migration and must not be applied to production without approval.

## Business knowledge retained

- Canonical public route: `/m/:merchantSlug/:menuSlug`.
- Distinct states: inactive merchant, missing merchant/menu, unpublished menu, missing published version, empty menu, no active items, load failure, provider failure, retry.
- Useful preference concepts: mood, flavor, occasion/context, alcohol preference, exclusions, and bounded free text.
- Matching constraint: one item from the active allowlist; respect explicit negatives; use all available restaurant-supplied signals.
- Output: `matchedItemId` and `whyThisMatch`; all name, description, price, image, ingredients, allergens, section, and availability facts come from canonical data.
- Language: English and Simplified Chinese are supported contract locales for now; final launch copy remains owned by the restaurant-flow/UI teams.
- Analytics must be best-effort and must never contain secrets, full prompts, raw private input, or unsanitized logs.

## Temporary UI deletion contract

If Phase 2 ports any legacy mood UI, it must live under `apps/web/src/features/restaurant-legacy/` and carry this marker:

> TEMPORARY LEGACY RESTAURANT UI
>
> This feature will be replaced by the new restaurant frontend.
>
> Do not add backend or domain logic here.

Delete it when the new restaurant frontend implements the same `RestaurantClient` contract, maps all semantic loading/error/empty states, passes the shared fixtures and accessibility checks, and owns `/m/:merchantSlug/:menuSlug`. The compatibility mapper must be deleted with it. No temporary legacy UI was copied during Phase 1.

## Explicit non-actions

- No legacy repository mutation or dependency installation.
- No Lovable package, gateway, asset proxy, configuration, or secret migrated.
- No production database query, migration, policy update, seed replay, or generated-type claim.
- No production deployment, Railway mutation, Alibaba resource creation, DNS update, or domain cutover.
