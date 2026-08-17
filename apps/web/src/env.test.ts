import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./env.js";
import { readinessResponse } from "./health.js";

const localEnv = {
  APP_URL: "http://127.0.0.1:3000",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  MODEL_PROVIDER: "deterministic",
  SANDBOX_PROVIDER: "local",
};

describe("web environment", () => {
  it("accepts the local Supabase development configuration", () => {
    const parsed = parseWebEnv(localEnv);
    expect(parsed.serverEnv.SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(parsed.serverEnv.SUPABASE_PUBLISHABLE_KEY).toBe("publishable-key");
    expect(parsed.serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(parsed.serverEnv.MODEL_PROVIDER).toBe("deterministic");
    expect(parsed.serverEnv.HOST).toBe("127.0.0.1");
  });

  it("binds production to all container interfaces by default", () => {
    expect(parseWebEnv({ ...localEnv, NODE_ENV: "production" }).serverEnv.HOST).toBe("0.0.0.0");
    expect(parseWebEnv({ ...localEnv, NODE_ENV: "production", HOST: "127.0.0.1" }).serverEnv.HOST)
      .toBe("127.0.0.1");
  });

  it("always requires the Supabase connection settings, with setup guidance", () => {
    expect(() => parseWebEnv({ ...localEnv, SUPABASE_URL: undefined })).toThrow(
      /SUPABASE_URL is required.*pnpm db:start/,
    );
    expect(() => parseWebEnv({ ...localEnv, SUPABASE_URL: "" })).toThrow(
      /SUPABASE_URL is required.*pnpm db:start/,
    );
    expect(() => parseWebEnv({ ...localEnv, SUPABASE_PUBLISHABLE_KEY: undefined })).toThrow(
      /SUPABASE_PUBLISHABLE_KEY is required.*pnpm db:start/,
    );
    expect(() => parseWebEnv({ ...localEnv, SUPABASE_URL: "not-a-url" })).toThrow();
  });

  it("fails clearly when a selected provider lacks credentials", () => {
    expect(() => parseWebEnv({ ...localEnv, SANDBOX_PROVIDER: "fc" })).toThrow(
      /FC_SANDBOX_ENDPOINT/,
    );
    expect(() => parseWebEnv({ ...localEnv, MODEL_PROVIDER: "openrouter" })).toThrow(
      /OPENROUTER_API_KEY/,
    );
    expect(() => parseWebEnv({ ...localEnv, IMAGE_CUTOUT_PROVIDER: "alibaba" })).toThrow(
      /DASHSCOPE_API_KEY/,
    );
    expect(() => parseWebEnv({ ...localEnv, IMAGE_CUTOUT_PROVIDER: "sam2" })).toThrow(
      /SAM2_CUTOUT_URL/,
    );
  });

  it("accepts OpenRouter with a server-only key and explicit model", () => {
    const parsed = parseWebEnv({
      ...localEnv,
      MODEL_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "server-secret",
      MODEL_NAME: "openai/gpt-5-mini",
    });
    expect(parsed.serverEnv.MODEL_PROVIDER).toBe("openrouter");
    expect(parsed.serverEnv.MODEL_NAME).toBe("openai/gpt-5-mini");
    expect("OPENROUTER_API_KEY" in parsed.publicEnv).toBe(false);
  });

  it("does not expose server secrets through public config", () => {
    const parsed = parseWebEnv({
      ...localEnv,
      SUPABASE_SERVICE_ROLE_KEY: "server-secret",
      OPENROUTER_API_KEY: "openrouter-secret",
    });
    expect("SUPABASE_SERVICE_ROLE_KEY" in parsed.publicEnv).toBe(false);
    expect("OPENROUTER_API_KEY" in parsed.publicEnv).toBe(false);
  });
});

describe("readiness response", () => {
  it("returns 503 when any required dependency is unavailable", () => {
    const response = readinessResponse([{ name: "database", ready: true }, { name: "worker", ready: false }]);
    expect(response.status).toBe(503);
  });
});
