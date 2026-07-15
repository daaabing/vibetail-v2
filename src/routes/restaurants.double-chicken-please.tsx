import { createFileRoute, redirect } from "@tanstack/react-router";

// 301 redirect: the DCP campaign now lives under the unified menu route.
export const Route = createFileRoute("/restaurants/double-chicken-please")({
  beforeLoad: () => {
    throw redirect({
      to: "/m/$merchantSlug/$menuSlug",
      params: { merchantSlug: "double-chicken-please", menuSlug: "main" },
      // Preserve QR/UTM query params.
      search: (prev: Record<string, unknown>) => prev,
      statusCode: 301,
    });
  },
});
