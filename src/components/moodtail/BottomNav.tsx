import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

export default function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useLang();

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
          return (
            <Link key={tab.to} to={tab.to} className="flex-1 flex flex-col items-center gap-1 py-3">
              <motion.div whileTap={{ scale: 0.85 }} style={{ color }}>{tab.icon}</motion.div>
              <span className="text-[10px] font-medium tracking-wide" style={{ color }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
