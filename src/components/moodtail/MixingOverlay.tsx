"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import VibeBottle from "./VibeBottle";

interface MixingOverlayProps {
  open: boolean;
  color?: string;
  lines: string[];
}

export default function MixingOverlay({ open, color = "#8FA99B", lines }: MixingOverlayProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    const id = setInterval(() => setIdx((i) => (i + 1) % lines.length), 1900);
    return () => clearInterval(id);
  }, [open, lines.length]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(23,18,15,0.85) 0%, rgba(18,21,26,0.93) 55%, rgba(16,23,21,0.97) 100%)",
            backdropFilter: "blur(28px) saturate(150%)",
          }}
        >
          <VibeBottle color={color} size={280} mode="mixing" />

          <div className="mt-10 h-12 flex items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-lg md:text-xl italic"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--app-text)",
                  maxWidth: 360,
                }}
              >
                {lines[idx]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-8 h-[2px] w-52 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full"
              style={{
                width: "40%",
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                boxShadow: `0 0 12px ${color}`,
              }}
              animate={{ x: ["-120%", "260%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
