import type {
  SandboxCapabilities,
  SandboxCheckpoint,
  SandboxCreateRequest,
  SandboxExecuteRequest,
  SandboxExecution,
  SandboxFile,
  SandboxLogEntry,
  SandboxProvider,
  SandboxSession,
  SandboxStatus,
} from "@vibetail/sandbox-runtime";
import type { AgentRunSandboxPort, AgentRunSandboxSession, AgentRunSandboxSnapshot } from "./agentrun-port.js";
import { FC_SANDBOX_PROVIDER_ID } from "./provider-id.js";

const DEFAULT_IDLE_TIMEOUT_SECONDS = 900;
const FILE_ENCODING = "base64";

/**
 * `@agentrun/sdk` 0.0.5 exposes create/stop/delete/get only. It has no
 * hibernate, resume, checkpoint, or restore primitive, and no sandbox log API.
 * Rather than emulating hibernation with a stopped sandbox — which loses
 * process state and would misreport durability — these operations reject and
 * the matching capability bits are reported as false.
 */
export class UnsupportedAgentRunOperationError extends Error {
  override readonly name = "UnsupportedAgentRunOperationError";

  constructor(readonly operation: string) {
    super(`AgentRun sandbox does not support "${operation}" (SDK @agentrun/sdk has no equivalent primitive)`);
  }
}

export interface AgentRunSandboxProviderOptions {
  /** AgentRun sandbox template the adapter instantiates sandboxes from. */
  templateName: string;
  client: AgentRunSandboxPort;
  idleTimeoutSeconds?: number;
  /** Set when the template mounts NAS/OSS, which makes the filesystem outlive a sandbox. */
  persistentFilesystem?: boolean;
  /** Set when the template runs in `PRIVATE` network mode. */
  networkIsolation?: boolean;
}

export class AgentRunSandboxProvider implements SandboxProvider {
  readonly id = FC_SANDBOX_PROVIDER_ID;
  readonly capabilities: SandboxCapabilities;
  private readonly client: AgentRunSandboxPort;
  private readonly templateName: string;
  private readonly idleTimeoutSeconds: number;
  private readonly sessions = new Map<string, AgentRunSandboxSession>();

  constructor(options: AgentRunSandboxProviderOptions) {
    this.templateName = options.templateName.trim();
    if (!this.templateName) throw new Error("AgentRun sandbox template name is required");
    this.client = options.client;
    this.idleTimeoutSeconds = options.idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS;
    this.capabilities = {
      hibernation: false,
      persistentFilesystem: options.persistentFilesystem ?? false,
      networkIsolation: options.networkIsolation ?? false,
      // AgentRun sandboxes are MicroVM-isolated regardless of template options.
      computeIsolation: true,
      storageIsolation: true,
      checkpointRestore: false,
    };
  }

  async create(request: SandboxCreateRequest): Promise<SandboxSession> {
    if (request.networkPolicy === "none" && !this.capabilities.networkIsolation) {
      throw new Error("Network-isolated sandboxes require an AgentRun template in PRIVATE network mode");
    }
    const session = await this.client.createSandbox({
      templateName: this.templateName,
      sandboxIdleTimeoutSeconds: Math.max(1, Math.round(request.timeoutMs / 1000)),
    });
    const snapshot = await session.waitUntilRunning({ timeoutSeconds: this.idleTimeoutSeconds });
    const sessionId = requireSandboxId(session.sandboxId ?? snapshot.sandboxId);
    this.sessions.set(sessionId, session);
    return this.toSession(sessionId, snapshot);
  }

