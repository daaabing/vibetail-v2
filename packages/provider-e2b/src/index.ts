import type { SandboxProvider } from "@vibetail/sandbox-runtime";

export const E2B_SANDBOX_PROVIDER_ID = "e2b" as const;

export interface E2bSandboxConfig {
  endpoint: string;
  apiKey: string;
}

export type E2bSandboxAdapter = SandboxProvider & { readonly id: typeof E2B_SANDBOX_PROVIDER_ID };

// Parity implementation and shared provider contract tests belong to Phase 5.
