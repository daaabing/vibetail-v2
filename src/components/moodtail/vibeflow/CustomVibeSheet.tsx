import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Lang } from "@/lib/i18n";
import {
  MOOD_PLACEHOLDERS_EN,
  MOOD_PLACEHOLDERS_ZH,
} from "@/lib/moodtail-data";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  lang: Lang;
}

export default function CustomVibeSheet({ open, onClose, onSubmit, lang }: Props) {
  const [value, setValue] = useState("");
  const placeholders = lang === "zh" ? MOOD_PLACEHOLDERS_ZH : MOOD_PLACEHOLDERS_EN;
  const [ph, setPh] = useState(() => placeholders[0]);

  useEffect(() => {
    if (!open) return;
    setPh(placeholders[Math.floor(Math.random() * placeholders.length)]);
  }, [open, placeholders]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    setValue("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-40"
          style={{ background: "rgba(6,7,9,0.55)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 mx-auto max-w-[560px] rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
            style={{
              background: "rgba(22,24,28,0.96)",
              backdropFilter: "blur(24px) saturate(140%)",
              borderTop: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
            }}
          >
            <div className="flex justify-center mb-3">
              <span
                style={{
                  width: 42,
                  height: 4,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                }}
              />
            </div>

            <h2
              className="text-lg mb-1"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--app-text)",
              }}
            >
              {lang === "zh" ? "今天到底怎么了？" : "So — what's going on?"}
            </h2>
            <p
              className="text-xs mb-3"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--app-text-muted)",
              }}
            >
              {lang === "zh"
                ? "写一句就行，越离谱越好。"
                : "One line — the more unhinged the better."}
            </p>

            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder={`"${ph}"`}
              className="w-full resize-none rounded-2xl p-4 text-sm leading-relaxed"
              style={{
                minHeight: 120,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "var(--app-text)",
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                outline: "none",
              }}
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setValue(placeholders[Math.floor(Math.random() * placeholders.length)])
                }
                className="flex-1 rounded-full py-3 text-xs tracking-wide"
                style={{
                  fontFamily: "var(--font-body)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "var(--app-text-secondary)",
                }}
              >
                {lang === "zh" ? "换个离谱说法" : "Try a wilder line"}
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={submit}
                disabled={!value.trim()}
                className="flex-1 rounded-full py-3 text-sm font-semibold disabled:opacity-40"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "white",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                {lang === "zh" ? "倒进瓶子" : "Pour it in"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
