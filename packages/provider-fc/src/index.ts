import type { SandboxProvider } from "@vibetail/sandbox-runtime";

export const FC_SANDBOX_PROVIDER_ID = "fc" as const;

export interface FcSandboxConfig {
  endpoint: string;
  apiKey: string;
}

export type FcSandboxAdapter = SandboxProvider & { readonly id: typeof FC_SANDBOX_PROVIDER_ID };

// Live AgentRun/FC SDK wiring, hibernation, wake, and contract tests belong to
// Phase 4. No vendor SDK is installed or claimed as integrated in Phase 1.
