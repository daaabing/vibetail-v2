import { z } from "zod";

const optionalString = (schema: z.ZodString = z.string().min(1)) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

// Supabase is the only data path, so its connection settings are always
// required. For local development: run `pnpm db:start`, then copy the values
// from `pnpm db:status` into the repo root .env.
const supabaseSetupHint = (name: string) =>
  `${name} is required. Local development: run \`pnpm db:start\`, then copy the values from \`pnpm db:status\` into .env.`;

const publicEnvSchema = z.object({
  APP_URL: z.string().url().default("http://127.0.0.1:3000"),
  POSTHOG_KEY: optionalString(),
  POSTHOG_HOST: optionalString(z.string().url()),
});

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.string().url().default("http://127.0.0.1:3000"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    HOST: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    MODEL_PROVIDER: z.enum([
      "deterministic",
      "vertex",
      "gemini",
      "openai",
      "openrouter",
      "alibaba",
    ]).default("deterministic"),
    SANDBOX_PROVIDER: z.enum(["local", "fc", "e2b"]).default("local"),
    // `none` keeps the passwordless account-name login used by seeded local
    // runs; `supabase` switches every surface to Supabase Auth (Google) tokens.
    AUTH_PROVIDER: z.enum(["none", "supabase"]).default("none"),
    // Opt-in: Google needs an OAuth client registered in Google Cloud and the
    // Supabase dashboard. Email/password needs neither, so it is always on.
    AUTH_GOOGLE_ENABLED: z
      .preprocess((value) => (value === "" ? undefined : value), z.enum(["true", "false"]).default("false"))
      .transform((value) => value === "true"),
    SUPABASE_URL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string({ error: supabaseSetupHint("SUPABASE_URL") }).url(),
    ),
    SUPABASE_PUBLISHABLE_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string({ error: supabaseSetupHint("SUPABASE_PUBLISHABLE_KEY") }).min(1),
    ),
    SUPABASE_SERVICE_ROLE_KEY: optionalString(),
    MODEL_API_KEY: optionalString(),
    OPENROUTER_API_KEY: optionalString(),
    MODEL_NAME: optionalString(),
    IMAGE_CUTOUT_PROVIDER: z.enum(["original", "alibaba", "sam2"]).default("original"),
    IMAGE_CUTOUT_MODEL: optionalString(),
    DASHSCOPE_API_KEY: optionalString(),
    DASHSCOPE_IMAGE_ENDPOINT: optionalString(z.string().url()),
    SAM2_CUTOUT_URL: optionalString(z.string().url()),
    FC_SANDBOX_ENDPOINT: optionalString(z.string().url()),
    FC_SANDBOX_API_KEY: optionalString(),
    E2B_ENDPOINT: optionalString(z.string().url()),
    E2B_API_KEY: optionalString(),
  })
  .superRefine((env, context) => {
    if (env.MODEL_PROVIDER === "openrouter") {
      requireFields(env, ["OPENROUTER_API_KEY", "MODEL_NAME"], context);
    } else if (env.MODEL_PROVIDER !== "deterministic") {
      requireFields(env, ["MODEL_API_KEY", "MODEL_NAME"], context);
    }
    if (env.SANDBOX_PROVIDER === "fc") {
      requireFields(env, ["FC_SANDBOX_ENDPOINT", "FC_SANDBOX_API_KEY"], context);
    }
    if (env.SANDBOX_PROVIDER === "e2b") {
      requireFields(env, ["E2B_ENDPOINT", "E2B_API_KEY"], context);
    }
    if (env.IMAGE_CUTOUT_PROVIDER === "alibaba") {
      requireFields(env, ["DASHSCOPE_API_KEY"], context);
    }
    if (env.IMAGE_CUTOUT_PROVIDER === "sam2") {
      requireFields(env, ["SAM2_CUTOUT_URL"], context);
    }
  });

export type WebPublicEnv = z.infer<typeof publicEnvSchema>;
export type WebServerEnv = z.infer<typeof serverEnvSchema>;

export function parseWebEnv(source: NodeJS.ProcessEnv): {
  publicEnv: WebPublicEnv;
  serverEnv: WebServerEnv;
} {
  const nodeEnv = source.NODE_ENV ?? "development";
  return {
    publicEnv: publicEnvSchema.parse(source),
    serverEnv: serverEnvSchema.parse({
      ...source,
      HOST: source.HOST ?? (nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1"),
    }),
  };
}

function requireFields(
  env: Record<string, unknown>,
  fields: readonly string[],
  context: z.RefinementCtx,
): void {
  for (const field of fields) {
    if (!env[field]) {
      context.addIssue({
        code: "custom",
        message: `${field} is required for the selected provider`,
        path: [field],
      });
    }
  }
}
