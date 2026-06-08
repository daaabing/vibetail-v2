
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import AuthModal from "@/components/moodtail/AuthModal";
import UserMenu from "@/components/moodtail/UserMenu";



/* ---------- Ink-brush style button ---------- */
function InkButton({
  onClick,
  primary = false,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="w-full relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden"
      style={{
        padding: "14px 24px",
        borderRadius: "4px",
        background: primary
          ? "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)"
          : "transparent",
        color: primary ? "white" : "var(--app-text-secondary)",
        border: primary ? "none" : "1.5px solid rgba(74,62,61,0.3)",
        boxShadow: primary
          ? "2px 3px 12px rgba(194,65,12,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "1px 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {primary && (
        <span className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
          animation: "liquid-flow 4s linear infinite",
        }} />
      )}
      {primary && (
        <span className="absolute top-0 left-4 right-4 h-px pointer-events-none"
          style={{ background: "rgba(255,255,255,0.3)" }} />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

export default function LandingScreen({ onMix, hideGallery }: { onMix?: () => void; hideGallery?: boolean } = {}) {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const handleMix = onMix ?? (() => navigate({ to: "/mood-input" }));

  return (
    <div className="min-h-svh flex flex-col p-5 pb-24 md:pb-5 w-full md:max-w-2xl lg:max-w-3xl md:mx-auto relative">

      {/* Top right: auth + language toggle — fades in after hero */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.1, ease: "easeOut" }}
        className="flex justify-end items-center gap-2 mb-2"
      >
        <UserMenu />
        <div className="flex rounded-full overflow-hidden"
          style={{ border: "1px solid rgba(74,62,61,0.2)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)" }}>
          {(["zh", "en"] as const).map((l) => (
            <motion.button
              key={l}
              whileTap={{ scale: 0.92 }}
              onClick={() => setLang(l)}
              className="px-3 py-1 text-[11px] font-semibold tracking-wider transition-all"
              style={{
                background: lang === l ? "var(--app-primary)" : "transparent",
                color: lang === l ? "white" : "var(--app-text-muted)",
                borderRadius: "9999px",
              }}
            >
              {l === "zh" ? "中文" : "EN"}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Hero Content Section */}
      <div className="my-auto py-8 flex flex-col items-center text-center space-y-6">
        {/* Vibetail brand logo — appears first */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative w-36 h-36 flex items-center justify-center"
        >
          <div className="absolute inset-2 rounded-full filter blur-2xl opacity-15 pulse-distill"
            style={{ backgroundColor: "var(--app-primary)" }} />
          <div className="absolute inset-8 rounded-full filter blur-xl opacity-20"
            style={{ backgroundColor: "var(--app-secondary)" }} />
          <svg className="w-28 h-28 relative z-10 opacity-90" fill="none"
            stroke="var(--app-text-secondary)" strokeWidth="1.2" viewBox="0 0 24 24">
            <path d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z"
              strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 6s1.5 1 5 1 5-1 5-1" strokeDasharray="2 2" />
            <path stroke="var(--app-primary)" d="M8 9.5c2 1 4 0 6.5-.5" strokeLinecap="round" strokeWidth="2" />
            <circle cx="11" cy="6" fill="var(--app-accent)" r="1.5" />
          </svg>

        </motion.div>


        {/* Title Group */}
        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
            className="text-5xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}
          >
            Vibetail <span className="sr-only">— AI Cocktail Generator</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}
          >
            {t("landing.tagline")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
            className="text-xl"
            style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-primary)" }}
          >
            {t("landing.subtitle")}
          </motion.p>
        </div>
      </div>

      {/* CTA buttons — fade in last */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.95, ease: "easeOut" }}
        className="space-y-3"
      >
        <InkButton primary onClick={handleMix}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("landing.cta.mix")}
        </InkButton>

        {!hideGallery && (
          <InkButton onClick={() => {
            if (user) {
              navigate({ to: "/gallery" });
            } else {
              setShowAuth(true);
            }
          }}>
            <svg className="w-4 h-4" fill="none" stroke="var(--app-secondary)" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("landing.cta.bar")}
          </InkButton>
        )}
      </motion.div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
