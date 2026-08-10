export type SandboxStatus =
  | "creating"
  | "running"
  | "hibernating"
  | "hibernated"
  | "resuming"
  | "terminated"
  | "failed";

export interface SandboxCapabilities {
  hibernation: boolean;
  persistentFilesystem: boolean;
  networkIsolation: boolean;
  computeIsolation: boolean;
  storageIsolation: boolean;
  checkpointRestore: boolean;
}

export interface SandboxSession {
  id: string;
  provider: string;
  status: SandboxStatus;
  capabilities: SandboxCapabilities;
  createdAt: string;
}

export interface SandboxCreateRequest {
  traceId: string;
  labels: Record<string, string>;
  timeoutMs: number;
  networkPolicy?: "none" | "restricted" | "outbound";
}

export interface SandboxExecuteRequest {
  command: string;
  args: readonly string[];
  cwd?: string;
  env?: Readonly<Record<string, string>>;
  timeoutMs: number;
}

export interface SandboxExecution {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface SandboxFile {
  path: string;
  content: Uint8Array;
}

export interface SandboxCheckpoint {
  id: string;
  sessionId: string;
  provider: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SandboxLogEntry {
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
}

export interface SandboxProvider {
  readonly id: string;
  readonly capabilities: SandboxCapabilities;
  create(request: SandboxCreateRequest): Promise<SandboxSession>;
  execute(sessionId: string, request: SandboxExecuteRequest): Promise<SandboxExecution>;
  writeFiles(sessionId: string, files: readonly SandboxFile[]): Promise<void>;
  readFiles(sessionId: string, paths: readonly string[]): Promise<readonly SandboxFile[]>;
  checkpoint(sessionId: string, metadata: Record<string, unknown>): Promise<SandboxCheckpoint>;
  hibernate(sessionId: string): Promise<SandboxSession>;
  resume(sessionId: string): Promise<SandboxSession>;
  restore(checkpoint: SandboxCheckpoint): Promise<SandboxSession>;
  getStatus(sessionId: string): Promise<SandboxSession>;
  getLogs(sessionId: string, cursor?: string): Promise<readonly SandboxLogEntry[]>;
  terminate(sessionId: string): Promise<void>;
}
