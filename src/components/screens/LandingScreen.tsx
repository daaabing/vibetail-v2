import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import AuthModal from "@/components/moodtail/AuthModal";
import UserMenu from "@/components/moodtail/UserMenu";
import GlassVessel from "@/components/moodtail/GlassVessel";
import { track } from "@/lib/analytics";

/** Dark glass CTA. Primary = warm vermouth glow. Ghost = quiet outline. */
function GlassButton({
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
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="w-full relative flex items-center justify-center gap-2 text-sm font-medium tracking-wider overflow-hidden"
      style={{
        padding: "16px 24px",
        borderRadius: "9999px",
        background: primary
          ? "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)"
          : "rgba(255,255,255,0.05)",
        color: primary ? "white" : "var(--app-text)",
        border: primary ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.14)",
        boxShadow: primary
          ? "0 12px 30px -6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "0 8px 24px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px) saturate(140%)",
      }}
    >
      {primary && (
        <span className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 55%, transparent 75%)",
          animation: "liquid-flow 4s linear infinite",
        }} />
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
  useEffect(() => { track("landing_opened"); }, []);
  const handleMix = onMix ?? (() => navigate({ to: "/mood-input" }));

  return (
    <div className="min-h-svh flex flex-col p-5 pb-24 md:pb-5 w-full md:max-w-2xl lg:max-w-3xl md:mx-auto relative">

      {/* Top bar: language + auth */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.0, ease: "easeOut" }}
        className="flex justify-end items-center gap-2 mb-2"
      >
        <UserMenu />
        <div className="flex rounded-full overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(14px)",
          }}>
          {(["zh", "en"] as const).map((l) => (
            <motion.button
              key={l}
              whileTap={{ scale: 0.92 }}
              onClick={() => setLang(l)}
              className="px-3 py-1 text-[11px] font-medium tracking-wider transition-all"
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

      {/* Hero */}
      <div className="my-auto py-8 flex flex-col items-center text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <GlassVessel size={200} color="#C96F54" />
        </motion.div>

        <div className="space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="text-6xl font-normal tracking-tight"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--app-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Vibetail <span className="sr-only">— AI Cocktail Generator</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
            className="text-[11px] uppercase tracking-[0.35em]"
            style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}
          >
            {t("landing.tagline")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
            className="text-2xl italic"
            style={{ fontFamily: "var(--font-heading)", color: "var(--app-primary)" }}
          >
            {t("landing.subtitle")}
          </motion.p>
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.9, ease: "easeOut" }}
        className="space-y-3"
      >
        <GlassButton primary onClick={handleMix}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("landing.cta.mix")}
        </GlassButton>

        {!hideGallery && (
          <GlassButton onClick={() => {
            if (user) navigate({ to: "/gallery" });
            else setShowAuth(true);
          }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("landing.cta.bar")}
          </GlassButton>
        )}
      </motion.div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
