import { describe, expect, it } from "vitest";
import { parseWebEnv } from "../env.js";
import { createWebDependencies } from "./dependencies.js";

describe("web dependency composition", () => {
  it("selects the Vertex Gemini provider without making a startup network request", () => {
    const { serverEnv } = parseWebEnv({
      NODE_ENV: "test",
      APP_URL: "http://127.0.0.1:3000",
      VENUE_REPOSITORY: "fixture",
      MODEL_PROVIDER: "vertex",
      MODEL_NAME: "gemini-2.5-flash",
      VERTEX_API_KEY: "test-vertex-key",
      GOOGLE_CLOUD_PROJECT: "vibetail-xprize",
      GOOGLE_CLOUD_LOCATION: "global",
      SANDBOX_PROVIDER: "local",
    });

    const dependencies = createWebDependencies(serverEnv);
    const venueService = dependencies.venueService as unknown as {
      modelProvider: { id: string };
    };
    expect(venueService.modelProvider.id).toBe("vertex");
  });
});
