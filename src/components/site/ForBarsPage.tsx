import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { FLAVOR_CHIPS } from "@/lib/moodtail-data";
import { Drummer } from "@/components/draw/HeroStage";
import { Logotype } from "./SiteNav";

/**
 * The bar-side door.
 *
 * Two full screens, never split: a photograph of a real bar with the ask
 * written across it, then — once the menu is photographed — the whole
 * window turns into the editing desk. Same house style as the landing
 * page: Inter for everything, the script for the words that carry it.
 */

interface DraftItem {
  id: number;
  name: string;
  description: string;
  tones: string[];
  image: string | null;
}

/* Until the OCR service is wired in, the reading step drafts a plausible
   starting menu the owner corrects — the flow is the product here. */
const SEED_ITEMS: Omit<DraftItem, "id" | "image">[] = [
  {
    name: "House Negroni",
    description: "Gin, sweet vermouth and bitter aperitivo, stirred over one large cube.",
    tones: ["bitter", "boozy"],
  },
  {
    name: "Yuzu Highball",
    description: "Toki whisky, fresh yuzu and soda — tall, cold and very fast.",
    tones: ["citrusy", "bubbly"],
  },
  {
    name: "Espresso Martini",
    description: "Vodka, cold espresso and a whisper of vanilla, shaken to a foam.",
    tones: ["creamy", "boozy"],
  },
  {
    name: "Garden Spritz",
    description: "Cucumber, elderflower and prosecco over ice — the patio in a glass.",
    tones: ["floral", "dry"],
  },
];

const READING_LINES = [
  "Straightening the photograph…",
  "Reading the sections…",
  "Guessing every base spirit…",
  "Drafting tasting tones…",
];

const SHOOTING_NOTES: [string, string][] = [
  ["01", "Lay the menu flat, or hold it straight on — no angles."],
  ["02", "Daylight or a bright lamp; avoid glare on laminated pages."],
  ["03", "One photo per page. Fill the frame with the page."],
  ["04", "Keep prices, sections and sold-out marks in — all of it helps."],
];

let nextId = 1;

