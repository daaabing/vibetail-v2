import type { SandboxProvider } from "@vibetail/sandbox-runtime";
import { describe, expect, it } from "vitest";
import {
  AgentRunSandboxProvider,
  UnsupportedAgentRunOperationError,
  toCommandLine,
  toSandboxStatus,
  type AgentRunCommandResult,
  type AgentRunSandboxPort,
  type AgentRunSandboxSession,
} from "./index.js";

interface FakeCall {
  execute: { command: string; cwd: string; timeout?: number }[];
  writeFile: { path: string; content: string; encoding: string; createDir: boolean }[];
  readFile: { path: string }[];
  deleted: number;
}

function fakePort(overrides: { state?: string; command?: AgentRunCommandResult; file?: string } = {}) {
  const calls: FakeCall = { execute: [], writeFile: [], readFile: [], deleted: 0 };
  const session: AgentRunSandboxSession = {
    sandboxId: "sbx-1",
    state: overrides.state ?? "Running",
    createdAt: "2026-08-15T00:00:00.000Z",
    execute: async (params) => {
      calls.execute.push(params);
      return overrides.command ?? { stdout: "ok", stderr: "", exitCode: 0 };
    },
    writeFile: async (params) => { calls.writeFile.push(params); },
    readFile: async (params) => {
      calls.readFile.push(params);
      return { content: Buffer.from(overrides.file ?? "hello").toString("base64"), encoding: "base64" };
    },
    refresh: async () => ({ sandboxId: "sbx-1", state: overrides.state ?? "Running", createdAt: "2026-08-15T00:00:00.000Z" }),
    waitUntilRunning: async () => ({ sandboxId: "sbx-1", state: overrides.state ?? "Running", createdAt: "2026-08-15T00:00:00.000Z" }),
    delete: async () => { calls.deleted += 1; },
  };
  const port: AgentRunSandboxPort = {
    createSandbox: async () => session,
    getSandbox: async () => session,
  };
  return { calls, port };
}

// Typed as the port so the tests exercise the adapter through the contract the
// rest of the platform would use, arguments included.
function provider(port: AgentRunSandboxPort, options: { networkIsolation?: boolean } = {}): SandboxProvider {
  return new AgentRunSandboxProvider({
    templateName: "vibetail-agent",
    client: port,
    ...(options.networkIsolation === undefined ? {} : { networkIsolation: options.networkIsolation }),
  });
}

const createRequest = { traceId: "trace-1", labels: { venue: "aurora" }, timeoutMs: 60_000 };

describe("AgentRunSandboxProvider", () => {
  it("reports hibernation and checkpoint/restore as unsupported", () => {
    const { port } = fakePort();
    expect(provider(port).capabilities).toMatchObject({
      hibernation: false,
      checkpointRestore: false,
      computeIsolation: true,
      storageIsolation: true,
    });
  });

  it.each(["hibernate", "resume", "checkpoint", "restore", "getLogs"] as const)(
    "rejects %s instead of emulating it",
    async (operation) => {
      const { port } = fakePort();
      const adapter = provider(port);
      const call = operation === "restore"
        ? adapter.restore({ id: "cp-1", sessionId: "sbx-1", provider: "fc", metadata: {}, createdAt: "2026-08-15T00:00:00.000Z" })
        : operation === "checkpoint"
          ? adapter.checkpoint("sbx-1", {})
          : adapter[operation]("sbx-1");
      await expect(call).rejects.toBeInstanceOf(UnsupportedAgentRunOperationError);
    },
  );

  it("creates a sandbox and derives the session from the sandbox state", async () => {
    const { port } = fakePort();
    const session = await provider(port).create(createRequest);
    expect(session).toMatchObject({ id: "sbx-1", provider: "fc", status: "running" });
  });

  it("refuses a fully isolated sandbox when the template is not private", async () => {
    const { port } = fakePort();
    await expect(provider(port).create({ ...createRequest, networkPolicy: "none" }))
      .rejects.toThrow(/PRIVATE network mode/);
  });

  it("round-trips binary file content through base64", async () => {
    const { calls, port } = fakePort({ file: "menu" });
    const adapter = provider(port);
    await adapter.create(createRequest);
    await adapter.writeFiles("sbx-1", [{ path: "/tmp/a.bin", content: new Uint8Array([0, 255, 10]) }]);
    expect(calls.writeFile[0]).toMatchObject({ path: "/tmp/a.bin", content: "AP8K", encoding: "base64", createDir: true });

    const [file] = await adapter.readFiles("sbx-1", ["/tmp/a.bin"]);
    expect(Buffer.from(file!.content).toString("utf8")).toBe("menu");
  });

  it("maps a non-zero command result onto the execution contract", async () => {
    const { calls, port } = fakePort({ command: { stdout: "", stderr: "boom", exitCode: 2 } });
    const adapter = provider(port);
    await adapter.create(createRequest);
    const execution = await adapter.execute("sbx-1", {
      command: "pnpm",
      args: ["test"],
      cwd: "/workspace",
      timeoutMs: 5_000,
    });
    expect(execution).toMatchObject({ exitCode: 2, stdout: "", stderr: "boom" });
    expect(calls.execute[0]).toMatchObject({ cwd: "/workspace", timeout: 5_000 });
  });

  it("treats an error-only result as a failure", async () => {
    const { port } = fakePort({ command: { error: "sandbox unreachable" } });
    const adapter = provider(port);
    await adapter.create(createRequest);
    const execution = await adapter.execute("sbx-1", { command: "ls", args: [], timeoutMs: 1_000 });
    expect(execution).toMatchObject({ exitCode: 1, stderr: "sandbox unreachable" });
  });

  it("terminates and forgets the cached session", async () => {
    const { calls, port } = fakePort();
    const adapter = provider(port);
    await adapter.create(createRequest);
    await adapter.terminate("sbx-1");
    expect(calls.deleted).toBe(1);
  });

  it("rejects a blank template name", () => {
    const { port } = fakePort();
    expect(() => new AgentRunSandboxProvider({ templateName: "  ", client: port })).toThrow(/template name is required/);
  });
});

describe("toSandboxStatus", () => {
  it("maps a stopped sandbox to terminated, never hibernated", () => {
    expect(toSandboxStatus("Stopped")).toBe("terminated");
  });

  it.each([
    ["Creating", "creating"],
    ["Running", "running"],
    ["READY", "running"],
    ["Deleting", "terminated"],
    ["Failed", "failed"],
    [undefined, "failed"],
  ] as const)("maps %s to %s", (state, expected) => {
    expect(toSandboxStatus(state)).toBe(expected);
  });
});

describe("toCommandLine", () => {
  it("quotes argv so arguments cannot escape the shell string", () => {
    expect(toCommandLine({ command: "sh", args: ["-c", "rm -rf /'; echo pwned"], timeoutMs: 1 }))
      .toBe(`'sh' '-c' 'rm -rf /'\\''; echo pwned'`);
  });

  it("prefixes env assignments without leaking them into argv", () => {
    expect(toCommandLine({ command: "node", args: ["x.js"], env: { TOKEN: "a b" }, timeoutMs: 1 }))
      .toBe(`env TOKEN='a b' 'node' 'x.js'`);
  });

  it("omits the env prefix when no variables are set", () => {
    expect(toCommandLine({ command: "ls", args: [], timeoutMs: 1 })).toBe(`'ls'`);
  });
});
