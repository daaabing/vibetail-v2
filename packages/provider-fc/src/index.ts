import type { SandboxProvider } from "@vibetail/sandbox-runtime";
import { FC_SANDBOX_PROVIDER_ID } from "./provider-id.js";

export { FC_SANDBOX_PROVIDER_ID };

export interface FcSandboxConfig {
  endpoint: string;
  apiKey: string;
}

export type FcSandboxAdapter = SandboxProvider & { readonly id: typeof FC_SANDBOX_PROVIDER_ID };

// AgentRun-backed implementation of the sandbox port. Not wired into any
// runtime path yet: nothing constructs it, and `SANDBOX_PROVIDER=fc` is still
// unhandled. Hibernation and checkpoint/restore remain unimplemented because
// the vendor SDK exposes no such primitive — see `agentrun-sandbox.ts`.
export * from "./agentrun-port.js";
export {
  AgentRunSandboxProvider,
  UnsupportedAgentRunOperationError,
  toCommandLine,
  toSandboxStatus,
  type AgentRunSandboxProviderOptions,
} from "./agentrun-sandbox.js";
export { createAgentRunSandboxPort, type AgentRunClientConfig } from "./agentrun-client.js";
