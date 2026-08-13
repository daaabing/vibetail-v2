# Integration boundaries

## Ownership map

| Path | Owner / purpose | Allowed dependencies | Must not contain |
| --- | --- | --- | --- |
| `apps/web/src/features/platform/` | Landing, global match, directory, and minimal management UI | `RestaurantClient`, `ManagementClient`, shared contracts | Supabase/model SDKs, service-role key, matching policy |
| `apps/web/src/features/restaurant/` | Current restaurant UI/flow | shared contracts, `RestaurantClient` | provider SDKs, privileged data access |
| `apps/web/src/features/agent/` | Agent status/approval UI | Agent API contracts | restaurant component internals, worker execution |
| `apps/web/` | HTTP composition, server/client env split, API/page wiring | core packages and adapters selected at composition root | vendor business logic, browser secrets |
| `apps/agent-worker/` | durable run execution and provider composition | `agent-core`, `sandbox-runtime`, adapters, observability | React/UI implementation |
| `packages/contracts/` | stable cross-team runtime schemas and TypeScript types | Zod only | UI, database clients, model or sandbox SDKs |
| `packages/restaurant-core/` | menu/matching/validation use cases | contracts and abstract ports | React, provider SDKs, direct UI mapping |
| `packages/agent-core/` | workflow state transitions and persistence ports | contracts and abstract ports | restaurant components, FC/E2B SDKs |
| `packages/sandbox-runtime/` | provider-neutral sandbox contract | platform-neutral types | vendor SDKs |
| `packages/provider-fc/` | Alibaba AgentRun/FC implementation | sandbox runtime plus FC dependencies | restaurant/agent business policy |
| `packages/provider-e2b/` | E2B-compatible implementation | sandbox runtime plus E2B dependencies | restaurant/agent business policy |
| `packages/model-providers/` | provider-neutral model port and adapters | contracts; provider SDKs only in adapter modules | canonical menu ownership decisions |
| `packages/observability/` | structured telemetry contracts/sinks | platform-neutral telemetry APIs | product analytics behavior or secrets |
| `infra/` | reviewed deploy templates/configuration | deployment tooling | domain logic or production credentials |
| `fixtures/` | deterministic shared contract/demo inputs | versioned contracts | production exports or personal data |

## Stable change surface

Changes to `packages/contracts` must be backward compatible for current consumers or introduced as a versioned API change. Contract pull requests require:

1. runtime schema and inferred type change together;
2. fixture and contract-test updates;
3. documented optionality/default semantics;
4. verification that the current UI, restaurant core, and API agree;
5. no legacy-only field added to the canonical contract.

The version 1 restaurant boundary fixes route identity, semantic states, input limits, selection-by-ID, canonical facts, and error codes. Visual layout, question wording, animation, and page composition remain replaceable.

## How UI replacement is integrated

The `ui-polish` visual system was reimplemented in the current Vite application while retaining `RestaurantClient`, `ManagementClient`, shared fixtures, and every semantic error state. The old restaurant feature and its compatibility mapper were removed after route, mobile, accessibility, and forbidden-import checks passed.

No API, Agent backend, worker, sandbox provider, or Supabase boundary should change merely to replace presentation.

## How the new restaurant flow connects

The restaurant flow provides approved preferences to `RestaurantClient.matchItem` and renders `RestaurantMatchResult` directly. If it needs an additional domain field, change the contract first rather than reading Supabase from the browser. Backend behavior remains in `restaurant-core`.

## Global and management boundaries

`RestaurantClient.matchGlobal` and `RestaurantClient.matchItem` converge on one restaurant service implementation. Global scope supplies every eligible published menu; restaurant scope supplies exactly one menu. Both paths filter availability/preferences before provider invocation, accept only `matchedItemId`, re-read the selected menu/item, and canonicalize facts from the repository.

`ManagementClient` calls `/v1/management/*`. The browser supplies a temporary bearer token but never imports Supabase or service-role configuration. `ManagementService` verifies the token, derives merchant ownership server-side, and delegates to a separate `ManagementRepository`. Public read, matching, and management APIs remain distinct even when fixture mode shares one in-memory repository instance.

The token adapter is temporary. Its deletion condition is Supabase Auth plus `merchant_memberships`/RBAC covering the same management service contract. Token values must not appear in structured logs, analytics events, query strings, or API response bodies.

## Merge-conflict policy

- UI owners avoid `packages/agent-core`, `packages/sandbox-runtime`, provider packages, and worker internals.
- Backend owners avoid broad edits inside incoming restaurant UI directories.
- Shared schema edits are small, reviewed separately, and land before dependent UI/backend changes.
- Generated files and lockfile changes are isolated from visual work when practical.
- Each parallel branch adds files within its owned directory; route composition changes happen only at integration time.
- Do not format or reorganize unrelated code during integration.

## Compatibility mapper status

The temporary restaurant compatibility mapper has been deleted. Generated-recipe, image, save, poster, and game fields were not added to the canonical API.
