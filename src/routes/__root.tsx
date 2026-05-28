import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { LangProvider } from "@/lib/i18n";
import SplashScreen from "@/components/moodtail/SplashScreen";
import BottomNav from "@/components/moodtail/BottomNav";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { title: "Vibetail — Turn your vibe into a cocktail" },
      { name: "description", content: "Turn your current vibe into a cocktail. 人不一定清醒，酒一定要对味。" },
      { name: "theme-color", content: "#FAF6F0" },
      { property: "og:title", content: "Vibetail — Turn your vibe into a cocktail" },
      { property: "og:description", content: "Turn your current vibe into a cocktail. 人不一定清醒，酒一定要对味。" },
      { name: "twitter:title", content: "Vibetail — Turn your vibe into a cocktail" },
      { name: "twitter:description", content: "Turn your current vibe into a cocktail. 人不一定清醒，酒一定要对味。" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/17PkbIkJJbhD4Z7df3muH0hvMGK2/social-images/social-1780006827115-115.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/17PkbIkJJbhD4Z7df3muH0hvMGK2/social-images/social-1780006827115-115.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div style={{
            position: "absolute", top: "-10%", left: "-5%",
            width: "60vw", height: "60vw", maxWidth: 400, maxHeight: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(224,83,60,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
            animation: "liquid-blob-1 8s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: "30%", right: "-10%",
            width: "50vw", height: "50vw", maxWidth: 350, maxHeight: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,155,67,0.10) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "liquid-blob-2 10s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "10%", left: "20%",
            width: "40vw", height: "40vw", maxWidth: 300, maxHeight: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(141,163,130,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "liquid-blob-3 12s ease-in-out infinite",
          }} />
        </div>
        <SplashScreen />
        <main className="flex-1 flex flex-col relative" style={{ zIndex: 1 }}>
          <Outlet />
        </main>
        <BottomNav />
        <Toaster />
      </LangProvider>
    </QueryClientProvider>
  );
}
