# Build with Gemini XPRIZE submission plan

Last audited: 2026-08-15 (PDT)

Submission deadline: **2026-08-17 at 1:00 PM PDT**

Recommended category: **Small Business Services**

## Executive verdict

Vibetail has a healthy, working restaurant/venue product foundation, but it is **not minimally submission-ready today**.

The codebase already has a public React/Express experience, allowlisted real-menu matching, venue management flows, Supabase boundaries, a Railway deployment, and a clean CI pipeline. The hard XPRIZE gates still missing are:

1. a Gemini call in the deployed product;
2. use of a Google Cloud product (Vertex AI is the recommended single integration that satisfies both technical requirements);
3. evidence that Gemini/AI is executing key production decisions;
4. proof that this is a new business created during the May 19–August 17 submission period;
5. real-user, customer, revenue, expense, and marketing-spend evidence;
6. the repository access/testing package, English narrative, public sub-three-minute video, P&L, and evidence bundle;
7. a fresh public deployment of the current source revision.

The submission should focus on one defensible story:

> Vibetail is a Gemini-powered menu concierge for bars and restaurants. A guest describes their mood and preferences; Gemini selects from an allowlist of currently available real menu items, and Vibetail validates the choice before returning canonical venue data. This helps small venues offer personalized hospitality without adding staff or inventing menu facts.

For the submission, this bounded production workflow is named the **Vibetail Tasting Agent**. It is a real agent in the narrow product sense: it receives a guest goal, evaluates live venue-owned candidates, makes the recommendation decision with Gemini, explains the decision, and produces a traceable result. It is intentionally not represented as a general autonomous coding agent or as the unfinished FC Sandbox workflow.

The file-level engineering sequence, contracts, tests, Railway rollout, evidence capture, rollback, and Definition of Done are specified in [Tasting Agent technical implementation plan](xprize/tasting-agent-technical-plan.md). That plan must be reviewed before product implementation begins.

Do not attempt to finish the Alibaba FC/E2B durable agent roadmap for this submission. It is not a Build with Gemini XPRIZE requirement and would put the mandatory gates at risk with roughly two days remaining.

## Official minimum requirements

Sources:

- Hackathon overview: <https://xprize.devpost.com/>
- Official rules: <https://xprize.devpost.com/rules>
- Official FAQ: <https://xprize.devpost.com/details/faq>
- Schedule: <https://xprize.devpost.com/details/dates>
- Vertex AI Gemini quickstart: <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart>

| Requirement | Minimum interpretation for Vibetail |
| --- | --- |
| Deadline | Submit on Devpost by August 17, 2026 at 1:00 PM PDT. The entry locks at the deadline. |
| Entrant eligibility | Every team member must be of legal majority and otherwise eligible; an organization must have fewer than 25 employees. A team/organization must name one representative. |
| New business | The business—not merely this repository—must have been created after May 19, 2026. Pre-existing generic templates/code may be reused only with a clear disclosure. |
| Category | Select one category. `Small Business Services` is the clearest fit. |
| AI-operated business | Explain and demonstrate how AI transforms a business workflow and executes key decisions live in production. |
| Google Cloud | Use at least one Google Cloud product. |
| Gemini | At least one LLM call in the deployed application must use the Gemini API. Vertex AI Gemini satisfies both this and the Google Cloud requirement. |
| Working product | Provide a free, unrestricted website/demo/test build through the end of judging; include credentials if access is private. |
| Repository | Include all necessary source. Make the repo public with appropriate licensing, or keep it private and share it with `testing@devpost.com` and `judging@hacker.fund`. |
| Description | Explain how the project meets the requirements and why it fits the category. The overview requests a 500–1000 word AI-operations narrative covering AI vs. human work, economic opportunity, and the build story. |
| Video | Public YouTube, Vimeo, or Youku video, less than three minutes, showing the functioning product. Avoid unlicensed music, trademarks, and other copyrighted material. |
| Revenue/expense evidence | Report total revenue, revenue for May/June/July/August, total expenses, marketing/customer-acquisition spend even if zero, and related-party revenue separately. Include a simple P&L and corporate ID if entering as an organization. |
| User/customer evidence | Provide real-user counts and a high-level breakdown, customer feedback/testimonials with consent, and be prepared to provide customer contact details on request. |
| Product-running evidence | Include Google Cloud billing statements/cost evidence, Gemini observability dashboard screenshots, API usage, and sanitized decision/execution logs. |
| Language and rights | Submission materials must be in English or include English translations. The team must own the work and comply with all third-party licenses/terms. |

