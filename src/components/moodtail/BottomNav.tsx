import { useRouterState, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import AuthModal from "@/components/moodtail/AuthModal";

export default function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const tabs = [
    {
      to: "/",
      label: t("nav.vibeCheck"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 22h8" /><path d="M12 11v11" />
          <path d="M19 3a1 1 0 0 1 1 1v4a8 8 0 0 1-16 0V4a1 1 0 0 1 1-1z" />
        </svg>
      ),
    },
    {
      to: "/gallery",
      label: t("nav.vibeBar"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 md:hidden"
        style={{
          background: "rgba(250, 246, 240, 0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid rgba(210,201,189,0.4)",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = pathname === tab.to || (tab.to !== "/" && pathname.startsWith(tab.to));
            const color = isActive ? "var(--app-primary)" : "var(--app-text-muted)";
            const isGallery = tab.to === "/gallery";
            return (
              <button
                key={tab.to}
                onClick={() => {
                  if (isGallery && !user) {
                    setShowAuth(true);
                    return;
                  }
                  navigate({ to: tab.to as any });
                }}
                className="flex-1 flex flex-col items-center gap-1 py-3"
              >
                <motion.div whileTap={{ scale: 0.85 }} style={{ color }}>{tab.icon}</motion.div>
                <span className="text-[10px] font-medium tracking-wide" style={{ color }}>{tab.label}</span>
              </button>
            );
          })}

          {/* Instagram follow */}
          <a
            href="https://instagram.com/vibe.tail"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center gap-1 py-3"
            style={{ color: "var(--app-text-muted)" }}
          >
            <motion.div whileTap={{ scale: 0.85 }} style={{ color: "var(--app-text-muted)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </motion.div>
            <span className="text-[10px] font-medium tracking-wide" style={{ color: "var(--app-text-muted)" }}>Instagram</span>
          </a>
        </div>
      </nav>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
