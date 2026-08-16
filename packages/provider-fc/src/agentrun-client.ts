import type { CodeInterpreterSandbox } from "@agentrun/sdk";
import type { AgentRunFileContent, AgentRunSandboxPort, AgentRunSandboxSession } from "./agentrun-port.js";

export interface AgentRunClientConfig {
  /**
   * Credentials are optional here: `@agentrun/sdk` falls back to
   * `AGENTRUN_ACCESS_KEY_ID` / `AGENTRUN_ACCESS_KEY_SECRET` /
   * `AGENTRUN_ACCOUNT_ID` / `AGENTRUN_REGION` (and the `ALIBABA_CLOUD_*` and
   * `FC_*` aliases) when a field is omitted. Server and worker processes only —
   * these values must never reach browser code.
   */
  accessKeyId?: string;
  accessKeySecret?: string;
  securityToken?: string;
  accountId?: string;
  regionId?: string;
  timeoutMs?: number;
}

/**
 * Binds the narrow {@link AgentRunSandboxPort} to the real vendor SDK.
 *
 * The SDK is loaded lazily so that importing `@vibetail/provider-fc` for its
 * types never pulls the vendor dependency tree into a bundle.
 *
 * Unverified against a live account — the following are read from the SDK's
 * type declarations and need confirmation once credentials exist:
 *   - the unit of `process.cmd({ timeout })` (assumed milliseconds);
 *   - the accepted values of `file.write({ encoding })` and the response shape
 *     of `file.read` (assumed `{ content, encoding }`).
 */
export async function createAgentRunSandboxPort(config: AgentRunClientConfig = {}): Promise<AgentRunSandboxPort> {
  const { Config, SandboxClient, TemplateType } = await import("@agentrun/sdk");
  const sdkConfig = new Config({
    ...(config.accessKeyId === undefined ? {} : { accessKeyId: config.accessKeyId }),
    ...(config.accessKeySecret === undefined ? {} : { accessKeySecret: config.accessKeySecret }),
    ...(config.securityToken === undefined ? {} : { securityToken: config.securityToken }),
    ...(config.accountId === undefined ? {} : { accountId: config.accountId }),
    ...(config.regionId === undefined ? {} : { regionId: config.regionId }),
    ...(config.timeoutMs === undefined ? {} : { timeout: config.timeoutMs }),
  });
  const client = new SandboxClient(sdkConfig);

  return {
    async createSandbox({ templateName, sandboxIdleTimeoutSeconds }) {
      return toSession(await client.createCodeInterpreterSandbox({
        templateName,
        options: { sandboxIdleTimeoutSeconds },
      }));
    },
    async getSandbox({ sandboxId }) {
      const sandbox = await client.getSandbox({
        id: sandboxId,
        templateType: TemplateType.CODE_INTERPRETER,
      });
      // `getSandbox` is typed as the `Sandbox` base class; passing the template
      // type makes the SDK hydrate the code-interpreter subclass at runtime.
      return toSession(sandbox as CodeInterpreterSandbox);
    },
  };
}

function toSession(sandbox: CodeInterpreterSandbox): AgentRunSandboxSession {
  return {
    get sandboxId() { return sandbox.sandboxId; },
    get state() { return sandbox.state as string | undefined; },
    get createdAt() { return sandbox.createdAt; },
    execute: (params) => sandbox.process.cmd(params),
    writeFile: async (params) => { await sandbox.file.write(params); },
    readFile: (params) => sandbox.file.read(params) as Promise<AgentRunFileContent>,
    refresh: () => sandbox.refresh(),
    waitUntilRunning: (params) => sandbox.waitUntilRunning(params),
    delete: async () => { await sandbox.delete(); },
  };
}