There is no published minimum revenue or customer count, but the project is defined as a real business and is judged on real customers, real revenue, and sustainability. Do not submit fabricated, circular, or undisclosed related-party activity.

## Current-state audit

| Area | Status | Evidence and gap |
| --- | --- | --- |
| Product/category fit | Strong | Guest matching and venue management clearly serve small hospitality businesses. |
| New-project code history | Strong but not sufficient | This repository begins on August 8, 2026, within the submission period. The entrant must separately establish that the business itself—not just the repo—was newly created after May 19. |
| Working application | Partial | React UI, Express API, venue matching, management flow, health/readiness, and responsive states exist. |
| Public deployment | Partial/risky | `https://vibetailweb-production.up.railway.app` returned healthy/ready on August 15 and saw two Supabase menus, but it serves an older `/v1/restaurants` revision while current source exposes `/v1/venues`. |
| Real menu decision safety | Strong | The model returns only `matchedItemId + whyThisMatch`; the server revalidates availability/ownership and returns canonical menu facts. |
| Gemini in deployed app | Missing/blocking | Current source implements deterministic, OpenAI, and OpenRouter providers. `vertex`/`gemini` appear only as environment selections; no live adapter exists. |
| Google Cloud product | Missing/blocking | Current app is deployed on Railway and reads Supabase. No Google Cloud service is connected. |
| AI-native operation | Partial | OpenRouter matching and AI-assisted venue data exist, but no production Gemini decision trail is available. The broader AgentRun/FC workflow is contract-only. |
| Agent/sandbox roadmap | Not implemented; not required for minimum | Agent store interfaces and sandbox contracts exist, but there is no state machine, worker loop, durable store, public agent UI/API, FC SDK, or execute/hibernate/resume behavior. Do not claim these as current capabilities. |
| Observability/evidence | Missing/blocking | Trace IDs exist, but there is no Gemini usage dashboard capture, token/latency evidence bundle, product analytics, or submission evidence index. |
| Customer/revenue proof | Unknown/blocking outside code | No customer, payment, P&L, expense, marketing, or testimonial evidence is stored in the repository. This must be gathered truthfully by the entrant. |
| Submission assets | Missing/blocking | `docs/demo/README.md` is a placeholder. No XPRIZE narrative, test instructions, evidence index, video script, or financial template exists. |
| Repository quality | Pass | On August 15, `pnpm run ci` passed lint, strict typecheck, 99 unit tests, 16 integration tests, production client/server builds, forbidden-runtime scan, and client-secret scan. |
| Lovable independence | Pass | Runtime/manifest audit found no forbidden Lovable coupling. |

## Minimal implementation plan

### Phase 0 — Go/no-go business checks (owner: entrant; immediate)

These are contest eligibility gates and cannot be solved in code.

- Confirm every participant's eligibility and appoint the submitting representative.
- Write a dated factual statement showing that the Vibetail business submitted here was created after May 19, 2026. If Vibetail operated as this same business before May 19, obtain written clarification from Devpost before relying on a new repository or new feature.
- Select `Small Business Services`.
- Identify at least one arms-length venue/customer and one genuine paid transaction before the deadline if none exists. Preserve the invoice/receipt, payment record, service delivered, date, and customer consent. Report team/family/pre-existing-customer revenue separately.
- Decide whether the entrant is an individual, team, or organization. If an organization, gather its corporate ID.
- Create the Devpost project draft now so hidden form fields are discovered before final submission.

**Exit gate:** new-business eligibility is defensible; the category, representative, customer, and revenue evidence owners are named.

### Phase 1 — Implement the bounded Gemini Tasting Agent (owner: engineering; T-48h to T-36h)

Use the existing provider boundary. Do not put Google SDK calls in UI or venue-core.

1. Add `@google/genai` to `packages/model-providers` and implement a `VertexGeminiModelProvider` there.
2. Add validated server-only configuration such as:
   - `MODEL_PROVIDER=vertex`
   - `MODEL_NAME=gemini-3.5-flash` (verified in the selected Google Cloud project)
   - `GOOGLE_CLOUD_PROJECT`
   - `GOOGLE_CLOUD_LOCATION`
   - the minimum Vertex authentication secret required by the selected deployment mode
