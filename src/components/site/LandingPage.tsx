import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import { useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";

import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import GuestList from "./GuestList";
import HeroStage, { Drummer } from "@/components/draw/HeroStage";
import {
  BRAND,
  FAQ,
  HERO,
  HERO_MEDIA,
  HOW,
  SPECIMENS,
  VENUES,
  WHAT,
  pick,
} from "./landing-content";

/** Section opener: a gilt eyebrow with a gold hairline trailing off it,
    then the didone statement. Gold speaks first, quietly; ink does the talking. */
function SectionHead({
  eyebrow,
  title,
  sub,
  ink = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  ink?: boolean;
}) {
  return (
    <>
      <div className="mb-6 flex items-center gap-5">
        <span className="eyebrow-gilt" style={ink ? { color: "var(--gold-bright)" } : undefined}>
          {eyebrow}
        </span>
        <span
          className="rule-gilt-solid flex-1"
          aria-hidden
          style={{
            background: ink
              ? "linear-gradient(90deg, rgba(201,162,92,0.6) 0%, transparent 100%)"
              : "linear-gradient(90deg, var(--gold-line) 0%, transparent 100%)",
          }}
        />
      </div>
      <h2
        className="hand text-[clamp(30px,3.4vw,50px)]"
        style={ink ? { color: "var(--paper)" } : undefined}
      >
        {title}
      </h2>
      {sub && (
        <p
          className="note mt-4 max-w-2xl text-[16.5px]"
          style={{ color: ink ? "rgba(242,237,225,0.72)" : "var(--ink-soft)" }}
        >
          {sub}
        </p>
      )}
    </>
  );
}

/** The one italic word inside a didone statement — set in garamond, gilded. */
function Gilt({ children }: { children: React.ReactNode }) {
  return (
    <em className="accent-italic" style={{ color: "var(--gold)" }}>
      {children}
    </em>
  );
}

/** The house-style cards, dealt one at a time — flips to the next every 3s. */
const HOUSE_CARDS = [
  { src: "/brand/tile-martini.jpg", alt: "A martini with a guest draped over the rim" },
  { src: "/brand/tile-dancers.jpg", alt: "An iced highball with dancers drawn around it" },
  { src: "/brand/tile-champagne.jpg", alt: "A champagne coupe with a party drawn in it" },
  { src: "/brand/tile-oldfashioned.jpg", alt: "An old fashioned with a drawn companion" },
  { src: "/brand/tile-gintonic.jpg", alt: "A gin and tonic held by a drawn hand" },
  { src: "/brand/tile-beer.jpg", alt: "A beer opened beside a drawn face" },
];

function RotatingHouseCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HOUSE_CARDS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="frame-gilt relative mx-auto w-full max-w-[440px] overflow-hidden"
      style={{ aspectRatio: "3/4", background: "var(--night)" }}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={HOUSE_CARDS[idx].src}
          src={HOUSE_CARDS[idx].src}
          alt={HOUSE_CARDS[idx].alt}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-between px-5 pb-4">
        <span className="mono-sm" style={{ color: "rgba(244,243,240,0.85)" }}>
          {`No. ${String(idx + 1).padStart(2, "0")} / ${String(HOUSE_CARDS.length).padStart(2, "0")}`}
        </span>
        <span className="signature text-[20px]" style={{ color: "rgba(244,243,240,0.85)" }}>
          Vibetail
        </span>
      </div>
    </div>
  );
}


