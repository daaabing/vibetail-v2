import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./env.js";
import { readinessResponse } from "./health.js";

const localEnv = {
  APP_URL: "http://127.0.0.1:3000",
  VENUE_REPOSITORY: "fixture",
  MODEL_PROVIDER: "deterministic",
  SANDBOX_PROVIDER: "local",
};

describe("web environment", () => {
  it("accepts credential-free deterministic local mode", () => {
    const parsed = parseWebEnv(localEnv);
    expect(parsed.serverEnv.VENUE_REPOSITORY).toBe("fixture");
    expect(parsed.serverEnv.MODEL_PROVIDER).toBe("deterministic");
    expect(parsed.serverEnv.HOST).toBe("127.0.0.1");
  });

  it("binds production to all container interfaces by default", () => {
    expect(parseWebEnv({ ...localEnv, NODE_ENV: "production" }).serverEnv.HOST).toBe("0.0.0.0");
    expect(parseWebEnv({ ...localEnv, NODE_ENV: "production", HOST: "127.0.0.1" }).serverEnv.HOST)
      .toBe("127.0.0.1");
  });

  it("fails clearly when a selected provider lacks credentials", () => {
    expect(() => parseWebEnv({ ...localEnv, SANDBOX_PROVIDER: "fc" })).toThrow(
      /FC_SANDBOX_ENDPOINT/,
    );
    expect(() => parseWebEnv({ ...localEnv, VENUE_REPOSITORY: "supabase" })).toThrow(
      /SUPABASE_URL/,
    );
    expect(() => parseWebEnv({ ...localEnv, MODEL_PROVIDER: "openrouter" })).toThrow(
      /OPENROUTER_API_KEY/,
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

  it("honors the deprecated RESTAURANT_REPOSITORY alias when VENUE_REPOSITORY is unset", () => {
    const parsed = parseWebEnv({
      APP_URL: localEnv.APP_URL,
      MODEL_PROVIDER: localEnv.MODEL_PROVIDER,
      SANDBOX_PROVIDER: localEnv.SANDBOX_PROVIDER,
      RESTAURANT_REPOSITORY: "fixture",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
    expect(parsed.serverEnv.VENUE_REPOSITORY).toBe("fixture");
  });

  it("selects Supabase automatically when the existing public credentials are present", () => {
    const parsed = parseWebEnv({
      APP_URL: localEnv.APP_URL,
      MODEL_PROVIDER: localEnv.MODEL_PROVIDER,
      SANDBOX_PROVIDER: localEnv.SANDBOX_PROVIDER,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
    expect(parsed.serverEnv.VENUE_REPOSITORY).toBe("supabase");
    expect(parsed.serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
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
    const response = readinessResponse([{ name: "fixture", ready: true }, { name: "worker", ready: false }]);
    expect(response.status).toBe(503);
  });
});
