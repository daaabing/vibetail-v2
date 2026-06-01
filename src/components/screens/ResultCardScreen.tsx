
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import * as htmlToImage from "html-to-image";
import { type Cocktail, decodeCocktailFromHash, encodeCocktailToHash, getCocktail, updateCocktailImage } from "@/lib/cocktails-store";
import { useLang } from "@/lib/i18n";

interface ResultCardScreenProps {
  id: number;
}

/* ── Skeleton card ── */
function CardSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden shimmer" style={{ aspectRatio: "3/4", maxHeight: 480 }} />
  );
}

/* ── Front face: cocktail name + AI illustration ── */
function CardFront({ cocktail, imageData, imageLoading, tapHint, distillingText }: {
  cocktail: Cocktail;
  imageData: string | null;
  imageLoading: boolean;
  tapHint: string;
  distillingText: string;
}) {
  return (
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden flex flex-col"

      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        background: "linear-gradient(160deg, #fdf8f3 0%, #faf0e6 100%)",
        border: "1px solid rgba(210,201,189,0.6)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      {/* AI illustration — fixed height, object-contain so full image is visible */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ height: 260, background: "rgba(250,246,240,0.6)" }}>
        {imageLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 w-full h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--app-primary)" strokeWidth="1.5">
                <path d="M12 3v18M8 22h8M4 6c0 4.418 3.582 8 8 8s8-3.582 8-8V4H4v2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <p className="text-[10px] tracking-wider" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
              {distillingText}
            </p>
          </div>
        ) : imageData ? (
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={cocktail.cocktailName}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--app-primary)" strokeWidth="0.8" opacity="0.3">
              <path d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Cocktail name + vibe diagnosis */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <h1
          className="font-semibold leading-tight text-center"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--app-text)",
            fontSize: "clamp(1.4rem, 6vw, 2rem)",
          }}
        >
          {cocktail.cocktailName}
        </h1>

        {/* Vibe diagnosis — roast line */}
        <p className="text-center text-xs mt-2 leading-snug italic"
          style={{ fontFamily: "var(--font-heading)", color: "var(--app-primary)" }}>
          "{cocktail.roast}"
        </p>

        {/* Flavor keywords from tasting notes */}
        <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
          {(Array.isArray((cocktail as any).flavorKeywords) && (cocktail as any).flavorKeywords.length > 0
            ? (cocktail as any).flavorKeywords as string[]
            : cocktail.flavorProfile.split(",").map((s: string) => s.trim())
          ).map((f: string) => (
            <span key={f} className="px-2 py-0.5 rounded text-[9px] uppercase"
              style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(210,201,189,0.6)",
                fontFamily: "var(--font-body)",
                color: "var(--app-text-secondary)",
              }}>
              {f.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* Tap hint */}
      <div className="pb-5 flex justify-center flex-shrink-0">
        <span className="text-[9px] tracking-widest flex items-center gap-1.5"
          style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tapHint}
        </span>
      </div>
    </div>
  );
}

/* ── Back face: recipe + roast + details — light style ── */
function CardBack({ cocktail, tapHint, labels }: {
  cocktail: Cocktail;
  tapHint: string;
  labels: { originalVibe: string; tastingNotes: string; ingredients: string; howToMake: string; };
}) {
  const recipeLines = cocktail.recipe.split("\n").filter(Boolean);

  return (
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden flex flex-col"

      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
        background: "linear-gradient(160deg, #fdf8f3 0%, #faf0e6 100%)",
        border: "1px solid rgba(210,201,189,0.6)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      {/* Subtle warm blobs */}
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(224,83,60,0.10) 0%, transparent 70%)", filter: "blur(30px)" }} />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(212,155,67,0.08) 0%, transparent 70%)", filter: "blur(30px)" }} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 relative z-10" style={{ scrollbarWidth: "none" }}>

        {/* Header — just the name */}
        <div className="mb-4 pb-3" style={{ borderBottom: "1px solid rgba(210,201,189,0.5)" }}>
          <h3 className="font-semibold leading-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)", fontSize: "1.3rem" }}>
            {cocktail.cocktailName}
          </h3>
        </div>

        {/* Original vibe */}
        <div className="mb-4 p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(210,201,189,0.4)" }}>
          <span className="text-[8px] tracking-widest uppercase block mb-1"
            style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
            {labels.originalVibe}
          </span>
          <p className="text-xs leading-relaxed"
            style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)" }}>
            "{cocktail.originalMood}"
          </p>
        </div>

        {/* Tasting notes */}
        <div className="mb-4">
          <span className="text-[8px] tracking-widest uppercase block mb-1.5"
            style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
            {labels.tastingNotes}
          </span>
          <p className="text-xs leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
            {cocktail.tastesLike}
          </p>
        </div>

        {/* Ingredients */}
        <div className="mb-4">
          <span className="text-[8px] tracking-widest uppercase block mb-2"
            style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
            {labels.ingredients}
          </span>
          <ul className="space-y-1.5">
            {(cocktail.ingredients as string[]).map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px]"
                style={{ color: "var(--app-text-secondary)" }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--app-primary)" }} />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Recipe — numbered steps */}
        <div className="mb-4 p-3 rounded-xl"
          style={{ background: "rgba(224,83,60,0.06)", border: "1px solid rgba(224,83,60,0.18)" }}>
          <span className="text-[8px] tracking-widest uppercase block mb-3"
            style={{ fontFamily: "var(--font-body)", color: "var(--app-primary)" }}>
            {labels.howToMake}
          </span>
          <ol className="space-y-2.5">
            {recipeLines.map((line: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5">
                {/* Step number badge */}
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: "var(--app-primary)",
                    color: "white",
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-[11px] leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
                  {line}
                </span>
              </li>
            ))}
          </ol>
        </div>

      </div>

      {/* Tap hint */}
      <div className="pb-5 flex justify-center flex-shrink-0 relative z-10">
        <span className="text-[9px] tracking-widest flex items-center gap-1.5"
          style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tapHint}
        </span>
      </div>
    </div>
  );
}

