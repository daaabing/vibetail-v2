# Provider boundaries

## Rule

Venue, Agent, and UI code depend on capabilities and typed results, never a vendor SDK or endpoint. Provider selection occurs only in the web/worker composition roots after validated environment loading.

## SandboxProvider

`packages/sandbox-runtime` defines:

- `create`
- `execute`
- `writeFiles` / `readFiles`
- `checkpoint` / `restore`
- `hibernate` / `resume`
- `getStatus` / `getLogs`
- `terminate`

Each provider reports hibernation, persistent filesystem, compute/network/storage isolation, and checkpoint/restore capabilities. Callers branch on declared capability rather than provider name.

| Adapter | Phase 1 state | Required evidence later |
| --- | --- | --- |
| Local deterministic | Interface only | Real local command/file/checkpoint lifecycle and provider contract tests in Phase 3 |
| Alibaba FC | Typed config/scaffold only; no SDK installed | AgentRun + FC execution, measured hibernate/wake/resume, state consistency, isolation, elasticity, SLS/trace/metrics/alerting in Phase 4 |
| E2B-compatible | Typed config/scaffold only; no SDK installed | Same fixture/workflow and identical semantic results, or documented capability delta, in Phase 5 |

Provider adapters translate vendor errors into stable categories, preserve `traceId`, report actual duration/metadata, and never expose credentials in logs or results. Hibernation must be a provider lifecycle action; UI polling is only a display mechanism.

## Durable workflow relationship

Before hibernation, the worker commits step/event/checkpoint state to the durable store. An external approval event records an idempotency key and version, then schedules an explicit wake/resume. If a session is lost, the worker restores the last safe checkpoint in a new sandbox and must not repeat completed side effects.

Native hibernation path:

```text
execute → checkpoint → waiting_for_approval → hibernate
  → approval event → wake/resume → verify checkpoint → continue
```

Fallback path for a provider without hibernation:

```text
execute → checkpoint → terminate
  → approval event → create → restore → continue
```

## ModelProvider

The venue model port accepts bounded `VenuePreferences`, canonical candidate metadata, locale, timeout, and trace ID. It returns:

```json
{
  "selection": {
    "matchedItemId": "uuid",
    "whyThisMatch": "string"
  },
  "metadata": {
    "provider": "string",
    "model": "string",
    "attempt": 1,
    "durationMs": 0
  }
}
```

The venue service, not the provider, validates allowlist membership, merchant/menu ownership, active/visible status, and canonical facts. Invalid structured output fails closed. Provider adapters own timeout/retry mechanics and safe error mapping; retry must remain bounded and observable.

The preferred remote path is OpenRouter Chat Completions with strict Structured Outputs. It uses OpenRouter's OpenAI-compatible endpoint while keeping `openrouter` as a distinct adapter and provider identity. The request requires a route that supports every requested parameter and denies providers that may use prompts for training. A direct OpenAI Responses API adapter remains available. Vertex AI, direct Gemini, and Alibaba remain future adapters behind the same interface. `deterministic` is the credential-free test/demo fallback. Image generation is intentionally absent; a future `ImageProvider` would be a separate product decision and interface.

## Configuration and secret boundary

| Selection | Variables required when selected | Exposure |
| --- | --- | --- |
| Supabase venue data (always required) | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server only |
| privileged Supabase operations | `SUPABASE_SERVICE_ROLE_KEY` | server/worker only; never browser/sandbox by default |
| `MODEL_PROVIDER=openrouter` | `OPENROUTER_API_KEY`, `MODEL_NAME` | server/worker only |
| `MODEL_PROVIDER=openai` | `MODEL_API_KEY`, `MODEL_NAME` | server/worker only |
| `SANDBOX_PROVIDER=fc` | `FC_SANDBOX_ENDPOINT`, `FC_SANDBOX_API_KEY` | worker/server only |
| `SANDBOX_PROVIDER=e2b` | `E2B_ENDPOINT`, `E2B_API_KEY` | worker/server only |
| `deterministic` / `local` | none | local and CI safe defaults |

Sandbox task environments use an explicit per-task allowlist and scoped credentials. Production Supabase service role, deployment/DNS credentials, GitHub write tokens, and unrelated model/provider keys are not injected.

## Observability boundary

Every call propagates one trace ID across API, durable run, worker, sandbox session, provider call, events, artifacts, and errors. Structured metadata may include provider/model IDs, operation, attempt, duration, status, and sanitized error code. It must exclude authorization headers, API keys, service-role keys, sandbox credentials, full prompts, and private raw input.

PostHog remains product analytics and is configured separately. It is never used as the Agent run state store or system observability backend.

## Dependency enforcement

- Only `packages/provider-fc` may add FC-specific SDK imports.
- Only `packages/provider-e2b` may add E2B-specific SDK imports.
- Provider-specific model SDKs remain inside model adapter modules.
- CI scans runtime source and manifests for forbidden Lovable packages, gateway host, and key name.
- The OpenRouter and direct OpenAI adapters have mocked structured-output contract tests; live calls require an explicitly configured staging API key and remain a separate deployment verification step.