export default function ForBarsPage() {
  const [stage, setStage] = useState<"hero" | "reading" | "edit">("hero");
  const [pages, setPages] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [readingStep, setReadingStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    Promise.all(
      list.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(f);
          }),
      ),
    ).then((urls) => setPages((p) => [...p, ...urls].slice(0, 6)));
  }, []);

  // Photographing the menu is what moves the page on.
  useEffect(() => {
    if (stage === "hero" && pages.length > 0) setStage("reading");
  }, [pages, stage]);

  useEffect(() => {
    if (stage !== "reading") return;
    setReadingStep(0);
    const tick = setInterval(
      () => setReadingStep((s) => Math.min(READING_LINES.length - 1, s + 1)),
      700,
    );
    const done = setTimeout(() => {
      setItems(SEED_ITEMS.map((it) => ({ ...it, id: nextId++, image: null })));
      setStage("edit");
    }, 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [stage]);

  const update = (id: number, patch: Partial<DraftItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const toggleTone = (id: number, tone: string) =>
    setItems((list) =>
      list.map((it) => {
        if (it.id !== id) return it;
        if (it.tones.includes(tone)) return { ...it, tones: it.tones.filter((t) => t !== tone) };
        if (it.tones.length >= 3) {
          toast("3 tones is plenty for one drink");
          return it;
        }
        return { ...it, tones: [...it.tones, tone] };
      }),
    );

  const setItemImage = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => update(id, { image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const save = () => {
    setSaved(true);
    toast.success("Menu draft saved");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Shared file inputs — the camera one asks for the rear lens on phones. */
  const inputs = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />
    </>
  );

  /* ══════════ Screen 1 — the room, and the ask ══════════ */
  if (stage === "hero" || stage === "reading") {
    return (
      <div className="relative min-h-svh overflow-hidden" style={{ background: "var(--night)" }}>
        <img
          src="/brand/forbars-bg.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,13,12,0.62) 0%, rgba(13,13,12,0.18) 38%, rgba(13,13,12,0.86) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.1] mix-blend-screen"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Nav */}
        <header className="relative z-20">
          <div className="shell flex items-center justify-between gap-6 py-6">
            <div className="flex items-baseline gap-8" style={{ color: "rgba(244,243,240,0.95)" }}>
              <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
                <Logotype />
              </a>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(244,243,240,0.65)",
                }}
              >
                For bars
              </span>
            </div>
            <a
              href="/"
              className="hidden sm:block"
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(244,243,240,0.9)",
                textDecoration: "none",
                paddingBottom: 3,
                borderBottom: "1px solid rgba(244,243,240,0.6)",
              }}
            >
              Back to Vibetail
            </a>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {stage === "hero" ? (
            <motion.section
              key="hero"
              className="shell relative z-20 flex min-h-[calc(100svh-96px)] flex-col justify-end pb-14"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <div className="on-dark max-w-3xl">
                <h1
                  className="hand text-[clamp(40px,6vw,86px)]"
                  style={{ color: "rgba(246,245,242,0.97)" }}
                >
                  {"For "}
                  <em className="accent-italic" style={{ color: "rgba(246,245,242,0.97)" }}>
                    bars &amp; restaurants
                  </em>
                </h1>
                <p
                  className="mt-6 max-w-xl"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 400,
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "rgba(246,245,242,0.78)",
                  }}
                >
                  <span style={{ display: "block", fontWeight: 500 }}>
                    Photograph the menu. We&apos;ll do the typing.
                  </span>
                  One photo per page is all we need. We read every item, draft the descriptions and
                  tasting tones, and you correct anything we got wrong — like fixing a parsed
                  résumé, not retyping it.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <button
                    className="btn"
                    onClick={() => fileRef.current?.click()}
                    style={{
                      background: dragging ? "#ffffff" : "rgba(246,245,242,0.95)",
                      color: "#0d0d0c",
                      borderColor: "rgba(246,245,242,0.95)",
                      padding: "1.15rem 2.5rem",
                    }}
                  >
                    {dragging ? "Drop the photo" : "Upload menu now"}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => cameraRef.current?.click()}
                    style={{ color: "rgba(246,245,242,0.9)", borderColor: "rgba(246,245,242,0.5)" }}
                  >
                    {"Take a picture"}
                  </button>
                  <span
                    className="accent-italic text-[20px]"
                    style={{ color: "rgba(246,245,242,0.6)" }}
                  >
                    or drop it anywhere on this page
                  </span>
                </div>

                {/* Instructions, kept quiet under the fold of the eye */}
                <div className="mt-12 grid max-w-3xl gap-x-10 gap-y-3 sm:grid-cols-2">
                  {SHOOTING_NOTES.map(([no, line]) => (
                    <div
                      key={no}
                      className="grid grid-cols-[30px_1fr] items-baseline gap-3 pt-3"
                      style={{ borderTop: "1px solid rgba(246,245,242,0.2)" }}
                    >
                      <span
                        className="specimen-no"
                        style={{ color: "rgba(246,245,242,0.55)" }}
                      >
                        {no}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          color: "rgba(246,245,242,0.72)",
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="reading"
              className="shell relative z-20 flex min-h-[calc(100svh-96px)] flex-col items-center justify-center gap-8 pb-14"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="eyebrow-gilt" style={{ color: "rgba(246,245,242,0.7)" }}>
                {"Reading your menu"}
              </span>
              <motion.div
                className="w-[180px]"
                animate={{ rotate: [-3, 3, -3], y: [0, -6, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              >
                <Drummer className="w-full" />
              </motion.div>
              <ul className="w-full max-w-sm space-y-2.5 text-center">
                {READING_LINES.map((line, i) => (
                  <li
                    key={line}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 16,
                      color: "rgba(246,245,242,0.92)",
                      opacity: i < readingStep ? 0.4 : i === readingStep ? 1 : 0.25,
                      textDecorationLine: i < readingStep ? "line-through" : "none",
                      transition: "opacity 300ms ease",
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </motion.section>
          )}
        </AnimatePresence>

        {inputs}
      </div>
    );
  }

  /* ══════════ Screen 2 — the editing desk, full width ══════════ */
  return (
    <div className="min-h-svh" style={{ background: "var(--paper)" }}>
      {/* Desk header, on a strip of the room */}
      <header className="relative overflow-hidden" style={{ background: "var(--night)" }}>
        <img
          src="/brand/forbars-desk.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,13,12,0.72) 0%, rgba(13,13,12,0.55) 55%, rgba(13,13,12,0.9) 100%)",
          }}
        />
        <div className="shell relative z-10 py-8">
          <div className="flex items-center justify-between gap-6">
            <a href="/" style={{ color: "rgba(246,245,242,0.95)", textDecoration: "none" }}>
              <Logotype />
            </a>
            <span
              className="mono-sm"
              style={{ color: "rgba(246,245,242,0.6)" }}
            >
              {"Step 2 of 2 — check our reading"}
            </span>
          </div>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
            <div className="on-dark max-w-2xl">
              <h1
                className="hand text-[clamp(32px,4.4vw,60px)]"
                style={{ color: "rgba(246,245,242,0.97)" }}
              >
                {saved ? (
                  <>
                    {"Saved — "}
                    <em className="accent-italic">over to us</em>
                    {"."}
                  </>
                ) : (
                  <>
                    {"Here's what "}
                    <em className="accent-italic">we read</em>
                    {"."}
                  </>
                )}
              </h1>
              <p
                className="mt-4 max-w-xl"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "rgba(246,245,242,0.72)",
                }}
              >
                {saved
                  ? "Your draft is in. We'll wire it to a live menu and send your private management link to the email on file — usually within the day."
                  : "Fix anything we got wrong — names, descriptions, tones — and add a photo per drink if you have one. Nothing goes live until you say so."}
              </p>
            </div>

            {/* The pages you shot */}
            <div className="flex items-end gap-3">
              {pages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Menu page ${i + 1}`}
                  className="h-24 w-[72px] object-cover"
                  style={{
                    border: "1px solid rgba(246,245,242,0.35)",
                    transform: `rotate(${(i % 2 ? 1 : -1) * 1.6}deg)`,
                  }}
                />
              ))}
              <button
                className="btn btn-outline !px-4 !py-3"
                onClick={() => fileRef.current?.click()}
                style={{ color: "rgba(246,245,242,0.9)", borderColor: "rgba(246,245,242,0.45)" }}
              >
                {"+ Page"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* The items, full width */}
      <main className="shell py-14">
        <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2">
          {items.map((item, idx) => (
            <motion.article
              key={item.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3) }}
              className="frame-gilt relative p-7"
              style={{ background: "var(--paper-card)" }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="specimen-no">{String(idx + 1).padStart(2, "0")}</span>
                <button
                  type="button"
                  className="mono-sm underline underline-offset-4"
                  onClick={() => setItems((l) => l.filter((it) => it.id !== item.id))}
                >
                  {"Remove"}
                </button>
              </div>

              <div className="mt-5 grid gap-6 sm:grid-cols-[104px_minmax(0,1fr)]">
                <label
                  className="flex h-[104px] w-[104px] cursor-pointer items-center justify-center overflow-hidden text-center transition-colors hover:bg-[var(--paper-warm)]"
                  style={{ border: "1px dashed var(--line-strong)" }}
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="mono-sm px-2 leading-relaxed">{"Add photo"}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && setItemImage(item.id, e.target.files[0])}
                  />
                </label>

                <div className="min-w-0">
                  <input
                    value={item.name}
                    onChange={(e) => update(item.id, { name: e.target.value })}
                    placeholder="Drink name"
                    className="field text-[22px]"
                    style={{ fontWeight: 500, letterSpacing: "-0.02em" }}
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => update(item.id, { description: e.target.value })}
                    placeholder="One honest line about it"
                    rows={2}
                    className="field mt-4 resize-none text-[15px]"
                  />
                  <div className="mono-sm mb-2.5 mt-5">
                    {"Tones · up to 3"}
                    {item.tones.length > 0 && ` · ${item.tones.length}/3`}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FLAVOR_CHIPS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        className="chip !px-2.5 !py-1.5 !text-[11px]"
                        data-selected={item.tones.includes(c.label)}
                        onClick={() => toggleTone(item.id, c.label)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div
          className="mt-12 flex flex-wrap items-center gap-5 pt-8"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <button
            className="btn btn-outline"
            onClick={() =>
              setItems((l) => [...l, { id: nextId++, name: "", description: "", tones: [], image: null }])
            }
          >
            {"+ Add an item"}
          </button>
          <button className="btn btn-solid" onClick={save} disabled={saved}>
            {saved ? "Saved" : "Save my menu"}
          </button>
          <span className="accent-italic text-[21px]" style={{ color: "var(--ink-mute)" }}>
            nothing goes live until you say so
          </span>
        </div>
      </main>

      {inputs}
    </div>
  );
}
