/**
 * The drawing book.
 *
 * Two rules keep the set feeling like one artist's hand rather than an icon
 * library. Everything is pure line — no fills, no tints, the way the Gillett
 * and Collov references work. And every mood is built around a glass, so the
 * sixteen read as a series rather than sixteen unrelated pictograms.
 */

import { Sketch, type SketchProps } from "./Sketch.js";

interface Art {
  /** Wider scenes carry their own frame; the default is a square. */
  box?: string;
  d: React.ReactNode;
}

/* ── Moods: a glass, and the evening around it ──────────────────────── */

const SCENE = "0 0 120 100";

const MOOD_ART: Record<string, Art> = {
  // A rain cloud, mid-downpour
  rain: {
    box: SCENE,
    d: (
      <>
        <path d="M30 48 h58 a11 11 0 0 0 3 -22 a17 17 0 0 0 -33 -9 a15 15 0 0 0 -27 12 a10 10 0 0 0 -1 19 Z" />
        <path d="M38 60 l-6 16 M56 60 l-6 16 M74 60 l-6 16 M90 58 l-6 16" strokeWidth="1.8" />
      </>
    ),
  },
  // Just the laptop, still open
  laptop: {
    box: SCENE,
    d: (
      <>
        <path d="M28 22 H92 V62 H28 Z" />
        <path d="M18 62 H102 L94 76 H26 Z" />
        <path d="M40 36 H80 M40 46 H68" strokeWidth="1.6" />
      </>
    ),
  },
  // Three glasses meeting
  party: {
    box: SCENE,
    d: (
      <>
        <path d="M14 30 c 2 20, 34 20, 36 0 Z" />
        <path d="M32 50 V66 M22 68 H42" />
        <path d="M70 30 c 2 20, 34 20, 36 0 Z" />
        <path d="M88 50 V66 M78 68 H98" />
        <path d="M42 44 c 8 18, 28 18, 36 0 Z" strokeWidth="1.8" />
        <path d="M60 58 V78 M50 80 H70" strokeWidth="1.8" />
        <path d="M60 12 V2 M40 16 l-8 -8 M80 16 l8 -8" strokeWidth="1.6" />
      </>
    ),
  },
  // A broken heart, nothing else
  heartbreak: {
    box: SCENE,
    d: (
      <>
        <path d="M60 84 C 42 68, 22 52, 22 34 C 22 18, 40 12, 52 22 L60 30 L68 22 C 80 12, 98 18, 98 34 C 98 52, 78 68, 60 84 Z" />
        <path d="M60 30 l-7 12 l10 8 l-8 12 l6 9" strokeWidth="1.8" />
      </>
    ),
  },
  // Friday's sun
  sun: {
    box: SCENE,
    d: (
      <>
        <circle cx="60" cy="46" r="22" />
        <path
          d="M60 14 v-10 M60 78 v10 M28 46 h-10 M92 46 h10 M38 24 l-8 -8 M82 24 l8 -8 M38 68 l-8 8 M82 68 l8 8"
          strokeWidth="1.6"
        />
      </>
    ),
  },
  // The reply that hasn't come — a message bubble, typing
  phone: {
    box: SCENE,
    d: (
      <>
        <path d="M38 22 h44 a14 14 0 0 1 14 14 v14 a14 14 0 0 1 -14 14 H56 l-16 16 v-16 h-2 a14 14 0 0 1 -14 -14 v-14 a14 14 0 0 1 14 -14 Z" />
        <circle cx="46" cy="43" r="3" strokeWidth="1.8" />
        <circle cx="60" cy="43" r="3" strokeWidth="1.8" />
        <circle cx="74" cy="43" r="3" strokeWidth="1.8" />
      </>
    ),
  },
  // Just the couch
  couch: {
    box: SCENE,
    d: (
      <>
        <path d="M24 54 v-12 a8 8 0 0 1 8 -8 h56 a8 8 0 0 1 8 8 v12" />
        <path d="M14 56 h92 v24 H14 Z" />
        <path d="M24 80 v8 M96 80 v8" />
        <path d="M44 56 v-20 M76 56 v-20" strokeWidth="1.6" />
      </>
    ),
  },
  // A party popper going off
  confetti: {
    box: SCENE,
    d: (
      <>
        <path d="M26 88 L52 50 L74 70 Z" />
        <path d="M40 76 L60 60" strokeWidth="1.4" />
        <path d="M60 42 l8 -14 M72 50 l14 -8 M80 62 l16 -2" strokeWidth="1.8" />
        <circle cx="74" cy="20" r="3" strokeWidth="1.6" />
        <circle cx="94" cy="36" r="3" strokeWidth="1.6" />
        <circle cx="100" cy="56" r="2.5" strokeWidth="1.6" />
        <path d="M52 34 c 6 -10, 16 -8, 18 0" strokeWidth="1.5" />
      </>
    ),
  },
  // A late crescent
  moon: {
    box: SCENE,
    d: (
      <>
        <path d="M74 10 A34 34 0 1 0 74 78 A27 27 0 1 1 74 10 Z" />
        <path d="M28 22 v8 M24 26 h8 M94 64 v6 M91 67 h6" strokeWidth="1.6" />
      </>
    ),
  },
  // One coffee too many
  coffee: {
    box: SCENE,
    d: (
      <>
        <path d="M38 36 H82 L77 88 H43 Z" />
        <path d="M34 36 H86" />
        <path d="M52 26 c 5 -6, -5 -10, 0 -16 M68 26 c 5 -6, -5 -10, 0 -16" strokeWidth="1.6" />
      </>
    ),
  },
  // A single flame
  fire: {
    box: SCENE,
    d: (
      <>
        <path d="M60 88 C 38 78, 33 54, 47 36 C 51 48, 60 50, 58 34 C 56 20, 66 12, 72 6 C 70 18, 82 24, 84 40 C 88 62, 80 80, 60 88 Z" />
        <path d="M60 74 c -8 -6, -8 -18, 0 -26 c 8 8, 8 20, 0 26 Z" strokeWidth="1.6" />
      </>
    ),
  },
  // The brain that won't stop
  spiral: {
    box: SCENE,
    d: (
      <>
        <path d="M60 14 C 46 6, 28 14, 26 30 C 14 34, 14 52, 24 58 C 22 72, 36 82, 50 78 C 56 86, 70 86, 76 78 C 90 82, 102 70, 98 56 C 108 48, 104 30, 92 26 C 90 12, 72 6, 60 14 Z" />
        <path d="M60 14 V 82" strokeWidth="1.6" />
        <path d="M42 32 c 8 0, 10 8, 4 12 M78 34 c -8 2, -8 10, -2 12 M38 54 c 8 -2, 12 4, 8 10 M82 56 c -8 0, -10 8, -4 12" strokeWidth="1.4" />
      </>
    ),
  },
  // The disco ball
  disco: {
    box: SCENE,
    d: (
      <>
        <path d="M60 2 V12" />
        <circle cx="60" cy="46" r="32" />
        <path d="M28 46 h64 M60 14 v64" strokeWidth="1.4" />
        <path d="M36 26 a46 46 0 0 0 48 0 M36 66 a46 46 0 0 1 48 0" strokeWidth="1.4" />
        <path d="M44 17 c -8 18, -8 40, 0 58 M76 17 c 8 18, 8 40, 0 58" strokeWidth="1.4" />
        <path d="M100 18 v8 M96 22 h8" strokeWidth="1.6" />
      </>
    ),
  },
  // Something green in the glass
  plant: {
    box: SCENE,
    d: (
      <>
        <path d="M44 44 H78 L73 88 H49 Z" />
        <path d="M44 58 c 8 4, 24 -4, 33 0" strokeWidth="1.6" />
        <path d="M62 44 V10" />
        <path d="M62 26 c -13 0, -17 -9, -17 -15 c 11 -2, 17 6, 17 15 Z" />
        <path d="M62 20 c 13 0, 17 -9, 17 -17 c -11 -2, -17 8, -17 17 Z" />
      </>
    ),
  },
  // Two in the morning
  clock: {
    box: SCENE,
    d: (
      <>
        <circle cx="60" cy="48" r="30" />
        <path d="M60 30 v18 l13 8" />
        <path d="M38 22 l-8 -8 M82 22 l8 -8" strokeWidth="1.6" />
      </>
    ),
  },
  // The face you put on
  mask: {
    box: SCENE,
    d: (
      <>
        <path d="M34 18 H86 V44 C86 62, 74 72, 60 72 C46 72, 34 62, 34 44 Z" />
        <path d="M46 38 h8 M66 38 h8" strokeWidth="2.4" />
        <path d="M50 52 c 5 5, 15 5, 20 0" strokeWidth="1.8" />
        <path d="M60 72 v20" />
      </>
    ),
  },
};

