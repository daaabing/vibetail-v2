"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Drummer } from "@/components/draw/HeroStage";
import { ROUGH } from "@/components/draw/Sketch";

interface MixingOverlayProps {
  open: boolean;
  color?: string;
  lines: string[];
}

/** A tick drawn with a pen rather than a checkbox. */
function Tick({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden style={{ flex: "none" }}>
      <g filter={ROUGH} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M4 13 l6 6 L21 5"
          stroke="var(--gold, #c9a25c)"
          strokeWidth="3"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </g>
    </svg>
  );
}

/**
 * What happens while the AI works. The shaker keeps time; the list underneath
 * shows the actual order of operations so the wait has a shape.
 */
export default function MixingOverlay({ open, lines }: MixingOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    setStep(0);
    // Walk the list, then hold on the last item until the response lands.
    const id = setInterval(() => setStep((s) => Math.min(lines.length - 1, s + 1)), 1700);
    return () => clearInterval(id);
  }, [open, lines.length]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="panel-ink fixed inset-0 z-[80] flex flex-col items-center justify-center gap-7 px-8"
        >
          <span className="eyebrow-gilt" style={{ color: "var(--gold)" }}>
            One moment — mixing
          </span>

          {/* The house drummer keeps time while the AI shakes */}
          <motion.div
            className="w-[200px]"
            animate={{ rotate: [-3, 3, -3], y: [0, -6, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          >
            <Drummer className="w-full" />
          </motion.div>

          {/* The thinking, written out */}
          <ul className="w-full max-w-xs space-y-2.5">
            {lines.map((line, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: done ? 0.5 : active ? 1 : 0.3, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <Tick done={done} />
                  <span
                    className="note text-[19px] leading-snug"
                    style={{
                      color: "var(--paper)",
                      textDecorationLine: done ? "line-through" : "none",
                      textDecorationColor: "var(--lamp)",
                    }}
                  >
                    {line}
                  </span>
                  {active && (
                    <motion.span
                      className="note"
                      style={{ color: "var(--lamp)" }}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                    >
                      …
                    </motion.span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
