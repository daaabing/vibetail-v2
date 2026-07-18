import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

export default function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`flex rounded-full overflow-hidden ${className}`}
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(14px)",
      }}
    >
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
  );
}