/* ── Taste poles ────────────────────────────────────────────────────── */

const TASTE_ART: Record<string, Art> = {
  lemon: {
    d: (
      <>
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="23" strokeWidth="1.6" />
        <path
          d="M50 50 L50 27 M50 50 L66 34 M50 50 L73 50 M50 50 L66 66 M50 50 L50 73 M50 50 L34 66 M50 50 L27 50 M50 50 L34 34"
          strokeWidth="1.5"
        />
      </>
    ),
  },
  barrel: {
    d: (
      <>
        <path d="M30 22 H70 C79 40, 79 60, 70 78 H30 C21 60, 21 40, 30 22 Z" />
        <path d="M21 40 H79 M21 60 H79" strokeWidth="1.8" />
        <path d="M44 22 C 42 42, 42 58, 44 78 M58 22 C 60 42, 60 58, 58 78" strokeWidth="1.4" />
      </>
    ),
  },
  feather: {
    d: (
      <>
        <path d="M26 82 C 36 40, 56 18, 80 16 C 80 46, 62 72, 32 78" />
        <path d="M34 72 L76 24" strokeWidth="1.6" />
        <path d="M44 66 L48 46 M54 58 L59 38 M63 48 L68 30" strokeWidth="1.3" />
      </>
    ),
  },
  chili: {
    d: (
      <>
        <path d="M62 26 C 77 42, 72 70, 50 80 C 33 86, 22 74, 29 63 C 38 70, 52 66, 56 51 C 60 39, 58 32, 62 26 Z" />
        <path d="M62 26 c -6 -9, 3 -13, 9 -11 c -2 7, 2 9, 7 7" strokeWidth="1.8" />
      </>
    ),
  },
  home: {
    d: (
      <>
        <path d="M18 48 L50 20 L82 48" />
        <path d="M27 45 V82 H73 V45" />
        <path d="M42 82 V60 H58 V82" strokeWidth="1.8" />
      </>
    ),
  },
  dice: {
    d: (
      <>
        <path d="M32 28 H68 a4 4 0 0 1 4 4 V68 a4 4 0 0 1 -4 4 H32 a4 4 0 0 1 -4 -4 V32 a4 4 0 0 1 4 -4 Z" />
        <circle cx="40" cy="40" r="2.4" />
        <circle cx="60" cy="40" r="2.4" />
        <circle cx="50" cy="50" r="2.4" />
        <circle cx="40" cy="60" r="2.4" />
        <circle cx="60" cy="60" r="2.4" />
        <path d="M79 21 l8 -6 M81 40 l10 2" strokeWidth="1.6" />
      </>
    ),
  },
};

