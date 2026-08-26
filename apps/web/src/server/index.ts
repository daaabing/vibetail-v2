import express from "express";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseWebEnv } from "../env.js";
import { createWebApp } from "./app.js";
import { createWebDependencies } from "./dependencies.js";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { serverEnv } = parseWebEnv(process.env);
const dependencies = createWebDependencies(serverEnv);
const app = createWebApp(dependencies);
// One http server shared with Vite's HMR websocket below: the default
// standalone HMR port (24678) collides as soon as two dev servers run on
// the same machine, and every page beyond the first loses hot reload.
const httpServer = createServer(app);

if (serverEnv.NODE_ENV === "production") {
  const clientRoot = resolve(webRoot, "dist/client");
  if (!existsSync(resolve(clientRoot, "index.html"))) {
    throw new Error("Client build not found. Run pnpm build before pnpm start.");
  }
  app.use(express.static(clientRoot));
  app.get("*", (_request, response) => response.sendFile(resolve(clientRoot, "index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root: webRoot,
    server: { middlewareMode: true, ws: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

const server = httpServer.listen(serverEnv.PORT, serverEnv.HOST, () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      event: "server_started",
      host: serverEnv.HOST,
      port: serverEnv.PORT,
      model_provider: serverEnv.MODEL_PROVIDER,
    }),
  );
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      event: "server_stopping",
      signal,
    }));
    server.close((error) => {
      if (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          service: "web",
          event: "server_stop_failed",
        }));
        process.exitCode = 1;
      }
    });
  });
}
