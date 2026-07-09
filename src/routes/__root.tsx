import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { LangProvider } from "@/lib/i18n";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

import BottomNav from "@/components/moodtail/BottomNav";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { name: "theme-color", content: "#0E0F11" },
      { property: "og:site_name", content: "Vibetail" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
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
              description: "AI cocktail generator that turns your current vibe into a personalized drink.",
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <HeadContent />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { initAnalytics(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0, background: "#0E0F11" }}>
          <div className="absolute animate-blob-1" style={{
            top: "-20%", left: "-10%", width: "60%", height: "60%",
            borderRadius: "50%",
            background: "rgba(61,72,69,0.18)",
            filter: "blur(140px)",
          }} />
          <div className="absolute animate-blob-2" style={{
            bottom: "-10%", right: "-10%", width: "55%", height: "55%",
            borderRadius: "50%",
            background: "rgba(70,59,65,0.14)",
            filter: "blur(130px)",
          }} />
          <div className="absolute animate-blob-3" style={{
            top: "35%", right: "20%", width: "45%", height: "45%",
            borderRadius: "50%",
            background: "rgba(42,48,62,0.14)",
            filter: "blur(120px)",
          }} />
        </div>
        
        <main className="flex-1 flex flex-col relative" style={{ zIndex: 1 }}>
          <Outlet />
        </main>
        <BottomNav />
        <Toaster />
      </LangProvider>
    </QueryClientProvider>
  );
}
