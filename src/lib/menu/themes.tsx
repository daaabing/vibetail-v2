// Static, hand-authored menu themes. NEVER generated at runtime by AI.
// A theme only skins presentation surfaces (backgrounds, decorative
// elements, CTA accent, placeholder artwork). It MUST NOT change the
// question flow, layout structure, typography hierarchy, card structure,
// or the click-to-flip interaction.

import type { CSSProperties, ReactNode } from "react";

export type MenuThemeId = "world_cup_final_2026";

export interface MenuThemeSpec {
  id: MenuThemeId;
  label: string;
  /** Background for the event landing page container. */
  landingBackground: string;
  /** Optional decorative overlay layer painted behind the landing content. */
  landingDecoration?: ReactNode;
  /** Optional decorative overlay layer painted behind the result screen. */
  resultDecoration?: ReactNode;
  /** Inline style override for the primary CTA button. */
  ctaStyle: CSSProperties;
  /** Placeholder artwork rendered in place of the default VibetailLogo. */
  Placeholder: (props: { size?: number }) => ReactNode;
  /** Optional eyebrow line rendered above the merchant name on landing. */
  eyebrow?: { en: string; zh: string };
}

// ---------- World Cup Final 2026 ----------

function SoccerBallPlaceholder({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="img"
      aria-label="World Cup Final 2026"
    >
      <defs>
        <radialGradient id="wcf-pitch" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#F8F5EC" />
          <stop offset="60%" stopColor="#D9E4CE" />
          <stop offset="100%" stopColor="#7B9E6B" />
        </radialGradient>
        <linearGradient id="wcf-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4D07A" />
          <stop offset="100%" stopColor="#B98A2E" />
        </linearGradient>
      </defs>
      {/* pitch halo */}
      <circle cx="80" cy="80" r="76" fill="url(#wcf-pitch)" opacity="0.55" />
      {/* ball */}
      <circle cx="80" cy="80" r="52" fill="#FBFAF6" stroke="#1B1B1B" strokeWidth="2" />
      {/* pentagon centers — classic ball pattern, simplified */}
      <g fill="#1B1B1B">
        <polygon points="80,54 92,63 87,77 73,77 68,63" />
        <polygon points="52,84 62,80 68,90 62,99 52,95" />
        <polygon points="108,84 98,80 92,90 98,99 108,95" />
        <polygon points="68,110 80,105 92,110 88,120 72,120" />
      </g>
      {/* connecting seams */}
      <g fill="none" stroke="#1B1B1B" strokeWidth="1.6" strokeLinecap="round">
        <path d="M80,54 L80,42" />
        <path d="M68,63 L54,58" />
        <path d="M92,63 L106,58" />
        <path d="M52,84 L38,88" />
        <path d="M108,84 L122,88" />
        <path d="M72,120 L64,132" />
        <path d="M88,120 L96,132" />
      </g>
      {/* gold star arc */}
      <path
        d="M 22,80 A 58,58 0 0 1 138,80"
        fill="none"
        stroke="url(#wcf-gold)"
        strokeWidth="3"
        opacity="0.85"
      />
      <text
        x="80"
        y="152"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="11"
        letterSpacing="3"
        fill="#B98A2E"
      >
        FINAL · 2026
      </text>
    </svg>
  );
}

function WorldCupLandingDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* pitch stripes */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%] opacity-[0.18]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #6E9A5C 0 40px, #7BAA68 40px 80px)",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,0.9), transparent 90%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,0.9), transparent 90%)",
        }}
      />
      {/* stadium light bloom */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-[60%] opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(244,208,122,0.55) 0%, transparent 65%)",
          filter: "blur(30px)",
        }}
      />
      {/* gold confetti dots */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 18 }).map((_, i) => {
          const x = (i * 137) % 400;
          const y = (i * 211) % 800;
          const r = 1.5 + ((i * 7) % 3);
          return <circle key={i} cx={x} cy={y} r={r} fill="#F4D07A" opacity={0.5} />;
        })}
      </svg>
    </div>
  );
}

function WorldCupResultDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(244,208,122,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(110,154,92,0.22) 0%, transparent 55%)",
        }}
      />
    </div>
  );
}

const WORLD_CUP_FINAL_2026: MenuThemeSpec = {
  id: "world_cup_final_2026",
  label: "World Cup Final 2026",
  landingBackground:
    "linear-gradient(180deg, #0E1A14 0%, #14261C 45%, #1F3A28 100%)",
  landingDecoration: <WorldCupLandingDecoration />,
  resultDecoration: <WorldCupResultDecoration />,
  ctaStyle: {
    background: "linear-gradient(135deg, #F4D07A 0%, #E1B14E 55%, #B98A2E 100%)",
    color: "#1B1B1B",
    border: "1px solid rgba(255,255,255,0.35)",
    boxShadow:
      "0 12px 30px -6px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.45)",
  },
  Placeholder: SoccerBallPlaceholder,
  eyebrow: { en: "Match Night · 2026 Final", zh: "决赛之夜 · 2026 世界杯" },
};

// ---------- registry ----------

const THEMES: Record<MenuThemeId, MenuThemeSpec> = {
  world_cup_final_2026: WORLD_CUP_FINAL_2026,
};

export const AVAILABLE_THEMES: { id: MenuThemeId; label: string }[] = [
  { id: "world_cup_final_2026", label: "World Cup Final 2026" },
];

export function getMenuTheme(id: string | null | undefined): MenuThemeSpec | null {
  if (!id) return null;
  return (THEMES as Record<string, MenuThemeSpec | undefined>)[id] ?? null;
}
