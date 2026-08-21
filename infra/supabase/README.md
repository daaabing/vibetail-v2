# Database schema (local Supabase stack)

The local Supabase stack is the only database — there is no remote, staging,
or production project. Schema-as-code:

- `migrations/0000_schema.sql` — the complete schema (tables, enums, RLS,
  triggers, storage bucket). To change the schema, edit it in place.
- `seed.sql` — generated from `fixtures/venue/menus.json` by
  `scripts/generate-seed.mjs`; never edit it by hand, edit the JSON. Every
  consumer regenerates it first, so its contents are always derivable.

`pnpm db:reset` (and the vitest globalSetup) regenerates the seed, replays the
schema onto an empty database, and loads the seed. That is the entire
"migration" story: reset is apply.

After a schema change, regenerate the type snapshot so
`packages/venue-core/src/repositories/database.types.ts` stays in sync:

```bash
supabase --workdir infra gen types typescript --local > packages/venue-core/src/repositories/database.types.ts
```

If a persistent deployment ever exists, freeze `0000_schema.sql` as the
baseline and switch to append-only incremental migrations from that point on.

Gotchas when editing the schema (details in the file's comments and
`.claude/skills/local-supabase/SKILL.md`):

- New tables need no extra grants (the `alter default privileges` block at the
  top covers them) but do need RLS enabled plus a SELECT policy if the anon
  key should read them.
- Migration filenames must use purely numeric prefixes — the CLI silently
  skips names like `0001a_*`.
