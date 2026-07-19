import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Cocktail } from "@/lib/cocktails-store";
import {
  renderSharePosterToCanvas,
  POSTER_LAYOUTS,
  DEFAULT_POSTER_LAYOUT,
  TYPE_DEFAULTS,
  type PosterLayoutId,
  type TypeSizes,
} from "@/lib/share-poster";

export const Route = createFileRoute("/dev/poster")({
  // Dev-only lab. Production builds exclude the whole dev/ folder via
  // routeFileIgnorePattern (vite.config.ts); this guard is the runtime
  // backstop in case that ever regresses.
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound();
  },
  component: DevPosterLab,
});

/* ────────────────────────────────────────────────────────────────────────
   A dev-only lab for the "Save" share poster (src/lib/share-poster/).
   Feeds mock Cocktail data straight into renderSharePosterToCanvas so we can
   iterate on the canvas layout strategies (2:2 / 2:3 / 3:2) without walking
   the whole mood → generate flow. Visit /dev/poster.
   ──────────────────────────────────────────────────────────────────────── */

/** A synthetic cocktail-glass illustration as an SVG data URL. Always loads
 *  offline, has real intrinsic dimensions, and roughly mimics the shape/aspect
 *  of a Gemini watercolor drink so feathering + overlap behave realistically. */
const SYNTHETIC_DRINK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E8663C"/>
      <stop offset="1" stop-color="#B83A1E"/>
    </linearGradient>
  </defs>
  <!-- glass bowl -->
  <path d="M250 380 L650 380 L470 720 L430 720 Z" fill="url(#liq)" opacity="0.92"/>
  <path d="M250 380 L650 380 L470 720 L430 720 Z" fill="none" stroke="#5A2A18" stroke-width="6" opacity="0.5"/>
  <!-- stem + foot -->
  <rect x="443" y="720" width="14" height="260" fill="#8A5A3A" opacity="0.7"/>
  <ellipse cx="450" cy="990" rx="130" ry="26" fill="#8A5A3A" opacity="0.55"/>
  <!-- garnish -->
  <circle cx="600" cy="360" r="46" fill="#C64B2A" opacity="0.85"/>
  <circle cx="600" cy="360" r="46" fill="none" stroke="#5A2A18" stroke-width="5" opacity="0.5"/>
