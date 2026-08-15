// Narrow port over the parts of `@agentrun/sdk` this adapter consumes. Keeping
// the surface explicit lets tests inject a fake without loading the vendor SDK,
// and documents exactly which vendor APIs the adapter depends on.

export interface AgentRunCommandResult {
  stdout?: string | undefined;
  stderr?: string | undefined;
  exitCode?: number | undefined;
  error?: string | undefined;
}

export interface AgentRunFileContent {
  content?: string | undefined;
  encoding?: string | undefined;
}

export interface AgentRunSandboxSnapshot {
  sandboxId?: string | undefined;
  state?: string | undefined;
  createdAt?: string | undefined;
}

export interface AgentRunSandboxSession extends AgentRunSandboxSnapshot {
  execute(params: { command: string; cwd: string; timeout?: number }): Promise<AgentRunCommandResult>;
  writeFile(params: { path: string; content: string; encoding: string; createDir: boolean }): Promise<void>;
  readFile(params: { path: string }): Promise<AgentRunFileContent>;
  refresh(): Promise<AgentRunSandboxSnapshot>;
  waitUntilRunning(params: { timeoutSeconds: number }): Promise<AgentRunSandboxSnapshot>;
  delete(): Promise<void>;
}

export interface AgentRunSandboxPort {
  createSandbox(params: {
    templateName: string;
    sandboxIdleTimeoutSeconds: number;
  }): Promise<AgentRunSandboxSession>;
  getSandbox(params: { sandboxId: string }): Promise<AgentRunSandboxSession>;
}
