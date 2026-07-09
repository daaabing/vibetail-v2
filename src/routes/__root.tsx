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

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { name: "theme-color", content: "#12151A" },
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
        <link rel="stylesheet" href={FONT_HREF} />
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
        {/* Ambient breathing blobs — cool, quiet, dark-mode Mood Lab */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div style={{
            position: "absolute", top: "-10%", left: "-8%",
            width: "60vw", height: "60vw", maxWidth: 520, maxHeight: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(143,169,155,0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "liquid-blob-1 12s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: "25%", right: "-12%",
            width: "55vw", height: "55vw", maxWidth: 480, maxHeight: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(154,145,178,0.18) 0%, transparent 70%)",
            filter: "blur(70px)",
            animation: "liquid-blob-2 14s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", left: "15%",
            width: "50vw", height: "50vw", maxWidth: 440, maxHeight: 440,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(116,138,154,0.18) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "liquid-blob-3 16s ease-in-out infinite",
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
