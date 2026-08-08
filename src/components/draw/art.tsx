/**
 * The drawing book.
 *
 * Two rules keep the set feeling like one artist's hand rather than an icon
 * library. Everything is pure line — no fills, no tints, the way the Gillett
 * and Collov references work. And every mood is built around a glass, so the
 * sixteen read as a series rather than sixteen unrelated pictograms.
 */

import { Sketch, type SketchProps } from "./Sketch";

interface Art {
  /** Wider scenes carry their own frame; the default is a square. */
  box?: string;
  d: React.ReactNode;
}

/* ── Moods: a glass, and the evening around it ──────────────────────── */

const SCENE = "0 0 120 100";

const MOOD_ART: Record<string, Art> = {
  // Rain past the window, a coupe left on the sill
  rain: {
    box: SCENE,
    d: (
      <>
        <path d="M16 8 H104 V60" />
        <path d="M16 8 V60" />
        <path d="M60 8 V60 M16 34 H104" strokeWidth="1.6" />
        <path d="M26 18 l-5 13 M40 15 l-5 15 M74 17 l-5 14 M90 14 l-5 16" strokeWidth="1.6" />
        <path d="M6 60 H114" />
        <path d="M40 56 c 2 18, 34 18, 36 0 Z" />
        <path d="M58 74 V86" />
        <path d="M46 88 H70" />
      </>
    ),
  },
  // The laptop still open, a drink beside it
  laptop: {
    box: SCENE,
    d: (
      <>
        <path d="M18 24 H66 V58 H18 Z" />
        <path d="M10 58 H74 l-6 10 H16 Z" />
        <path d="M28 34 H54 M28 43 H46" strokeWidth="1.6" />
        <path d="M86 40 H110 L106 76 H90 Z" />
        <path d="M86 52 c 6 3, 18 -3, 24 0" strokeWidth="1.6" />
        <path d="M98 34 V26" strokeWidth="1.6" />
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
  // A glass knocked over, a heart with a fault line through it
  heartbreak: {
    box: SCENE,
    d: (
      <>
        <path d="M30 40 c -14 -12, 6 -30, 16 -18 c 10 -12, 30 6, 16 18 c -6 6, -12 12, -16 16 c -4 -4, -10 -10, -16 -16 Z" />
        <path d="M46 22 l-5 9 l8 5 l-6 9" strokeWidth="1.6" />
        <path d="M74 46 c 16 4, 22 26, 8 32 l-24 8 c -14 4, -22 -14, -10 -22 Z" />
        <path d="M96 72 l14 6" strokeWidth="1.6" />
        <path d="M50 92 c 14 -6, 34 -6, 48 0" strokeWidth="1.6" />
      </>
    ),
  },
  // Sun clearing the roofline, a tall glass in front of it
  sun: {
    box: SCENE,
    d: (
      <>
        <circle cx="70" cy="38" r="18" />
        <path
          d="M70 12 v-8 M70 64 v8 M44 38 h-8 M96 38 h8 M52 20 l-6 -6 M88 20 l6 -6 M52 56 l-6 6 M88 56 l6 6"
          strokeWidth="1.6"
        />
        <path d="M6 76 H114" />
        <path d="M22 32 H46 L42 76 H26 Z" />
        <path d="M22 46 c 6 3, 18 -3, 24 0" strokeWidth="1.6" />
      </>
    ),
  },
  // The phone turned over on the bar, next to a drink
  phone: {
    box: SCENE,
    d: (
      <>
        <path d="M18 52 L52 40 c 4 -2, 8 0, 9 4 l 8 22 c 2 4, 0 8, -4 9 L30 88 c -4 2, -8 0, -9 -4 L14 62 c -2 -5, 0 -8, 4 -10 Z" />
        <path d="M28 52 l24 -8" strokeWidth="1.4" />
        <path d="M78 30 c 2 18, 32 18, 34 0 Z" />
        <path d="M95 48 V66 M85 68 H105" />
        <path d="M95 14 V6 M84 18 l-6 -6" strokeWidth="1.4" />
      </>
    ),
  },
  // Sofa, blanket, a glass on the arm
  couch: {
    box: SCENE,
    d: (
      <>
        <path d="M20 56 v-10 a7 7 0 0 1 7 -7 h50 a7 7 0 0 1 7 7 v10" />
        <path d="M12 58 h82 v22 H12 Z" />
        <path d="M20 80 v8 M86 80 v8" />
        <path d="M36 58 v-19 M70 58 v-19" strokeWidth="1.6" />
        <path d="M96 40 H114 L110 62 H100 Z" />
        <path d="M96 50 c 5 2, 13 -2, 18 0" strokeWidth="1.4" />
      </>
    ),
  },
  // The cork leaves the bottle
  confetti: {
    box: SCENE,
    d: (
      <>
        <path d="M20 88 c -8 -10, -6 -34, 6 -44 l 6 -6 c 4 -4, 4 -12, 2 -16 l 14 -8 c 4 4, 10 6, 16 4 l 4 6 c 4 8, 0 16, -8 20 l -8 4 c -14 8, -24 30, -22 42 Z" />
        <path d="M62 18 l 12 -8" strokeWidth="1.8" />
        <path d="M84 12 a7 7 0 1 1 12 6 a7 7 0 0 1 -12 -6 Z" />
        <path d="M78 34 l 14 4 M84 48 l 16 -2 M74 24 l 8 -12 M100 26 l 10 -6" strokeWidth="1.6" />
        <path d="M92 56 c 2 16, 22 16, 24 0 Z" strokeWidth="1.8" />
        <path d="M104 72 V84 M96 86 H112" strokeWidth="1.8" />
      </>
    ),
  },
  // A late moon behind the glass
  moon: {
    box: SCENE,
    d: (
      <>
        <path d="M84 14 A30 30 0 1 0 84 74 A24 24 0 1 1 84 14 Z" />
        <path d="M22 26 c 2 20, 34 20, 36 0 Z" />
        <path d="M40 46 V64 M30 66 H50" />
        <path d="M14 16 l0 8 M10 20 l8 0 M100 82 l0 6 M97 85 l6 0" strokeWidth="1.5" />
      </>
    ),
  },
  // Coffee to the left, the shaker still to come
  coffee: {
    box: SCENE,
    d: (
      <>
        <path d="M16 34 H50 L45 84 H21 Z" />
        <path d="M13 34 H53" />
        <path d="M26 22 c 5 -6, -5 -10, 0 -16 M40 22 c 5 -6, -5 -10, 0 -16" strokeWidth="1.6" />
        <path d="M72 36 H106 L102 84 H76 Z" />
        <path d="M70 36 H108 V28 H70 Z" />
        <path d="M78 28 V20 h22 v8" />
        <path d="M74 54 H104" strokeWidth="1.5" />
      </>
    ),
  },
  // Something lit on top of the glass
  fire: {
    box: SCENE,
    d: (
      <>
        <path d="M60 42 C 46 34, 48 16, 60 6 C 60 16, 68 16, 66 4 C 78 12, 82 30, 70 40" />
        <path d="M60 34 c -5 -3, -5 -10, 0 -14 c 5 4, 5 11, 0 14 Z" strokeWidth="1.6" />
        <path d="M40 46 H82 L76 86 H46 Z" />
        <path d="M40 60 c 8 4, 26 -4, 36 0" strokeWidth="1.6" />
        <path d="M24 70 l-12 -6 M98 70 l12 -6" strokeWidth="1.5" />
      </>
    ),
  },
  // The thought that keeps going round, rising off the glass
  spiral: {
    box: SCENE,
    d: (
      <>
        <path d="M62 32 a4 4 0 1 1 -6 -3 a11 11 0 1 1 13 13 a19 19 0 1 1 -24 -22" />
        <path d="M42 58 H80 L75 88 H47 Z" />
        <path d="M42 70 c 8 4, 24 -4, 33 0" strokeWidth="1.6" />
      </>
    ),
  },
  // A ball turning above the coupe
  disco: {
    box: SCENE,
    d: (
      <>
        <circle cx="60" cy="28" r="18" />
        <path d="M42 28 h36 M60 10 v36 M47 15 L73 41 M73 15 L47 41" strokeWidth="1.4" />
        <path d="M60 10 V0" />
        <path d="M32 52 c 2 20, 54 20, 56 0 Z" />
        <path d="M60 72 V86 M48 88 H72" />
        <path d="M28 44 l-10 6 M92 44 l10 6" strokeWidth="1.4" />
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
        <circle cx="70" cy="40" r="26" />
        <path d="M70 24 v16 l11 7" />
        <path d="M52 16 l-7 -7 M88 16 l7 -7" strokeWidth="1.6" />
        <path d="M14 40 H44 L40 84 H18 Z" />
        <path d="M14 54 c 7 4, 22 -4, 30 0" strokeWidth="1.6" />
      </>
    ),
  },
  // The face you put on, propped against the glass
  mask: {
    box: SCENE,
    d: (
      <>
        <path d="M22 24 H74 V44 C74 60, 62 68, 48 68 C34 68, 22 60, 22 44 Z" />
        <path d="M34 40 h8 M54 40 h8" strokeWidth="2.4" />
        <path d="M40 52 c 5 5, 13 5, 18 0" strokeWidth="1.8" />
        <path d="M48 68 v22" />
        <path d="M84 44 H112 L108 86 H88 Z" />
        <path d="M84 58 c 7 4, 20 -4, 28 0" strokeWidth="1.6" />
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
  const art = ART[name] ?? ART.glass;
  return (
    <Sketch
      viewBox={art.box}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      soft={soft}
      className={className}
      style={style}
    >
      {art.d}
    </Sketch>
  );
}
