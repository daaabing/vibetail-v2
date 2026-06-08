import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: 9999, backgroundColor: "#fff" }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-32 h-32 flex items-center justify-center"
          >
            <div className="absolute inset-2 rounded-full filter blur-2xl opacity-30 pulse-distill"
              style={{ backgroundColor: "var(--app-primary)" }} />
            <svg className="w-24 h-24 relative z-10" fill="none" stroke="var(--app-text-secondary)" strokeWidth="1.2" viewBox="0 0 24 24">
              <path d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5h14" strokeLinecap="round" />
              <path stroke="var(--app-primary)" d="M8 9.5c2 1 4 0 6.5-.5" strokeLinecap="round" strokeWidth="2" />
              <circle cx="11" cy="5.4" r="1.6" fill="var(--app-primary)" stroke="none" />
              <path d="M11 5.4 Q 12 3.4 13.2 2.8" stroke="var(--app-secondary)" strokeWidth="1" strokeLinecap="round" fill="none" />
            </svg>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-5 text-2xl font-semibold tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--app-primary)" }}
          >
            Vibetail
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
