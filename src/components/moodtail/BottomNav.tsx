import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import AuthModal from "@/components/moodtail/AuthModal";

/**
 * Mobile-only app bar. Deliberately absent from the marketing landing page
 * (which carries its own nav) and from the mixing flow (which is a focused,
 * one-decision-per-screen wizard).
 */
export default function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const hidden =
    pathname === "/" ||
    pathname === "/mood-input" ||
    pathname.startsWith("/restaurant/") ||
    pathname.startsWith("/manage/") ||
    /^\/m\/[^/]+\/[^/]+$/.test(pathname);
  if (hidden) return null;

  const tabs = [
    { to: "/", label: t("nav.vibeCheck") },
    { to: "/gallery", label: t("nav.vibeBar") },
  ];

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 md:hidden"
        style={{
          background: "var(--paper)",
          borderTop: "1px solid var(--line-strong)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = pathname === tab.to || (tab.to !== "/" && pathname.startsWith(tab.to));
            const isGallery = tab.to === "/gallery";
            return (
              <button
                key={tab.to}
                onClick={() => {
                  if (isGallery && !user) {
                    setShowAuth(true);
                    return;
                  }
                  navigate({ to: tab.to as string });
                }}
                className="mono relative flex-1 py-4"
                style={{
                  color: isActive ? "var(--ink)" : "var(--ink-mute)",
                  borderRight: "1px solid var(--line)",
                }}
              >
                {isActive && (
                  <span
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: "var(--vermilion)" }}
                  />
                )}
                {tab.label}
              </button>
            );
          })}
          <a
            href="https://instagram.com/vibe.tail"
            target="_blank"
            rel="noopener noreferrer"
            className="mono flex-1 py-4 text-center"
            style={{ color: "var(--ink-mute)" }}
          >
            Instagram
          </a>
        </div>
      </nav>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
