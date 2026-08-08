import { motion } from "framer-motion";
import { ROUGH } from "./Sketch";

/** A drawn shaker being worked, with the mess that implies. */
export default function Shaker({ size = 200 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size * 1.15 }}>
      {/* Motion arcs stay put while the tin moves */}
      <svg
        viewBox="0 0 200 230"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        style={{ color: "rgba(242,237,225,0.4)", overflow: "visible" }}
      >
        <g filter={ROUGH} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <motion.g
            animate={{ opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M30 62 C 14 76, 14 106, 28 122" />
            <path d="M14 54 C -6 76, -6 112, 12 132" opacity="0.6" />
            <path d="M170 62 C 186 76, 186 106, 172 122" />
            <path d="M186 54 C 206 76, 206 112, 188 132" opacity="0.6" />
          </motion.g>
        </g>
      </svg>

      {/* The tin */}
      <motion.svg
        viewBox="0 0 200 230"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        style={{ color: "var(--paper)", overflow: "visible", transformOrigin: "50% 78%" }}
        animate={{ rotate: [-11, 9, -11], y: [0, -7, 0] }}
        transition={{ duration: 0.78, repeat: Infinity, ease: "easeInOut" }}
      >
        <g
          filter={ROUGH}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Cap */}
          <path d="M84 18 h32 v14 h-32 Z" />
          {/* Top tin */}
          <path d="M70 32 h60 v26 h-60 Z" />
          {/* Body */}
          <path d="M64 58 h72 l-10 122 a10 10 0 0 1 -10 9 H84 a10 10 0 0 1 -10 -9 Z" />
          {/* Seam and the liquid line sloshing inside */}
          <path d="M68 92 h64" strokeWidth="2.2" opacity="0.7" />
        </g>
        <motion.path
          initial={false}
          d="M72 130 C 92 120, 112 142, 130 130"
          fill="none"
          stroke="var(--lamp)"
          strokeWidth="3"
          strokeLinecap="round"
          filter={ROUGH}
          animate={{
            d: [
              "M72 130 C 92 120, 112 142, 130 130",
              "M72 132 C 92 144, 112 118, 130 132",
              "M72 130 C 92 120, 112 142, 130 130",
            ],
          }}
          transition={{ duration: 0.78, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>

      {/* Stray drops */}
      <svg
        viewBox="0 0 200 230"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        style={{ color: "var(--lamp)", overflow: "visible" }}
      >
        {[
          { x: 46, y: 40, d: 0 },
          { x: 158, y: 54, d: 0.3 },
          { x: 40, y: 96, d: 0.55 },
          { x: 164, y: 104, d: 0.15 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.4"
            fill="currentColor"
            filter={ROUGH}
            animate={{
              opacity: [0, 0.9, 0],
              y: [0, 26, 40],
              x: [0, i % 2 ? 10 : -10, i % 2 ? 16 : -16],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: p.d, ease: "easeOut" }}
          />
        ))}
      </svg>
    </div>
  );
}
