# XPRIZE Tasting Agent release checklist

## Code

- [ ] Vertex provider implementation reviewed.
- [ ] Strict JSON and Zod validation enabled.
- [ ] Active allowlist and live-item revalidation regression tests pass.
- [ ] Provider errors are sanitized and retryable.
- [ ] No silent non-Gemini production fallback.
- [ ] Vertex key name and real value are absent from the client build.
- [ ] `pnpm run ci` passes on the exact submission commit.

## Google Cloud

- [ ] Dedicated project and billing confirmed.
- [ ] Vertex Express Mode key created and restricted.
- [ ] Credentialed canary succeeds.
- [ ] Usage/observability dashboard is accessible.
- [ ] Billing/cost artifacts are captured privately.

## Railway

- [ ] Separate XPRIZE preview target approved.
- [ ] Exact source branch/commit selected.
- [ ] `VERTEX_API_KEY` entered directly and sealed.
- [ ] `/health` and `/ready` return 200.
- [ ] Current `/v1/venues` routes exist.
- [ ] Signed-out desktop and mobile smoke tests pass.
- [ ] Three live Gemini traces correlate with safe logs and Vertex usage.
- [ ] Previous healthy deployment/rollback path recorded.

## Submission

- [ ] Testing instructions contain the actual URL and expected results.
- [ ] Evidence index points to all private/redacted artifacts.
- [ ] Narrative and pre-existing-work disclosure are complete.
- [ ] Public video is under three minutes and works while signed out.
- [ ] Repository judge access is verified.
- [ ] Devpost entry is submitted before the deadline buffer.