export default function LandingPage({ onMix }: { onMix?: () => void }) {
  const navigate = useNavigate();
  const { lang } = useLang();

  // The hero plays in two acts: the drawing takes the stage alone, holds,
  // then hands the room to the words. They never share the frame.
  const [heroAct, setHeroAct] = useState<"drawing" | "words">("drawing");

  useEffect(() => {
    track("landing_opened");
    const t = setTimeout(() => setHeroAct("words"), 3600);
    return () => clearTimeout(t);
  }, []);

  const startMixing = () => {
    track("landing_cta_clicked");
    if (onMix) onMix();
    else navigate({ to: "/mood-input" });
  };

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{ background: "var(--paper)" }}>
      <SiteNav onMix={startMixing} />

      {/* ══════════════ HERO — the Figma frame, faithfully ══════════════
          The photograph and the drummer carry it. The nav is the only type. */}
      <section className="relative flex min-h-svh flex-col overflow-hidden">
        <HeroStage video={HERO_MEDIA.video} poster={HERO_MEDIA.poster} />

        {/* Act I — the drummer alone */}
        <AnimatePresence>
          {heroAct === "drawing" && (
            <motion.div
              key="drawing"
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              exit={{ opacity: 0, y: -24, scale: 0.97 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <Drummer className="w-[min(44vw,430px)] max-w-[74vw] pt-[4vh]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Act II — the words take the stage */}
        {heroAct === "words" && (
          <motion.div
            className="on-dark shell absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-end justify-between gap-x-10 gap-y-8 pb-12"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-3xl">
              <h1
                className="hand text-[clamp(34px,4.2vw,64px)]"
                style={{ color: "rgba(246,245,242,0.97)" }}
              >
                <em className="accent-italic" style={{ color: "rgba(246,245,242,0.97)" }}>
                  Meet the drink
                </em>
                {" you didn't know how to "}
                <em className="accent-italic" style={{ color: "rgba(246,245,242,0.97)" }}>
                  order
                </em>
              </h1>
              <p
                className="mt-6 max-w-md"
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 400,
                  fontSize: 14.5,
                  lineHeight: 1.75,
                  color: "rgba(246,245,242,0.78)",
                }}
              >
                {pick(HERO.sub)}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <button
                  className="btn"
                  onClick={startMixing}
                  style={{
                    background: "#d9d3c4",
                    color: "#14140f",
                    borderColor: "#d9d3c4",
                    padding: "1.15rem 2.5rem",
                  }}
                >
                  {pick(HERO.primaryCta, lang)}
                </button>
                <span className="scrawl-sm" style={{ color: "rgba(246,245,242,0.6)" }}>
                  {pick(HERO.note, lang)}
                </span>
              </div>
            </div>
            <motion.span
              aria-hidden
              style={{ color: "rgba(244,243,240,0.7)", fontSize: 18 }}
              animate={{ y: [0, 6, 0], opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              ↓
            </motion.span>
          </motion.div>
        )}
      </section>


      {/* ══════════════ WHAT IT IS ══════════════ */}
      <section id="what" className="section" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="shell">
          <SectionHead
            eyebrow={pick(WHAT.eyebrow, lang)}
            title={
              <>
                {"A bartender that "}
                <Gilt>listens</Gilt>
                {" before it pours."}
              </>
            }
            sub={pick(WHAT.body, lang)}
          />

          <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT.points.map((p) => (
              <div key={p.no} style={{ borderTop: "1px solid var(--line)" }} className="pt-7">
                <span className="specimen-no">{p.no.toUpperCase()}</span>
                <h3 className="hand mt-6 text-[clamp(19px,1.7vw,24px)] leading-tight">
                  {pick(p.title, lang)}
                </h3>
                <p className="note mt-3 text-[15px]">{pick(p.body, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS — after hours ══════════════ */}
      <section id="how" className="panel-ink relative overflow-hidden">
        <div className="grain-layer" aria-hidden style={{ opacity: 0.16 }} />
        <div className="shell section relative">
          <SectionHead
            eyebrow={pick(HOW.eyebrow, lang)}
            title={
              <>
                {"Five screens. "}
                <Gilt>One question</Gilt>
                {" each."}
              </>
            }
            sub={pick(HOW.sub, lang)}
            ink
          />

          <ol className="mt-14">
            {HOW.steps.map((st, i) => (
              <li
                key={st.no}
                className="grid grid-cols-[46px_1fr] items-baseline gap-x-6 gap-y-2 py-7 md:grid-cols-[70px_240px_1fr_84px] md:items-center md:gap-x-10"
                style={{
                  borderTop: "1px solid rgba(242,237,225,0.14)",
                  ...(i === HOW.steps.length - 1
                    ? { borderBottom: "1px solid rgba(242,237,225,0.14)" }
                    : {}),
                }}
              >
                <span
                  className="hand-light text-[clamp(22px,2.2vw,30px)] leading-none"
                  style={{ color: "rgba(244,243,240,0.5)" }}
                >
                  {st.no}
                </span>
                <h3
                  className="hand text-[clamp(20px,1.9vw,26px)] leading-tight"
                  style={{ color: "var(--paper)" }}
                >
                  {pick(st.title, lang)}
                </h3>
                <p
                  className="note col-span-2 max-w-md text-[16px] md:col-span-1"
                  style={{ color: "rgba(244,243,240,0.62)" }}
                >
                  {pick(st.body, lang)}
                </p>
                <span
                  className="mono-sm col-span-2 justify-self-start md:col-span-1 md:justify-self-end"
                  style={{ color: "rgba(244,243,240,0.4)" }}
                >
                  {i === 0 ? "required" : "optional"}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-11 flex flex-wrap items-center gap-6">
            <button className="btn btn-gilt-solid !px-9 !py-4" onClick={startMixing}>
              {"Start at step one"}
            </button>
            <span className="scrawl-sm" style={{ color: "rgba(242,237,225,0.5)" }}>
              {pick(HERO.note, lang)}
            </span>
          </div>
        </div>
      </section>

 {/* ══════════════ THE CARD — the specimen ══════════════ */}
      <section
        id="specimens"
        className="section"
        style={{ background: "var(--paper-warm)", borderTop: "1px solid var(--line)" }}
      >
        <div className="shell">
          <SectionHead
            eyebrow={"( 03 ) The card"}
            title={
              <>
                {"Every pour gets "}
                <Gilt>written down</Gilt>
                {"."}
              </>
            }
            sub={
              "The result isn't a recommendation, it's a note on the wall: one line, a picture of your drink, the recipe, and a name."
            }
          />

          <div className="mt-16 grid items-start gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* The house cards, dealt one at a time */}
            <RotatingHouseCard />

            {/* The rest of the night's ledger, as lines — not more cards */}
            <div className="lg:pt-4">
              {SPECIMENS.slice(1).map((sp, i) => (
                <div
                  key={sp.no}
                  className="py-7"
                  style={{
                    borderTop: "1px solid var(--line)",
                    ...(i === SPECIMENS.length - 2
                      ? { borderBottom: "1px solid var(--line)" }
                      : {}),
                  }}
                >
                  <div className="flex items-baseline gap-5">
                    <span className="specimen-no">No. {sp.no}</span>
                    <h3 className="hand text-[clamp(19px,1.7vw,24px)] leading-tight">
                      {pick(sp.name, lang)}
                    </h3>
                  </div>
                  <p className="accent-italic mt-2 text-[17px]" style={{ color: "var(--ink-mute)" }}>
                    &ldquo;{pick(sp.mood, lang)}&rdquo;
                  </p>
                </div>
              ))}
              <p className="note mt-8 max-w-md text-[16px]">
                {
                  "Each card carries the name, the recipe, the tasting note, and one honest line about the night that ordered it. Print it, or file it in your Vibe Bar."
                }
              </p>
              <button className="btn btn-outline mt-7" onClick={startMixing}>
                {"Write mine"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FOR VENUES ══════════════ */}
      <section id="venues" className="section" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="shell">
          <SectionHead
            eyebrow={pick(VENUES.eyebrow, lang)}
            title={
              <>
                {"Put "}
                <Gilt>your own menu</Gilt>
                {" behind the vibe."}
              </>
            }
            sub={pick(VENUES.body, lang)}
          />

          {/* What the venue actually gets — three claims, each explained */}
          <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                no: "01",
                title: "Guests decide faster",
                body: "No more staring at a list of names nobody recognises. A guest says what they're in the mood for and gets one confident answer from your list — so the table orders sooner and the bar keeps moving.",
              },
              {
                no: "02",
                title: "Ordering and payment included",
                body: "The match, the reason it fits and the checkout all happen in one flow on the guest's own phone. Nothing to install, no account, and no extra device behind the bar.",
              },
              {
                no: "03",
                title: "Printed cards drive recall",
                body: "Every guest leaves with a personalised card of the drink they had, watermarked with your venue — the kind of thing that gets photographed, kept, and brought back by a friend.",
              },
            ].map((f) => (
              <div key={f.no} className="pt-7" style={{ borderTop: "1px solid var(--line-strong)" }}>
                <span className="specimen-no">{f.no}</span>
                <h3 className="hand mt-5 text-[clamp(21px,1.9vw,26px)] leading-tight">{f.title}</h3>
                <p className="note mt-3 text-[15px]">{f.body}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-5 pt-8"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <a
              className="btn btn-solid"
              href={`mailto:${BRAND.email}?subject=Vibetail%20for%20our%20menu`}
            >
              {"Book a walkthrough"}
            </a>
            <a className="link-ul note text-[15px]" href={`mailto:${BRAND.email}`}>
              {BRAND.email}
            </a>
            <span className="accent-italic ml-auto text-[20px]" style={{ color: "var(--ink-mute)" }}>
              simple menus can go live in about 30 minutes
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section
        id="faq"
        className="section"
        style={{ background: "var(--paper-warm)", borderTop: "1.5px solid var(--line)" }}
      >
        <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead eyebrow={"( 05 ) FAQ"} title={"Things you might ask."} />
          </div>
          <div>
            {FAQ.map((f, i) => (
              <FaqRow key={i} q={pick(f.q, lang)} a={pick(f.a, lang)} first={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA ══════════════ */}
      <section className="panel-ink relative overflow-hidden">
        <div className="rule-gilt absolute inset-x-0 top-0" aria-hidden />
        <div className="grain-layer" aria-hidden style={{ opacity: 0.16 }} />
        <div className="shell relative py-16 md:py-24">
          <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="eyebrow-gilt" style={{ color: "var(--gold-bright)" }}>
                {"One last thing"}
              </span>
              <h2
                className="hand mt-5 text-[clamp(32px,4.4vw,64px)]"
                style={{ color: "var(--paper)" }}
              >
                {"So — what are you drinking "}
                <Gilt>tonight</Gilt>
                {"?"}
              </h2>
              <p
                className="note mt-6 max-w-xl text-[16px]"
                style={{ color: "rgba(242,237,225,0.72)" }}
              >
                {pick(BRAND.oneLiner, lang)}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <button className="btn btn-gilt-solid !px-9 !py-4" onClick={startMixing}>
                  {pick(HERO.primaryCta, lang)}
                </button>
                <a
                  className="btn btn-outline"
                  href={BRAND.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {BRAND.handle}
                </a>
              </div>
            </div>

            <div className="lg:pb-2">
              <GuestList source="landing" variant="ink" />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter onMix={startMixing} />
    </div>
  );
}

function FaqRow({ q, a, first }: { q: string; a: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderTop: first ? "1.5px solid var(--line)" : undefined,
        borderBottom: "1.5px solid var(--line)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 py-4 text-left"
        aria-expanded={open}
      >
        <span className="hand text-[19px] leading-snug">{q}</span>
        <span
          className="hand shrink-0 text-[24px] leading-none transition-transform"
          style={{ color: "var(--gold)", transform: open ? "rotate(45deg)" : "none" }}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && <p className="note pb-5 pr-10 text-[15px]">{a}</p>}
    </div>
  );
}
