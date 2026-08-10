# Vibetail Repository Rules

- Read `docs/CODEX_MASTER_PLAN.md` before architecture or implementation work.
- The old Vibetail repo is read-only reference.
- Do not add Lovable packages, gateways, secrets, or runtime dependencies.
- Temporary legacy restaurant UI must remain isolated and replaceable.
- UI must access restaurant functionality through shared contracts and APIs.
- Business logic must not depend directly on sandbox or model providers.
- Do not apply production database migrations without explicit approval.
- Do not deploy to production or modify DNS without explicit approval.
- Run lint, typecheck, tests, and build before declaring a phase complete.