import { spawn } from "node:child_process";
import { createServer } from "node:net";

const serverEntry = "apps/web/dist/server/index.js";
const port = await findAvailablePort();
const output = [];
const child = spawn(process.execPath, [serverEntry], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    APP_URL: "https://example.com",
    AUTH_PROVIDER: "none",
    HOST: "127.0.0.1",
    PORT: String(port),
    LOG_LEVEL: "error",
    MODEL_PROVIDER: "deterministic",
    SANDBOX_PROVIDER: "local",
    RESTAURANT_REPOSITORY: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    IMAGE_CUTOUT_PROVIDER: "original",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => output.push(chunk));
child.stderr.on("data", (chunk) => output.push(chunk));
const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));

try {
  await waitForHealth(child, port);
  console.log(`Production server bundle started and passed /health on port ${port}.`);
} catch (error) {
  const detail = output.join("").trim();
  throw new Error(`${error instanceof Error ? error.message : String(error)}${detail ? `\n${detail}` : ""}`);
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  await Promise.race([exited, delay(2_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

async function findAvailablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a smoke-test port");
  await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}

async function waitForHealth(process, serverPort) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null || process.signalCode !== null) {
      throw new Error("Production server bundle exited before becoming healthy.");
    }
    try {
      const response = await fetch(`http://127.0.0.1:${serverPort}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return;
    } catch {
      // The process may still be binding the port; retry until the deadline.
    }
    await delay(100);
  }
  throw new Error("Production server bundle did not become healthy within 10 seconds.");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
