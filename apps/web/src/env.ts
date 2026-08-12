import { z } from "zod";

const optionalString = (schema: z.ZodString = z.string().min(1)) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

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
    RESTAURANT_REPOSITORY: z.enum(["fixture", "supabase"]).default("fixture"),
    MODEL_PROVIDER: z.enum([
      "deterministic",
      "vertex",
      "gemini",
      "openai",
      "openrouter",
      "alibaba",
    ]).default("deterministic"),
    SANDBOX_PROVIDER: z.enum(["local", "fc", "e2b"]).default("local"),
    SUPABASE_URL: optionalString(z.string().url()),
    SUPABASE_PUBLISHABLE_KEY: optionalString(),
    SUPABASE_SERVICE_ROLE_KEY: optionalString(),
    MODEL_API_KEY: optionalString(),
    OPENROUTER_API_KEY: optionalString(),
    MODEL_NAME: optionalString(),
    FC_SANDBOX_ENDPOINT: optionalString(z.string().url()),
    FC_SANDBOX_API_KEY: optionalString(),
    E2B_ENDPOINT: optionalString(z.string().url()),
    E2B_API_KEY: optionalString(),
  })
  .superRefine((env, context) => {
    if (env.RESTAURANT_REPOSITORY === "supabase") {
      requireFields(env, ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"], context);
    }
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
  });

export type WebPublicEnv = z.infer<typeof publicEnvSchema>;
export type WebServerEnv = z.infer<typeof serverEnvSchema>;

export function parseWebEnv(source: NodeJS.ProcessEnv): {
  publicEnv: WebPublicEnv;
  serverEnv: WebServerEnv;
} {
  const nodeEnv = source.NODE_ENV ?? "development";
  const inferredRestaurantRepository =
    source.RESTAURANT_REPOSITORY ??
    (source.SUPABASE_URL && source.SUPABASE_PUBLISHABLE_KEY ? "supabase" : undefined);
  return {
    publicEnv: publicEnvSchema.parse(source),
    serverEnv: serverEnvSchema.parse({
      ...source,
      HOST: source.HOST ?? (nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1"),
      RESTAURANT_REPOSITORY: inferredRestaurantRepository,
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