/* ── Main screen ── */
export default function ResultCardScreen({ id }: ResultCardScreenProps) {
  const navigate = useNavigate();
  const search = useSearch({ from: "/result/$id" }) as { from?: string; d?: string };
  const fromGallery = search.from === "gallery";
  const { t } = useLang();
  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const tapHint = t("result.tap");
  const distillingText = t("result.distilling");
  const cardLabels = {
    originalVibe: t("result.original"),
    tastingNotes: t("result.tasting"),
    ingredients: t("result.ingredients"),
    howToMake: t("result.howToMake"),
  };

  useEffect(() => {
    const data = getCocktail(Number(id));
    if (data) {
      setCocktail(data);
      setImageData(data.imageData ?? null);
      setImageLoading(false);
    } else if (search.d) {
      const decoded = decodeCocktailFromHash(search.d);
      if (decoded) {
        setCocktail(decoded);
        setImageData(decoded.imageData ?? null);
        setImageLoading(false);
      }
    }
    setLoading(false);
  }, [id, search.d]);

  // Dynamic title + Recipe JSON-LD once cocktail loads (client-side data)
  useEffect(() => {
    if (!cocktail || typeof document === "undefined") return;
    document.title = `${cocktail.cocktailName} — Vibetail`;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.vibetailRecipe = "true";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: cocktail.cocktailName,
      description: cocktail.tastesLike,
      recipeCategory: cocktail.category || "Cocktail",
      recipeCuisine: "Cocktail",
      recipeIngredient: cocktail.ingredients,
      recipeInstructions: cocktail.recipe
        .split("\n")
        .filter(Boolean)
        .map((step) => ({ "@type": "HowToStep", text: step })),
      datePublished: cocktail.createdAt,
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [cocktail]);

  const handleSave = async () => {
    if (!cocktail || !captureRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fdf8f3",
      });
      const link = document.createElement("a");
      link.download = `${cocktail.cocktailName.replace(/\s+/g, "-").toLowerCase()}-vibetail.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("save error", e);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!cocktail) return;
    const encoded = encodeCocktailToHash(cocktail);
    const url = `${window.location.origin}/result/${cocktail.id}?d=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.open(url, "_blank");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh flex flex-col p-5 pb-24 md:pb-5 w-full md:max-w-2xl lg:max-w-3xl md:mx-auto relative">
        <div className="glass-card-warm rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div className="h-4 w-24 rounded shimmer" />
          <div className="h-4 w-16 rounded shimmer" />
        </div>
        <div className="flex-1 flex items-center justify-center py-4">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!cocktail) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-5">
        <p style={{ color: "var(--app-text-muted)" }}>Cocktail not found.</p>
        <button onClick={() => navigate({ to: "/mood-input" })} className="mt-4 text-sm underline"
          style={{ color: "var(--app-primary)" }}>
          Check another vibe
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex flex-col w-full md:max-w-2xl lg:max-w-3xl md:mx-auto relative"
      style={{ background: "linear-gradient(170deg, #fdf8f3 0%, #faf4ed 60%, #f8f0e8 100%)" }}>

      {/* Offscreen capture target — flat long image, no card frame */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: -9999,
          width: 600,
          pointerEvents: "none",
          opacity: 1,
          zIndex: -1,
        }}
      >
        <div
          ref={captureRef}
          style={{
            width: 600,
            background: "linear-gradient(170deg, #fdf8f3 0%, #faf0e6 60%, #f8ead8 100%)",
            padding: "40px 44px 44px",
            fontFamily: "var(--font-body)",
            color: "var(--app-text)",
          }}
        >
          {/* Hero image */}
          <div style={{ width: "100%", height: 420, borderRadius: 18, overflow: "hidden", background: "rgba(250,246,240,0.6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            {imageData ? (
              <img src={`data:image/png;base64,${imageData}`} alt={cocktail.cocktailName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--app-primary)" strokeWidth="0.8" opacity="0.3">
                <path d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Name */}
          <h2 style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)", fontSize: 36, fontWeight: 600, lineHeight: 1.15, textAlign: "center", margin: 0 }}>
            {cocktail.cocktailName}
          </h2>

          {/* Roast */}
          <p style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-primary)", fontSize: 15, lineHeight: 1.45, textAlign: "center", marginTop: 12 }}>
            "{cocktail.roast}"
          </p>

          {/* Flavor keywords */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {(Array.isArray((cocktail as any).flavorKeywords) && (cocktail as any).flavorKeywords.length > 0
              ? (cocktail as any).flavorKeywords as string[]
              : cocktail.flavorProfile.split(",").map((s: string) => s.trim())
            ).map((f: string) => (
              <span key={f} style={{ padding: "3px 9px", borderRadius: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(210,201,189,0.6)", color: "var(--app-text-secondary)" }}>
                {f.trim()}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(210,201,189,0.6)", margin: "28px 0 24px" }} />

          {/* Original vibe */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--app-text-muted)", marginBottom: 6 }}>{cardLabels.originalVibe}</div>
            <p style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              "{cocktail.originalMood}"
            </p>
          </div>

          {/* Tasting notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--app-text-muted)", marginBottom: 6 }}>{cardLabels.tastingNotes}</div>
            <p style={{ color: "var(--app-text-secondary)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {cocktail.tastesLike}
            </p>
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--app-text-muted)", marginBottom: 8 }}>{cardLabels.ingredients}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(cocktail.ingredients as string[]).map((ing, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--app-text-secondary)", marginBottom: 6, lineHeight: 1.5 }}>
                  <span style={{ marginTop: 7, width: 6, height: 6, borderRadius: "50%", background: "var(--app-primary)", flexShrink: 0 }} />
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recipe */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--app-primary)", marginBottom: 12 }}>{cardLabels.howToMake}</div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {cocktail.recipe.split("\n").filter(Boolean).map((line, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--app-primary)", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--app-text-secondary)" }}>{line}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>


      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fromGallery ? navigate({ to: "/gallery" }) : navigate({ to: "/" })}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--app-text-secondary)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
            {fromGallery ? t("gallery.title") : t("result.home")}
          </span>
        </motion.button>
        <div className="text-[10px] tracking-widest font-semibold uppercase"
          style={{ color: "var(--app-states-success)" }}>
          {t("result.checked")}
        </div>
      </div>

      {/* ── Flip card ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-2 md:py-6">
        <div
          className="w-full cursor-pointer select-none"
          style={{ perspective: 1200, maxWidth: 440 }}
          onClick={() => setFlipped((f) => !f)}
        >
          <motion.div
            className="relative w-full"
            style={{
              aspectRatio: "3/4",
              maxHeight: 520,
              transformStyle: "preserve-3d",
            }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          >
            <CardFront cocktail={cocktail} imageData={imageData} imageLoading={imageLoading} tapHint={tapHint} distillingText={distillingText} />
            <CardBack cocktail={cocktail} tapHint={tapHint} labels={cardLabels} />

          </motion.div>
        </div>
      </div>

      {/* ── CTA buttons ── */}
      <div className="px-5 pb-28 md:pb-8 pt-3 flex-shrink-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Save → download */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            disabled={saving}
            className="py-3 px-4 text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 relative overflow-hidden disabled:opacity-60"
            style={{
              borderRadius: "4px",
              background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
              color: "white",
              boxShadow: "2px 3px 10px rgba(194,65,12,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <span className="absolute inset-0 pointer-events-none" style={{
              background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
              animation: "liquid-flow 3s ease-in-out infinite",
            }} />
            <svg className="w-4 h-4 relative z-10" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="relative z-10">{saving ? t("result.saving") : t("result.save")}</span>
          </motion.button>

          {/* Share — copy link */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleShare}
            className="py-3 px-4 text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 transition-all"
            style={{
              borderRadius: "4px",
              background: copied ? "rgba(141,163,130,0.15)" : "transparent",
              color: copied ? "var(--app-states-success)" : "var(--app-text-secondary)",
              border: copied ? "1.5px solid var(--app-states-success)" : "1.5px solid rgba(74,62,61,0.3)",
              boxShadow: "1px 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="var(--app-primary)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{copied ? t("result.copied") : t("result.share")}</span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate({ to: "/mood-input" })}
          className="w-full text-xs font-semibold uppercase tracking-widest py-2 text-center block hover:underline"
          style={{ color: "var(--app-primary)" }}
        >
          {t("result.another")}
        </motion.button>
      </div>
    </div>
  );
}
