import { describe, expect, it } from "vitest";
import { parseAgentWorkerEnv } from "./env.js";

describe("agent worker environment", () => {
  it("defaults to the local sandbox", () => {
    expect(parseAgentWorkerEnv({}).SANDBOX_PROVIDER).toBe("local");
  });

  it("requires endpoint and key together for FC", () => {
    expect(() => parseAgentWorkerEnv({ SANDBOX_PROVIDER: "fc" })).toThrow(
      /FC_SANDBOX_ENDPOINT/,
    );
  });
});
