import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS wrapper for the mobile shell at /app. The webview loads the running
 * Vibetail server (same-origin /v1 API, no CORS needed) rather than bundled
 * static files — set CAP_SERVER_URL to point at a LAN IP for device testing
 * or at staging for a distributable build, then re-run `npx cap sync ios`.
 * The simulator reaches the host's dev server via 127.0.0.1.
 */
const serverUrl = process.env["CAP_SERVER_URL"] ?? "http://127.0.0.1:3000/app";

const config: CapacitorConfig = {
  appId: "com.vibetail.app",
  appName: "Vibetail",
  webDir: "dist/client",
  server: {
    url: serverUrl,
    // Dev-server URLs are plain http; a real release should use https staging.
    cleartext: serverUrl.startsWith("http://"),
  },
  ios: {
    contentInset: "never",
  },
};

export default config;