/* ── The shelf ──────────────────────────────────────────────────────── */

const SPIRIT_ART: Record<string, Art> = {
  gin: {
    d: (
      <>
        <path d="M42 26 V14 h16 v12" />
        <path d="M32 44 C 32 36, 42 34, 42 26 H58 C58 34, 68 36, 68 44 V84 a4 4 0 0 1 -4 4 H36 a4 4 0 0 1 -4 -4 Z" />
        <path d="M36 54 H64 M36 68 H64" strokeWidth="1.5" />
      </>
    ),
  },
  vodka: {
    d: (
      <>
        <path d="M44 40 V14 h12 v26" />
        <path d="M36 40 H64 V84 a4 4 0 0 1 -4 4 H40 a4 4 0 0 1 -4 -4 Z" />
        <path d="M36 54 H64" strokeWidth="1.5" />
      </>
    ),
  },
  rum: {
    d: (
      <>
        <path d="M44 32 V14 h12 v18" />
        <path d="M34 52 C 34 42, 44 40, 44 32 H56 C56 40, 66 42, 66 52 C 72 62, 70 84, 60 88 H40 C 30 84, 28 62, 34 52 Z" />
        <path d="M36 62 H64" strokeWidth="1.5" />
      </>
    ),
  },
  tequila: {
    d: (
      <>
        <path d="M46 46 V12 h8 v34" />
        <path d="M40 46 H60 V86 a2 2 0 0 1 -2 2 H42 a2 2 0 0 1 -2 -2 Z" />
        <path d="M40 60 H60" strokeWidth="1.5" />
      </>
    ),
  },
  whiskey: {
    d: (
      <>
        <path d="M44 46 V20 h12 v26" />
        <path d="M32 46 H68 V84 a4 4 0 0 1 -4 4 H36 a4 4 0 0 1 -4 -4 Z" />
        <path d="M40 58 H60 M40 70 H60" strokeWidth="1.5" />
      </>
    ),
  },
  mezcal: {
    d: (
      <>
        <path d="M46 42 V12 h8 v30" />
        <path d="M50 88 C 32 88, 28 70, 34 58 C 38 50, 46 50, 46 42 H54 C54 50, 62 50, 66 58 C 72 70, 68 88, 50 88 Z" />
        <path d="M40 70 c 6 -4, 14 -4, 20 0" strokeWidth="1.5" />
      </>
    ),
  },
  brandy: {
    d: (
      <>
        <path d="M42 38 V18 h16 v20" />
        <path d="M30 56 C 30 46, 42 46, 42 38 H58 C58 46, 70 46, 70 56 V82 a6 6 0 0 1 -6 6 H36 a6 6 0 0 1 -6 -6 Z" />
        <path d="M36 66 H64" strokeWidth="1.5" />
      </>
    ),
  },
  sake: {
    d: (
      <>
        <path d="M44 28 V18 h12 v10" />
        <path d="M36 44 C 36 36, 44 36, 44 28 H56 C56 36, 64 36, 64 44 V80 a4 4 0 0 1 -4 4 H40 a4 4 0 0 1 -4 -4 Z" />
        <path d="M70 68 H90 L86 82 H74 Z" />
      </>
    ),
  },
  tashi: {
    d: (
      <>
        <path d="M42 40 V24 h16 v16" />
        <path d="M36 40 H64 C70 54, 70 74, 64 86 H36 C30 74, 30 54, 36 40 Z" />
        <path d="M64 50 c 10 2, 10 18, 0 20" />
        <path d="M40 62 H58" strokeWidth="1.5" />
      </>
    ),
  },
  nonalcoholic: {
    d: (
      <>
        <path d="M34 34 H66 L62 84 H38 Z" />
        <path d="M36 52 c 8 4, 18 -4, 26 0" strokeWidth="1.6" />
        <path d="M62 30 a9 9 0 1 0 0.1 0 M62 21 v18 M53 30 h18" strokeWidth="1.5" />
      </>
    ),
  },
};

