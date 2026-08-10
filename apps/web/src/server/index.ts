import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseWebEnv } from "../env.js";
import { createWebApp } from "./app.js";
import { createWebDependencies } from "./dependencies.js";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { serverEnv } = parseWebEnv(process.env);
const dependencies = createWebDependencies(serverEnv);
const app = createWebApp({
  ...dependencies,
  dataSource: serverEnv.RESTAURANT_REPOSITORY,
});

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
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(serverEnv.PORT, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      event: "server_started",
      url: `http://127.0.0.1:${serverEnv.PORT}`,
      restaurant_data_source: serverEnv.RESTAURANT_REPOSITORY,
      model_provider: serverEnv.MODEL_PROVIDER,
    }),
  );
});
