"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import VibeBottle from "./VibeBottle";

interface MixingOverlayProps {
  open: boolean;
  color?: string;
  /** Rotating status lines, e.g. ["正在捕捉你的当下味道…", ...]. */
  lines: string[];
}

export default function MixingOverlay({ open, color = "#E0533C", lines }: MixingOverlayProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    const id = setInterval(() => setIdx((i) => (i + 1) % lines.length), 1900);
    return () => clearInterval(id);
  }, [open, lines.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(255,248,240,0.92) 0%, rgba(250,244,236,0.96) 60%, rgba(248,240,232,0.98) 100%)",
            backdropFilter: "blur(18px) saturate(150%)",
            WebkitBackdropFilter: "blur(18px) saturate(150%)",
          }}
        >
          <VibeBottle color={color} size={260} mode="mixing" />

          <div className="mt-8 h-12 flex items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="text-base md:text-lg italic"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--app-text-secondary)",
                  maxWidth: 360,
                }}
              >
                {lines[idx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* progress shimmer */}
          <div
            className="mt-6 h-[3px] w-44 rounded-full overflow-hidden"
            style={{ background: "rgba(0,0,0,0.06)" }}
          >
            <motion.div
              className="h-full"
              style={{
                width: "40%",
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
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