  async execute(sessionId: string, request: SandboxExecuteRequest): Promise<SandboxExecution> {
    const session = await this.resolve(sessionId);
    const startedAt = performance.now();
    const result = await session.execute({
      command: toCommandLine(request),
      cwd: request.cwd ?? "/",
      timeout: request.timeoutMs,
    });
    return {
      exitCode: result.exitCode ?? (result.error ? 1 : 0),
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? result.error ?? "",
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
  }

  async writeFiles(sessionId: string, files: readonly SandboxFile[]): Promise<void> {
    const session = await this.resolve(sessionId);
    for (const file of files) {
      await session.writeFile({
        path: file.path,
        content: Buffer.from(file.content).toString(FILE_ENCODING),
        encoding: FILE_ENCODING,
        createDir: true,
      });
    }
  }

  async readFiles(sessionId: string, paths: readonly string[]): Promise<readonly SandboxFile[]> {
    const session = await this.resolve(sessionId);
    const files: SandboxFile[] = [];
    for (const path of paths) {
      const file = await session.readFile({ path });
      files.push({ path, content: decodeFile(file.content ?? "", file.encoding) });
    }
    return files;
  }

  async getStatus(sessionId: string): Promise<SandboxSession> {
    const session = await this.resolve(sessionId);
    return this.toSession(sessionId, await session.refresh());
  }

  async terminate(sessionId: string): Promise<void> {
    const session = await this.resolve(sessionId);
    await session.delete();
    this.sessions.delete(sessionId);
  }

  checkpoint(): Promise<SandboxCheckpoint> {
    return Promise.reject(new UnsupportedAgentRunOperationError("checkpoint"));
  }

  hibernate(): Promise<SandboxSession> {
    return Promise.reject(new UnsupportedAgentRunOperationError("hibernate"));
  }

  resume(): Promise<SandboxSession> {
    return Promise.reject(new UnsupportedAgentRunOperationError("resume"));
  }

  restore(): Promise<SandboxSession> {
    return Promise.reject(new UnsupportedAgentRunOperationError("restore"));
  }

  getLogs(): Promise<readonly SandboxLogEntry[]> {
    return Promise.reject(new UnsupportedAgentRunOperationError("getLogs"));
  }

  private async resolve(sessionId: string): Promise<AgentRunSandboxSession> {
    const cached = this.sessions.get(sessionId);
    if (cached) return cached;
    const session = await this.client.getSandbox({ sandboxId: sessionId });
    this.sessions.set(sessionId, session);
    return session;
  }

  private toSession(sessionId: string, snapshot: AgentRunSandboxSnapshot): SandboxSession {
    return {
      id: sessionId,
      provider: this.id,
      status: toSandboxStatus(snapshot.state),
      capabilities: this.capabilities,
      createdAt: snapshot.createdAt ?? new Date().toISOString(),
    };
  }
}

/**
 * `Stopped` maps to `terminated`, not `hibernated`: a stopped AgentRun sandbox
 * cannot be resumed with its process state intact.
 */
export function toSandboxStatus(state: string | undefined): SandboxStatus {
  switch (state) {
    case "Creating": return "creating";
    case "Running":
    case "READY": return "running";
    case "Stopped":
    case "Deleting": return "terminated";
    case "Failed": return "failed";
    default: return "failed";
  }
}

/**
 * The SDK executes a single shell string, while `SandboxExecuteRequest` carries
 * argv plus an env map. Every interpolated value is single-quoted so arguments
 * cannot escape into the surrounding command.
 */
export function toCommandLine(request: SandboxExecuteRequest): string {
  const assignments = Object.entries(request.env ?? {}).map(([key, value]) => `${key}=${shellQuote(value)}`);
  const argv = [shellQuote(request.command), ...request.args.map(shellQuote)];
  return [...(assignments.length > 0 ? ["env", ...assignments] : []), ...argv].join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function decodeFile(content: string, encoding: string | undefined): Uint8Array {
  return new Uint8Array(Buffer.from(content, encoding === FILE_ENCODING ? FILE_ENCODING : "utf8"));
}

function requireSandboxId(sandboxId: string | undefined): string {
  if (!sandboxId) throw new Error("AgentRun returned a sandbox without an id");
  return sandboxId;
}
