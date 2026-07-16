import { motion } from "framer-motion";

/** Two soft drops indicating flow stage. No "step 01 of 02" text. */
export default function FlowProgress({ stage }: { stage: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`stage ${stage} of 2`}>
      {[1, 2].map((s) => {
        const active = stage === s;
        return (
          <motion.span
            key={s}
            layout
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            style={{
              display: "inline-block",
              width: active ? 22 : 6,
              height: 6,
              borderRadius: 999,
              background: active
                ? "linear-gradient(90deg, var(--app-primary), var(--app-accent-lav))"
                : "rgba(255,255,255,0.14)",
              boxShadow: active ? "0 0 12px rgba(153,185,198,0.45)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}
