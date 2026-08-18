/**
 * Shared vitest globalSetup for BOTH vitest configs (unit and integration).
 *
 * Responsibilities, in order:
 *   1. Regenerate infra/supabase/seed.sql from fixtures (scripts/generate-seed.mjs).
 *   2. `supabase --workdir infra db reset` — recreate schema from migrations + seed.
 *   3. Read `supabase --workdir infra status` and inject the local stack's URL and
 *      keys into process.env (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY /
 *      SUPABASE_SERVICE_ROLE_KEY) for the test workers.
 *
 * HARD GATE — explicit user decision: if the Supabase CLI is missing or Docker is
 * not running, this file MUST throw with install guidance. Never add a skip,
 * fallback, or environment-variable escape hatch here.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runCapture(command: string, args: readonly string[], failureHint: string): string {
  try {
    return execFileSync(command, [...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(`${failureHint}\n(failed command: ${command} ${args.join(" ")})`, {
      cause: error,
    });
  }
}

function runInherit(command: string, args: readonly string[], failureHint: string): void {
  try {
    execFileSync(command, [...args], { cwd: repoRoot, stdio: "inherit" });
  } catch (error) {
    throw new Error(`${failureHint}\n(failed command: ${command} ${args.join(" ")})`, {
      cause: error,
    });
  }
}

function assertPrerequisites(): void {
  runCapture(
    "which",
    ["supabase"],
    [
      "Supabase CLI not found. All tests (including unit tests) require the local Supabase stack.",
      "Install it with:",
      "  brew install supabase/tap/supabase",
    ].join("\n"),
  );
  runCapture(
    "docker",
    ["info"],
    [
      "Docker is not running (or the docker CLI is missing). The local Supabase stack runs in Docker.",
      "启动 Docker Desktop（start Docker Desktop）and retry.",
    ].join("\n"),
  );
}

/** Match status keys defensively: CLI versions differ in casing/underscores. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickValue(
  status: Record<string, unknown>,
  candidates: readonly string[],
): string | undefined {
  const byNormalizedKey = new Map<string, unknown>();
  for (const [key, value] of Object.entries(status)) {
    byNormalizedKey.set(normalizeKey(key), value);
  }
  for (const candidate of candidates) {
    const value = byNormalizedKey.get(normalizeKey(candidate));
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function readStackEnv(): { url: string; publishableKey: string; serviceRoleKey: string } {
  const raw = runCapture(
    "supabase",
    ["--workdir", "infra", "status", "--output", "json"],
    "Failed to read local Supabase stack status. Is the stack healthy? Try `pnpm db:start`.",
  );
  // Some CLI versions print human-readable lines around the JSON payload.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`Could not locate JSON in \`supabase status --output json\` output:\n${raw}`);
  }
  const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Unexpected \`supabase status --output json\` payload:\n${raw}`);
  }
  const status = parsed as Record<string, unknown>;

  const url = pickValue(status, ["API_URL", "apiUrl", "SUPABASE_URL"]);
  const publishableKey = pickValue(status, [
    "ANON_KEY",
    "anonKey",
    "PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]);
  const serviceRoleKey = pickValue(status, [
    "SERVICE_ROLE_KEY",
    "serviceRoleKey",
    "SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ]);

  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error(
      [
        "Could not extract API URL / anon key / service_role key from `supabase status --output json`.",
        `Keys present: ${Object.keys(status).join(", ")}`,
        "The CLI likely renamed these fields; update the candidate lists in test/global-db-setup.ts.",
      ].join("\n"),
    );
  }
  return { url, publishableKey, serviceRoleKey };
}

/**
 * `db reset` finishes with "Restarting containers...", and PostgREST can accept
 * requests for a short window before its database pool/schema cache is ready,
 * answering `Database client error. Retrying the connection.` Tests that start
 * immediately after the reset hit this nondeterministically, so gate on a real
 * REST query succeeding before handing control to the workers.
 */
async function awaitRestReady(url: string, serviceRoleKey: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastFailure = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/rest/v1/merchants?select=id&limit=1`, {
        headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      });
      if (response.ok) return;
      lastFailure = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Local Supabase REST API did not become ready within 30s after db reset.\nLast failure: ${lastFailure}`,
  );
}

export default async function globalDbSetup(): Promise<void> {
  assertPrerequisites();

  runInherit(
    "node",
    ["scripts/generate-seed.mjs"],
    "Failed to generate infra/supabase/seed.sql from fixtures.",
  );

  runInherit(
    "supabase",
    ["--workdir", "infra", "db", "reset"],
    [
      "`supabase db reset` failed. Ensure Docker Desktop is running and the local stack can start",
      "(`pnpm db:start`), then re-run the tests.",
    ].join("\n"),
  );

  const { url, publishableKey, serviceRoleKey } = readStackEnv();
  await awaitRestReady(url, serviceRoleKey);
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_PUBLISHABLE_KEY = publishableKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
}