</svg>`);

type ScenarioKey = "normal-short" | "plum-earl-grey" | "menu-match" | "overflow-stress";

function baseMock(): Cocktail {
  return {
    id: 1,
    publicId: "mock-001",
    cocktailName: "Midnight Confession",
    originalMood: "有点想家,又不想承认,只想一个人安静地待着。",
    selectedFlavors: ["smoky", "bittersweet"],
    customPreference: "",
    flavorProfile: "Smoky, Bittersweet, Warm",
    tastesLike:
      "像深夜一个人走过空街,风里有一点烟味。第一口是苦的,回味却慢慢暖起来,像终于跟自己和解。",
    ingredients: [
      "2 oz Mezcal",
      "0.75 oz Amaro Nonino",
      "0.5 oz fresh lime juice",
      "A dash of Angostura bitters",
      "Garnish: an orange twist",
    ],
    recipe:
      "Combine mezcal, amaro, and lime over ice.\nShake hard for 12 seconds.\nStrain into a chilled coupe.\nExpress an orange twist over the top.",
    roast: "You romanticize your own loneliness a little too well.",
    category: "Sour",
    imageData: null,
    imageUrl: null,
    lang: "zh",
    createdAt: new Date(0).toISOString(),
  };
}

function makeScenario(key: ScenarioKey): Cocktail {
  const c = baseMock();
  switch (key) {
    case "normal-short":
      c.cocktailName = "Golden Hour";
      c.tastesLike = "轻盈、明亮,像午后第一缕阳光。";
      c.originalMood = "今天心情很好。";
      c.roast = "Suspiciously optimistic for a Tuesday.";
      return c;
    case "plum-earl-grey":
      // Real production example (Plum Earl Grey Whiskey Cola) — Friday vibe.
      // Truncated fields from the screenshot are completed in the same voice;
      // edit freely in the lab.
      c.cocktailName = "哎哟,这周终于过去了~";
      c.originalMood = "周五下午!阳光真好,终于要放假了,好开心!";
      c.matchedFromMenu = true;
      c.menuItemName = "Plum Earl Grey Whiskey Cola";
      c.whyThisMatch =
        "你这周五的阳光,就差一杯威士忌啦!这杯有你'交完周报'的如释重负,梅子的清甜配上伯爵茶的温柔,正好接住你难得的好心情。";
      c.tastesLike =
        "当李子的清甜遇上伯爵茶的芬芳,威士忌的醇厚被可乐气泡轻轻托起,像下班路上迎面吹来的那阵晚风,整个人都松了下来。";
      return c;
    case "menu-match":
      // Real production example (The Yak @ Tashi) — the case that exposed the
      // truncated quote/why at 1.45× global scale.
      c.cocktailName = "笔误太多不如不写!";
      c.originalMood = "光标闪了二十分钟,一个字没打。";
      c.matchedFromMenu = true;
      c.menuItemName = "The Yak";
      c.restaurantName = "Tashi";
      c.whyThisMatch =
        "谁说灵感不能被唤醒?Tashi 青稞酒的独特风味,加上姜汁啤酒的活力,是打破僵局的最佳灵感催化剂。";
      c.tastesLike =
        "入口是青稞酒的醇厚与姜汁啤酒的辛辣,尾调带着一丝清新的青柠,让味蕾瞬间被唤醒,像是在茫茫草原上燃起了一团野性之火。";
      return c;
    case "overflow-stress":
      c.cocktailName = "The Extraordinarily Long Cocktail Name That Wraps Many Lines";
      c.tastesLike =
        "这是一段刻意写得非常非常长的品鉴描述,用来压测右栏文字在没有下边界保护的情况下会不会一路撞到底部的 footer 和二维码上。它应该会溢出。第一口的苦,中段的烟熏,尾韵的柑橘回甘,层层叠叠,像一场没有尽头的独白。再加一句,再加一句,再加一句,直到画布装不下为止。";
      c.originalMood =
        "一段同样很长的用户心情输入,测试 YOUR VIBE 那一块加上前面所有内容之后总高度会不会失控。";
      return c;
    default:
      // Stale key (e.g. HMR-preserved state after a scenario rename) — never
      // crash the lab, just fall back to the base mock.
      return c;
  }
}

const BRAND_QR_TARGET = "https://vibetail.com/";

function DevPosterLab() {
  const [scenario, setScenario] = useState<ScenarioKey>("plum-earl-grey");
  const [layout, setLayout] = useState<PosterLayoutId>(DEFAULT_POSTER_LAYOUT);
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const [useIllustration, setUseIllustration] = useState(true);
  const [useQr, setUseQr] = useState(true);
  // Matches DEFAULT_FONT_SCALE in src/lib/share-poster/shared.ts.
  const [fontScale, setFontScale] = useState(1.45);
  // Per-role base sizes (px, pre-fontScale). Defaults from TYPE_DEFAULTS.
  const [typeSizes, setTypeSizes] = useState<Required<TypeSizes>>({ ...TYPE_DEFAULTS });
  // Force the "为你匹配 / MATCHED" block onto any scenario.
  const [forceMatch, setForceMatch] = useState(true);

  // Editable copy overrides so we can stress fields live.
  const [name, setName] = useState("");
  const [tastesLike, setTastesLike] = useState("");
  const [mood, setMood] = useState("");
  const [why, setWhy] = useState("");

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const seqRef = useRef(0);

  // Sync editable fields whenever the scenario changes.
  useEffect(() => {
    const c = makeScenario(scenario);
    setName(c.cocktailName);
    setTastesLike(c.tastesLike);
    setMood(c.originalMood);
    setWhy(c.whyThisMatch ?? "");
  }, [scenario]);

  // Generate the brand QR once.
  useEffect(() => {
    QRCode.toDataURL(BRAND_QR_TARGET, {
      margin: 2,
      width: 512,
      errorCorrectionLevel: "M",
      color: { dark: "#2A2118", light: "#00000000" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, []);

  const cocktail = useMemo<Cocktail>(() => {
    const c = makeScenario(scenario);
    c.cocktailName = name;
    c.tastesLike = tastesLike;
    c.originalMood = mood;
    if (forceMatch && !c.matchedFromMenu) {
      c.matchedFromMenu = true;
      c.menuItemName = "The Cartographer";
      c.restaurantName = "Double Chicken Please";
    }
    if (c.matchedFromMenu) c.whyThisMatch = why || null;
    c.lang = lang;
    return c;
  }, [scenario, name, tastesLike, mood, why, lang, forceMatch]);

  const render = useCallback(async () => {
    const seq = ++seqRef.current;
    setStatus("rendering");
    setError(null);
    const t0 = performance.now();
    try {
      const { dataUrl } = await renderSharePosterToCanvas({
        cocktail,
        illustrationSource: useIllustration ? SYNTHETIC_DRINK : "",
        qrDataUrl: useQr ? qrDataUrl : null,
        lang,
        fontScale,
        typeSizes,
        layout,
      });
      if (seq !== seqRef.current) return; // stale
      setPosterUrl(dataUrl);
      setRenderMs(Math.round(performance.now() - t0));
      setStatus("ready");
    } catch (e) {
      if (seq !== seqRef.current) return;
      console.error(e);
      setError((e as Error)?.message ?? "render failed");
      setStatus("error");
    }
  }, [cocktail, useIllustration, useQr, qrDataUrl, lang, fontScale, typeSizes, layout]);

  // Auto re-render (debounced) on any input change.
  useEffect(() => {
    const t = window.setTimeout(render, 200);
    return () => window.clearTimeout(t);
  }, [render]);

  const labelCls = "text-[11px] uppercase tracking-wider text-neutral-400 mb-1 block";
  const inputCls =
    "w-full rounded bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500";

  return (
    <div className="min-h-svh bg-neutral-950 text-neutral-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">Share Poster Lab</h1>
          <p className="text-sm text-neutral-400">
            Live harness for{" "}
            <code className="text-neutral-300">renderSharePosterToCanvas</code> (
            {POSTER_LAYOUTS[layout].width}×{POSTER_LAYOUTS[layout].height}). Edit fields →
            auto re-renders. Dev only.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* ── Controls ── */}
          <div className="space-y-4">
            <div>
              <span className={labelCls}>Layout strategy</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(POSTER_LAYOUTS) as PosterLayoutId[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setLayout(id)}
                    className={`rounded px-3 py-1.5 text-sm border ${
                      layout === id
                        ? "bg-amber-500/20 border-amber-500 text-amber-200"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300"
                    }`}
                  >
                    {POSTER_LAYOUTS[id].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>Scenario</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["normal-short", "Short"],
                    ["plum-earl-grey", "周五 Plum"],
                    ["menu-match", "Yak (Tashi)"],
                    ["overflow-stress", "Overflow stress"],
                  ] as [ScenarioKey, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setScenario(key)}
                    className={`rounded px-3 py-1.5 text-sm border ${
                      scenario === key
                        ? "bg-amber-500/20 border-amber-500 text-amber-200"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>
                Font size — {Math.round(fontScale * 100)}%
              </span>
              <div className="flex items-center gap-2 mb-2">
                {[1.0, 1.2, 1.4, 1.6, 1.8].map((v) => (
                  <button
                    key={v}
                    onClick={() => setFontScale(v)}
                    className={`rounded px-2.5 py-1 text-xs border ${
                      Math.abs(fontScale - v) < 0.001
                        ? "bg-amber-500/20 border-amber-500 text-amber-200"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300"
                    }`}
                  >
                    {v.toFixed(1)}×
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0.8}
                max={2}
                step={0.05}
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <span className={labelCls}>Type sizes (px, × font size)</span>
              <div className="space-y-2">
                {(
                  [
                    ["name", "标题 Name", 40, 100],
                    ["quote", "品鉴 Quote", 16, 48],
                    ["vibe", "心情 Vibe", 14, 40],
                    ["why", "推荐 Why", 12, 32],
                  ] as [keyof TypeSizes, string, number, number][]
                ).map(([key, label, min, max]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-neutral-400 shrink-0">
                      {label}
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={1}
                      value={typeSizes[key]}
                      onChange={(e) =>
                        setTypeSizes((s) => ({ ...s, [key]: Number(e.target.value) }))
                      }
                      className="flex-1 accent-amber-500"
                    />
                    <span className="w-14 text-right text-xs text-neutral-300 tabular-nums shrink-0">
                      {typeSizes[key]}px
                      <span className="text-neutral-500">
                        {" "}
                        →{Math.round(typeSizes[key] * fontScale)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTypeSizes({ ...TYPE_DEFAULTS })}
                className="mt-2 rounded px-2.5 py-1 text-xs border bg-neutral-800 border-neutral-700 text-neutral-300"
              >
                Reset defaults
              </button>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={lang === "zh"}
                  onChange={(e) => setLang(e.target.checked ? "zh" : "en")}
                />
                中文 (zh)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useIllustration}
                  onChange={(e) => setUseIllustration(e.target.checked)}
                />
                Illustration
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useQr}
                  onChange={(e) => setUseQr(e.target.checked)}
                />
                QR
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={forceMatch}
                  onChange={(e) => setForceMatch(e.target.checked)}
                />
                为你匹配
              </label>
            </div>

            <div>
              <span className={labelCls}>Cocktail name</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <span className={labelCls}>Tastes like (vibe quote source)</span>
              <textarea
                className={inputCls}
                rows={3}
                value={tastesLike}
                onChange={(e) => setTastesLike(e.target.value)}
              />
            </div>

            <div>
              <span className={labelCls}>Your vibe (original mood)</span>
              <textarea
                className={inputCls}
                rows={2}
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              />
            </div>

            {cocktail.matchedFromMenu && (
              <div>
                <span className={labelCls}>Why this match</span>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={render}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900"
              >
                Re-render
              </button>
              {posterUrl && (
                <a
                  href={posterUrl}
                  download={`${name.replace(/\s+/g, "-").toLowerCase() || "poster"}.png`}
                  className="rounded border border-neutral-700 px-4 py-2 text-sm"
                >
                  Download PNG
                </a>
              )}
              <span className="text-xs text-neutral-500">
                {status}
                {renderMs != null && status === "ready" ? ` · ${renderMs}ms` : ""}
              </span>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          {/* ── Preview ── */}
          <div className="flex justify-center">
            <div
              className="relative"
              style={{
                width: layout === "3:2" ? 640 : layout === "2:3" ? 420 : 480,
                aspectRatio: `${POSTER_LAYOUTS[layout].width}/${POSTER_LAYOUTS[layout].height}`,
              }}
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt="share poster preview"
                  className="w-full rounded-lg shadow-2xl"
                  style={{ imageRendering: "auto" }}
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-neutral-800 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
