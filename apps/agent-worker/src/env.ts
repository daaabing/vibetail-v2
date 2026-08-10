import { z } from "zod";

const optionalString = (schema: z.ZodString = z.string().min(1)) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const workerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    SANDBOX_PROVIDER: z.enum(["local", "fc", "e2b"]).default("local"),
    SUPABASE_URL: optionalString(z.string().url()),
    SUPABASE_SERVICE_ROLE_KEY: optionalString(),
    FC_SANDBOX_ENDPOINT: optionalString(z.string().url()),
    FC_SANDBOX_API_KEY: optionalString(),
    E2B_ENDPOINT: optionalString(z.string().url()),
    E2B_API_KEY: optionalString(),
  })
  .superRefine((env, context) => {
    if (env.SANDBOX_PROVIDER === "fc") {
      requireFields(env, ["FC_SANDBOX_ENDPOINT", "FC_SANDBOX_API_KEY"], context);
    }
    if (env.SANDBOX_PROVIDER === "e2b") {
      requireFields(env, ["E2B_ENDPOINT", "E2B_API_KEY"], context);
    }
  });

export type AgentWorkerEnv = z.infer<typeof workerEnvSchema>;

export function parseAgentWorkerEnv(source: NodeJS.ProcessEnv): AgentWorkerEnv {
  return workerEnvSchema.parse(source);
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
        message: `${field} is required for the selected sandbox provider`,
        path: [field],
      });
    }
  }
}
