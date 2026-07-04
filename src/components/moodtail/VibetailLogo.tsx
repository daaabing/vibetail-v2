import { motion } from "framer-motion";

export default function VibetailLogo({ size = 112 }: { size?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-2 rounded-full filter blur-2xl opacity-15 pulse-distill"
        style={{ backgroundColor: "var(--app-primary)" }}
      />
      <div
        className="absolute inset-8 rounded-full filter blur-xl opacity-20"
        style={{ backgroundColor: "var(--app-secondary)" }}
      />
      <svg
        className="relative z-10 opacity-90"
        style={{ width: size * 0.78, height: size * 0.78 }}
        fill="none"
        stroke="var(--app-text-secondary)"
        strokeWidth="1.2"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7 6s1.5 1 5 1 5-1 5-1" strokeDasharray="2 2" />
        <path
          stroke="var(--app-primary)"
          d="M8 9.5c2 1 4 0 6.5-.5"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="11" cy="6" fill="var(--app-accent)" r="1.5" />
      </svg>
    </motion.div>
  );
}
