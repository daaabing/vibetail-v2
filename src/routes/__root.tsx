import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { LangProvider } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { initAnalytics } from "@/lib/analytics";

import BottomNav from "@/components/moodtail/BottomNav";
import { SketchDefs } from "@/components/draw/Sketch";
import { Toaster } from "@/components/ui/sonner";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..700&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@500;600&family=Cormorant+Garamond:ital,wght@0,400..600;1,400..600&display=swap";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#F3F2EF" },
      { property: "og:site_name", content: "Vibetail" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONT_HREF },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Vibetail",
              url: "https://vibetail.com",
            },
            {
              "@type": "WebSite",
              name: "Vibetail",
              url: "https://vibetail.com",
              description:
                "AI cocktail generator that turns your current vibe into a personalized drink.",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [figMode, setFigMode] = useState(false);
  useEffect(() => {
    initAnalytics();
    if (window.location.hash.includes("figmacapture")) setFigMode(true);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        {/* One shared rough-ink filter, referenced by every drawing. */}
        <SketchDefs />

        {/* Print grain over the whole sheet — the paper stock of the app.
            Hidden during Figma capture: the snapshot rasterizes it badly. */}
        {!figMode && <div className="grain-fixed" aria-hidden />}

        <main className="relative flex min-h-svh flex-col" style={{ zIndex: 1 }}>
          <Outlet />
        </main>
        <BottomNav />
        <Toaster />
      </LangProvider>
    </QueryClientProvider>
  );
}