/* ── Odds and ends ──────────────────────────────────────────────────── */

const MISC_ART: Record<string, Art> = {
  glass: {
    d: (
      <>
        <path d="M22 26 c 4 -6, 52 -6, 56 0 L54 54 V78 H46 V54 Z" />
        <path d="M32 80 H68" />
        <path d="M62 34 a7 7 0 1 0 0.1 0" strokeWidth="1.5" />
      </>
    ),
  },
  // The long pour — a tall glass over ice, straw still going. Drawn wide
  // (glass left, straw reaching right) so it fills its frame like the rest
  // of the book instead of floating in the middle.
  highball: {
    d: (
      <>
        <path d="M18 14 H50 V82 a4 4 0 0 1 -4 4 H22 a4 4 0 0 1 -4 -4 Z" />
        <path d="M22 32 c 8 4, 20 -4, 28 0" strokeWidth="1.6" />
        <path d="M26 42 l10 -4 l4 9 l-10 4 Z M32 60 l9 3 l-3 9 l-9 -3 Z" strokeWidth="1.5" />
        <path d="M34 46 L70 12 l10 -4" strokeWidth="1.8" />
      </>
    ),
  },
  // The short pour — a stemmed coupe with a cherry on the pick
  coupe: {
    d: (
      <>
        <path d="M30 22 C 30 44, 38 52, 50 52 C 62 52, 70 44, 70 22 Z" />
        <path d="M34 32 c 10 4, 22 4, 32 0" strokeWidth="1.6" />
        <path d="M50 52 V78" />
        <path d="M36 80 H64" />
        <path d="M58 34 L78 14" strokeWidth="1.8" />
        <circle cx="81" cy="11" r="3" strokeWidth="1.6" />
      </>
    ),
  },
  shaker: {
    d: (
      <>
        <path d="M34 34 H66 L62 84 H38 Z" />
        <path d="M32 34 H68 V26 H32 Z" />
        <path d="M38 26 V18 h24 v8" />
        <path d="M36 56 H64" strokeWidth="1.5" />
      </>
    ),
  },
  pen: {
    d: (
      <>
        <path d="M22 78 L64 24 l10 8 L34 86 Z" />
        <path d="M22 78 l12 8" />
        <path d="M64 24 l6 -8 l12 10 l-8 6" />
      </>
    ),
  },
  qr: {
    d: (
      <>
        <path d="M22 22 h20 v20 h-20 Z M58 22 h20 v20 h-20 Z M22 58 h20 v20 h-20 Z" />
        <path
          d="M58 58 h8 v8 h-8 Z M70 58 h8 v8 h-8 Z M58 70 h8 v8 h-8 Z M70 70 h8 v8 h-8 Z"
          strokeWidth="1.6"
        />
      </>
    ),
  },
  card: {
    d: (
      <>
        <path d="M24 20 h52 v60 h-52 Z" />
        <path d="M34 32 h32 M34 42 h24 M34 66 h20" strokeWidth="1.6" />
        <circle cx="50" cy="54" r="6" strokeWidth="1.6" />
      </>
    ),
  },
  menu: {
    d: (
      <>
        <path d="M26 16 h48 v68 h-48 Z" />
        <path d="M36 30 h28 M36 42 h28 M36 54 h20 M36 66 h24" strokeWidth="1.6" />
      </>
    ),
  },
  ear: {
    d: (
      <>
        <path d="M36 84 C 32 66, 30 54, 32 42 a18 18 0 0 1 36 2 c 0 12, -14 12, -14 22 c 0 8, -8 10, -12 6" />
        <path d="M44 40 a8 8 0 0 1 12 4" strokeWidth="1.6" />
      </>
    ),
  },
};

export const ART: Record<string, Art> = {
  ...MOOD_ART,
  ...TASTE_ART,
  ...SPIRIT_ART,
  ...MISC_ART,
};

export type ArtName = keyof typeof ART;

/**
 * Render one drawing from the book. `wash` is accepted and ignored — the set
 * is pure line now, and emphasis is carried by the layout around it.
 */
export default function Draw({
  name,
  size = "100%",
  color,
  strokeWidth = 2.4,
  soft,
  className,
  style,
}: Omit<SketchProps, "viewBox"> & { name: string; wash?: string }) {
  const art = ART[name] ?? ART.glass!;
  return (
    <Sketch
      {...(art.box ? { viewBox: art.box } : {})}
      size={size}
      {...(color !== undefined ? { color } : {})}
      strokeWidth={strokeWidth}
      {...(soft !== undefined ? { soft } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
    >
      {art.d}
    </Sketch>
  );
}
