import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import { useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";

import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import GuestList from "./GuestList";
import HeroStage, { Drummer } from "@/components/draw/HeroStage";
import Draw from "@/components/draw/art";
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
        className="hand text-[clamp(38px,6vw,70px)]"
        style={ink ? { color: "var(--paper)" } : undefined}
      >
        {title}
      </h2>
      {sub && (
        <p
          className="note mt-4 max-w-2xl text-[19px]"
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
                className="hand text-[clamp(40px,5.4vw,84px)]"
                style={{ color: "rgba(244,243,240,0.96)" }}
              >
                {"Tell us how you "}
                <em className="accent-italic" style={{ color: "rgba(244,243,240,0.85)" }}>
                  actually
                </em>
                {" feel tonight."}
              </h1>
              <p
                className="mt-5 max-w-md"
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  lineHeight: 1.9,
                  color: "rgba(244,243,240,0.72)",
                }}
              >
                {pick(HERO.sub)}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  className="btn"
                  onClick={startMixing}
                  style={{
                    background: "rgba(244,243,240,0.96)",
                    color: "#0d0d0c",
                    borderColor: "rgba(244,243,240,0.96)",
                    padding: "1.1rem 2.4rem",
                  }}
                >
                  {pick(HERO.primaryCta, lang)}
                </button>
                <span className="scrawl-sm" style={{ color: "rgba(244,243,240,0.55)" }}>
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
                <h3 className="hand mt-6 text-[clamp(22px,2.2vw,28px)] leading-tight">
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
                  className="hand text-[clamp(24px,2.6vw,34px)] leading-none"
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
            {/* One card, given the whole wall */}
            <article
              className="frame-gilt relative mx-auto w-full max-w-[440px]"
              style={{ background: "var(--paper-card)" }}
            >
              <div className="flex items-baseline justify-between px-7 pt-6">
                <span className="specimen-no">No. {SPECIMENS[0].no}</span>
                <span className="accent-italic text-[15px]" style={{ color: "var(--ink-faint)" }}>
                  Vibetail
                </span>
              </div>
              <div
                className="relative mx-auto flex items-center justify-center"
                style={{ width: "100%", aspectRatio: "5/4" }}
              >
                <span style={{ width: "48%", color: "var(--ink)" }} aria-hidden>
                  <Draw name="glass" strokeWidth={2} />
                </span>
              </div>
              <div className="px-7 pb-8">
                <hr className="rule" />
                <h3 className="hand mt-5 text-[clamp(26px,2.4vw,36px)] leading-none">
                  {pick(SPECIMENS[0].name, lang)}
                </h3>
                <p className="accent-italic mt-2.5 text-[18px]" style={{ color: "var(--ink-mute)" }}>
                  &ldquo;{pick(SPECIMENS[0].mood, lang)}&rdquo;
                </p>
                <p className="note mt-3 text-[15px]">{pick(SPECIMENS[0].note, lang)}</p>
                <div className="mt-5 flex flex-wrap gap-x-4">
                  {SPECIMENS[0].tags.map((t) => (
                    <span key={t.en} className="scrawl-sm">
                      {pick(t, lang)}
                    </span>
                  ))}
                </div>
              </div>
            </article>

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
                    <h3 className="hand text-[clamp(22px,2vw,30px)] leading-none">
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

      {/* ══════════════ INTERLUDE — the photograph and the drawing ══════════════ */}
      <section className="relative overflow-hidden" style={{ background: "var(--night)" }}>
        <div className="relative grid min-h-[76svh] lg:grid-cols-2">
          {/* The photograph, film-toned, breathing slowly */}
          <div className="relative min-h-[54svh] overflow-hidden">
            <motion.img
              src="/still-portrait.jpg"
              alt="A hand resting on a glass over a chessboard"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: "grayscale(1) contrast(1.08)" }}
              initial={{ scale: 1.08 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 3.4, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Drawn over the print, the way the drummer sits on the hero */}
            <motion.span
              className="absolute left-[8%] top-[10%] w-[30%]"
              style={{ color: "#f4efe6" }}
              aria-hidden
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5 }}
            >
              <Draw name="confetti" strokeWidth={2.2} />
            </motion.span>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 70%, rgba(13,13,12,0.85) 100%), linear-gradient(0deg, rgba(13,13,12,0.35) 0%, transparent 30%)",
              }}
            />
          </div>

          {/* The claim, set like a menu head */}
          <div className="on-dark relative flex flex-col justify-center gap-7 px-[clamp(22px,5vw,80px)] py-16">
            <span className="eyebrow-gilt" style={{ color: "var(--gold-bright)" }}>
              {"№ 04 — The house style"}
            </span>
            <h2 className="hand text-[clamp(36px,4.2vw,58px)]" style={{ color: "var(--paper)" }}>
              {"Drawn by hand."}
              <br />
              {"Printed in "}
              <Gilt>silver</Gilt>
              {"."}
            </h2>
            <p className="note max-w-md text-[18px]" style={{ color: "rgba(242,237,225,0.7)" }}>
              {
                "Every drink card pairs a photograph of the night with a drawing of the feeling — charcoal line over silver-print film. Two materials, nothing else."
              }
            </p>
            <div className="mt-2 flex items-center gap-5">
              <button className="btn btn-gilt" onClick={startMixing}>
                {"Mix yours"}
              </button>
              <span className="accent-italic text-[19px]" style={{ color: "rgba(242,237,225,0.55)" }}>
                est. 2025 · after hours
              </span>
            </div>
          </div>
        </div>
        <div className="rule-gilt absolute inset-x-0 bottom-0" aria-hidden />
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

          <div className="mt-14 grid gap-x-9 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {VENUES.features.map((f) => (
              <div key={f.no} className="pt-6" style={{ borderTop: "1px solid var(--line)" }}>
                <span className="specimen-no">{f.no}</span>
                <h3 className="hand mt-4 text-[26px]">{pick(f.title, lang)}</h3>
                <p className="note mt-2 text-[15px]">{pick(f.body, lang)}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-5">
            <a
              className="btn btn-solid"
              href={`mailto:${BRAND.email}?subject=Vibetail%20for%20our%20menu`}
            >
              {pick(VENUES.cta, lang)}
            </a>
            <span className="accent-italic text-[18px]" style={{ color: "var(--gold-deep)" }}>
              {BRAND.email}
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
            <SectionHead eyebrow={"( 06 ) FAQ"} title={"Things you might ask."} />
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
                className="hand mt-5 text-[clamp(44px,8vw,96px)]"
                style={{ color: "var(--paper)" }}
              >
                {"So — what are you drinking "}
                <Gilt>tonight</Gilt>
                {"?"}
              </h2>
              <p
                className="note mt-6 max-w-xl text-[19px]"
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
        <span className="hand text-[26px] leading-snug">{q}</span>
        <span
          className="hand shrink-0 text-[30px] leading-none transition-transform"
          style={{ color: "var(--gold)", transform: open ? "rotate(45deg)" : "none" }}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && <p className="note pb-5 pr-10 text-[17px]">{a}</p>}
    </div>
  );
}
