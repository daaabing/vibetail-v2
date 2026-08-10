import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./env.js";
import { readinessResponse } from "./health.js";

const localEnv = {
  APP_URL: "http://127.0.0.1:3000",
  RESTAURANT_REPOSITORY: "fixture",
  MODEL_PROVIDER: "deterministic",
  SANDBOX_PROVIDER: "local",
};

describe("web environment", () => {
  it("accepts credential-free deterministic local mode", () => {
    const parsed = parseWebEnv(localEnv);
    expect(parsed.serverEnv.RESTAURANT_REPOSITORY).toBe("fixture");
    expect(parsed.serverEnv.MODEL_PROVIDER).toBe("deterministic");
  });

  it("fails clearly when a selected provider lacks credentials", () => {
    expect(() => parseWebEnv({ ...localEnv, SANDBOX_PROVIDER: "fc" })).toThrow(
      /FC_SANDBOX_ENDPOINT/,
    );
    expect(() => parseWebEnv({ ...localEnv, RESTAURANT_REPOSITORY: "supabase" })).toThrow(
      /SUPABASE_URL/,
    );
  });

  it("does not expose server secrets through public config", () => {
    const parsed = parseWebEnv({ ...localEnv, SUPABASE_SERVICE_ROLE_KEY: "server-secret" });
    expect("SUPABASE_SERVICE_ROLE_KEY" in parsed.publicEnv).toBe(false);
  });
});

describe("readiness response", () => {
  it("returns 503 when any required dependency is unavailable", () => {
    const response = readinessResponse([{ name: "fixture", ready: true }, { name: "worker", ready: false }]);
    expect(response.status).toBe(503);
  });
});
