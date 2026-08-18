import { motion } from "framer-motion";

/**
 * The hero stage, built from the Figma frame: the photograph runs full
 * bleed and in colour; the drawing sits over it in white. A soft darkening
 * at the top keeps the hairline nav legible, and film grain ties the
 * drawing and the photograph into one surface.
 */
export default function HeroStage({ video, poster }: { video?: string; poster?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "var(--night)" }}>
      {video ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : (
        poster && (
          <motion.img
            className="absolute inset-0 h-full w-full object-cover"
            src={poster}
            alt=""
            aria-hidden
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      )}

      {/* Film grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.1] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Legibility: a whisper of shade at top and bottom, nothing else */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40"
        style={{
          background: "linear-gradient(180deg, rgba(21,13,6,0.55) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(0deg, rgba(21,13,6,0.45) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

/**
 * The drummer, worked over the photograph. The real artwork from the file,
 * revealed with a paint-on wipe and left with a slow keep-time sway.
 */
export function Drummer({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.01, delay: 0.6 }}
    >
      {/* Paint-on reveal: an oversized mask gradient slides across the art */}
      <motion.div
        style={{
          WebkitMaskImage:
            "linear-gradient(105deg, #000 0%, #000 40%, transparent 52%, transparent 100%)",
          maskImage:
            "linear-gradient(105deg, #000 0%, #000 40%, transparent 52%, transparent 100%)",
          WebkitMaskSize: "300% 100%",
          maskSize: "300% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
        initial={{ maskPosition: "100% 0%" }}
        animate={{ maskPosition: "0% 0%" }}
        transition={{ duration: 1.7, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.img
          src="/drummer.png"
          alt=""
          aria-hidden
          draggable={false}
          style={{ width: "100%", height: "auto", display: "block" }}
          animate={{ y: [0, -7, 0], rotate: [0, -1.1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 2.4 }}
        />
      </motion.div>
    </motion.div>
  );
}