3. Keep credentials out of the browser bundle, logs, fixtures, and repository. Prefer a dedicated least-privilege Google Cloud identity or Vertex AI express-mode key.
4. Send only bounded preferences plus the server-generated eligible-item allowlist to Gemini.
5. Require structured output containing exactly `matchedItemId` and `whyThisMatch`.
6. Reuse the existing server-side revalidation/canonicalization. Invalid JSON, an unknown ID, a hidden/sold-out item, or a cross-menu ID must fail closed.
7. Emit a sanitized structured `ai_decision` log with trace ID, provider, model, prompt version, candidate count, latency, token usage when supplied, success/failure, and selected item ID. Do not log secrets, full prompts, private free text, or customer PII.
8. Add mocked provider tests for valid output, invalid schema, timeout/provider error, and usage metadata. Re-run all existing allowlist/canonical-fact tests.
9. Update `.env.example`, deployment docs, current-system-status, and README so Gemini is described as real only after live verification.

**Exit gate:** `pnpm run ci` passes; a local/staging call through the Vertex provider returns an allowlisted item and exposes safe trace/usage metadata.

### Phase 2 — Deploy a current, judge-testable branch build (requires explicit deployment approval; T-36h to T-28h)

- Create a new Railway preview/staging service from `codex/create-xprize-submission`, or update the existing staging deployment after explicit approval. Do not change `vibetail.com` DNS.
- Configure Vertex/Gemini server secrets and set `MODEL_PROVIDER=vertex`.
- Ensure the deployment contains current `/v1/venues` source rather than the older `/v1/restaurants` revision.
- Keep the guest experience available without login. If venue management is included in judging, provide an isolated test account or deterministic demo credentials and explicit reset behavior.
- Verify and record:
  - `/health` and `/ready` return 200;
  - landing, venue directory, global match, and venue-specific match render on mobile and desktop;
  - at least three live production matches invoke Gemini;
  - returned IDs remain current/active and canonical facts still come from the repository;
  - logs contain provider/model/trace/latency/usage without secrets;
  - unknown routes and provider failures are understandable;
  - the public URL remains free and unrestricted through September 15 judging.
- Capture the deployed commit SHA and verification timestamp in an evidence manifest.

**Exit gate:** a public URL on the submission commit completes a real Gemini decision, and the matching trace can be correlated with Google Cloud usage.

### Phase 3 — Gather truthful business and product evidence in parallel (owner: entrant/operations; T-48h to T-12h)

Create a private evidence folder outside the public repository for sensitive raw documents. Commit only redacted indices/templates.

- Revenue ledger: transaction date, customer, service, amount, currency, payment proof, arms-length/related-party classification.
- Monthly table for May, June, July, and August 2026; total earned revenue; simple P&L.
- Expense ledger including hosting, AI/API use, contractor/labor, and all marketing/customer-acquisition spend. Explicitly enter zero where applicable.
- User evidence: unique user count, high-level user types, testing dates, and consented testimonials/feedback.
- Google Cloud evidence:
  - available May–July invoice/statement PDFs or zero-use records;
  - August-to-date Cost Table/usage export or screenshot because the current month's PDF may not yet exist;
  - Vertex/Gemini model observability/usage dashboard screenshots;
  - sanitized matching decision logs with correlated trace IDs.
- Corporate ID if entering as an organization.
- A disclosure of pre-existing generic code/templates and a clear explanation of what new business/product work was created during the submission period.

**Exit gate:** every numerical claim in the narrative has a source document and no customer information is shared without consent.

### Phase 4 — Build the submission package (T-28h to T-6h)

Add the following English documents under `docs/demo/xprize/`:

- `requirements-checklist.md` — owner and completion status for every Devpost field;
- `testing-instructions.md` — public URL, exact click path, expected result, fallback, browser/device, and support contact;
- `evidence-index.md` — redacted list of revenue, user, GCP, Gemini, and execution evidence;
- `pre-existing-work-disclosure.md` — factual old/new boundary and dates;
- `narrative.md` — 500–1000 words;
- `video-script.md` — timed script under three minutes;
- `release-checklist.md` — commit SHA, URL, CI result, and live smoke results.

Narrative structure:

