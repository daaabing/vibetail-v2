// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `vite build` → drop every route under src/routes/dev/ from the route tree so
// dev-only lab pages (e.g. /dev/poster) never ship to production. During
// `vite dev` they stay available. Each dev route also carries a runtime
// notFound() guard as a backstop.
const isBuild = process.argv.includes("build");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // NOTE: the generator matches this against each directory-entry NAME (not
    // the relative path), so "^dev$" skips the src/routes/dev folder wholesale.
    ...(isBuild ? { router: { routeFileIgnorePattern: "^dev$" } } : {}),
  },
});