1. real small-venue problem and paying customer;
2. how Gemini changes the guest and venue workflow;
3. the exact key decision Gemini makes and the deterministic safety boundary;
4. what humans approve/own versus what AI performs;
5. user/revenue evidence and sustainable business model;
6. jobs/economic opportunity enabled beyond the founding team;
7. what was newly built during the hackathon and what pre-existing generic material was reused.

Video structure (target 2:40–2:50):

- `0:00–0:20` — customer, problem, category, and one-sentence value;
- `0:20–1:10` — live guest mood-to-real-menu flow;
- `1:10–1:45` — venue-side workflow and how available menu items constrain the agent;
- `1:45–2:15` — Gemini/Vertex trace, model dashboard/API usage, and safety revalidation;
- `2:15–2:40` — real customer/user/revenue proof and business viability;
- `2:40–2:50` — impact and URL.

Use only assets the team owns or is authorized to show. Upload publicly to YouTube, Vimeo, or Youku and test the link while signed out.

Repository access:

- If private, invite/share with both required judge addresses and verify access.
- If public, add the intended license and verify that no secret, private customer data, raw financial document, or private venue token is in history.
- Ensure setup instructions and all necessary source are present.

**Exit gate:** another person can evaluate the entry using only the submission form, public video, repo, and testing instructions.

### Phase 5 — Final submission (T-6h to T-3h)

- Run `pnpm run ci` on the exact submission commit.
- Re-run signed-out public smoke tests and one live Gemini match.
- Verify repository judge access and video public visibility.
- Cross-check every Devpost field against `requirements-checklist.md`.
- Submit by **10:00 AM PDT on August 17**, preserving a three-hour buffer.
- Save a PDF/screenshot of the final submission and confirmation page.
- Do not change the submitted material after the deadline; keep the public product available through judging.

## Explicitly out of minimum scope

Defer these until after a valid XPRIZE entry is locked:

- Alibaba AgentRun/FC Sandbox integration;
- E2B parity;
- durable approval/hibernate/wake/resume workflow;
- a new visual redesign;
- PostHog product analytics unless it is needed for already-collected user evidence;
- production database migration;
- `vibetail.com` DNS changes;
- comprehensive RBAC/billing/team administration;
- image generation.

These items may improve the long-term product or another hackathon demo, but none substitutes for Gemini, Google Cloud, real customer/revenue proof, a current public build, and complete submission evidence.

## Decision log and risks

| Risk | Mitigation |
| --- | --- |
| The business predates May 19 | Treat as a go/no-go eligibility issue; document facts and seek Devpost clarification rather than asserting that a new repo makes it new. |
| No arms-length revenue/customer | Prioritize a genuine small paid pilot and truthful evidence; do not manufacture transactions. |
| Vertex credentials/deployment fail | Use the supported Vertex AI mode with the smallest authentication surface; keep deterministic provider only for local tests, not as claimed production Gemini evidence. |
| Existing Railway URL is stale | Deploy a separate branch preview and record commit SHA/API smoke results. |
| Current-month GCP invoice unavailable | Provide available earlier statements plus August-to-date cost/usage exports/screenshots and a plain explanation. |
| Two-day schedule slips | Drop FC/E2B, agent UI, redesign, PostHog, and nonessential admin work before cutting any official submission gate. |
| Privacy/IP leak in evidence | Keep raw evidence outside the repo; redact public artifacts and obtain customer consent. |

## Definition of minimally submission-ready

All boxes must be true:

- [ ] Entrant/team and new-business eligibility are documented.
- [ ] Category is `Small Business Services`.
- [ ] Current source is deployed at a free public URL.
- [ ] A live production user action calls Gemini through Vertex AI/Google Cloud.
- [ ] The result is demonstrably revalidated against active real menu items.
- [ ] Safe logs and Google Cloud/Gemini usage evidence exist.
- [ ] At least one real customer/user story and truthful revenue/expense records exist.
- [ ] May–August revenue, related-party revenue, total expenses, and marketing spend are reported.
- [ ] Repo access, ownership/licensing, setup, and test instructions are complete.
- [ ] English 500–1000 word narrative is complete.
- [ ] Public functioning-product video is under three minutes.
- [ ] Exact submission commit passes CI and live smoke tests.
- [ ] Devpost submission is confirmed before the deadline.
