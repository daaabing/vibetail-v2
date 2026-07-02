
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import * as htmlToImage from "html-to-image";
import QRCode from "qrcode";
import { type Cocktail, decodeCocktailFromHash, encodeCocktailToHash, getCocktail, saveCocktailFromPreview, updateCocktailImage } from "@/lib/cocktails-store";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import AuthModal from "@/components/moodtail/AuthModal";
import VibeBottle from "@/components/moodtail/VibeBottle";
import MixingOverlay from "@/components/moodtail/MixingOverlay";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

/** Strip quantity / measurement prefixes from AI-generated ingredient strings. */
function simplifyIngredient(name: string): string {
  return name
    .replace(/^\d+(\.\d+)?\s*(oz|ounce|tsp|tbsp|ml|cl|cup|part|shot|drop|pinch|dash|splash|squeeze|sprig|slice|piece|crushed|g|kg|lb|oz\.|tsp\.|tbsp\.)\s*(of\s+)?/i, "")
    .replace(/^[Aa]n?\s+(garnish|splash|squeeze|dash|sprig|twist|pinch|drop|slice|piece)\s*(of\s+)?/i, "")
    .replace(/^Topped with\s+/i, "")
    .replace(/^Garnish:\s*[Aa]n?\s*/i, "")
    .replace(/^Garnish:\s*/i, "")
    .trim();
}

interface ResultCardScreenProps {
  id: string;
}

/* ── Print frame styles (relief / border around the printed card) ── */
type FrameStyle = {
  id: string;
  label: string;
  inset: string;
  outerCss: string;
  innerCss: string;
  showCorners: boolean;
  cornerSize: string;
  cornerOffset: string;
  cornerCss: string;
};

const FRAME_STYLES: FrameStyle[] = [
  {
    id: "none",
    label: "None",
    inset: "0",
    outerCss: "",
    innerCss: "",
    showCorners: false,
    cornerSize: "0",
    cornerOffset: "0",
    cornerCss: "",
  },
  {
    id: "classic",
    label: "Classic",
    inset: "0.14in",
    outerCss: "border: 2px solid #4a3e3d; outline: 1px solid #4a3e3d; outline-offset: -0.08in;",
    innerCss: "",
    showCorners: false,
    cornerSize: "0",
    cornerOffset: "0",
    cornerCss: "",
  },
  {
    id: "deco",
    label: "Art Deco",
    inset: "0.16in",
    outerCss: "border: 3px solid #b8893a;",
    innerCss: "border: 1px solid #b8893a;",
    showCorners: true,
    cornerSize: "0.22in",
    cornerOffset: "0.04in",
    cornerCss: "border-top: 3px solid #b8893a; border-left: 3px solid #b8893a;",
  },
  {
    id: "vintage",
    label: "Vintage",
    inset: "0.18in",
    outerCss: "border: 2px dashed #6b4a2b; box-shadow: inset 0 0 0 4px #fdf8f3, inset 0 0 0 5px #6b4a2b;",
    innerCss: "",
    showCorners: false,
    cornerSize: "0",
    cornerOffset: "0",
    cornerCss: "",
  },
  {
    id: "double",
    label: "Double Line",
    inset: "0.15in",
    outerCss: "border: 1px solid #4a3e3d; box-shadow: inset 0 0 0 3px #fdf8f3, inset 0 0 0 4px #4a3e3d;",
    innerCss: "",
    showCorners: false,
    cornerSize: "0",
    cornerOffset: "0",
    cornerCss: "",
  },
  {
    id: "bold",
    label: "Bold",
    inset: "0.12in",
    outerCss: "border: 6px solid #e0533c;",
    innerCss: "",
    showCorners: false,
    cornerSize: "0",
    cornerOffset: "0",
    cornerCss: "",
  },
];

/* ── Skeleton card ── */
function CardSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden shimmer" style={{ aspectRatio: "3/4", maxHeight: 480 }} />
  );
}

/* ── Front face: cocktail name + AI illustration ── */
function CardFront({ cocktail, imageData, imageUrl, imageLoading, tapHint, distillingText }: {
  cocktail: Cocktail;
  imageData: string | null;
  imageUrl: string | null;
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
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={cocktail.cocktailName}
            className="w-full h-full object-contain"
          />
        ) : imageLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
            <VibeBottle size={140} mode="mixing" />
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
      <div className="px-5 pt-4 pb-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
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
function CardBack({ cocktail, tapHint, labels, hideRecipe }: {
  cocktail: Cocktail;
  tapHint: string;
  labels: { originalVibe: string; tastingNotes: string; ingredients: string; ingredientsBar: string; howToMake: string; };
  hideRecipe?: boolean;
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
                {simplifyIngredient(ing)}
              </li>
            ))}
          </ul>
          <p className="text-[9px] mt-2 italic" style={{ color: "var(--app-text-muted)" }}>
            {labels.ingredientsBar}
          </p>
        </div>

        {/* Recipe — numbered steps */}
        {!hideRecipe && (
          <div className="mb-4 p-3 rounded-xl"
            style={{ background: "rgba(224,83,60,0.06)", border: "1px solid rgba(224,83,60,0.18)" }}>
            <span className="text-[8px] tracking-widest uppercase block mb-3"
              style={{ fontFamily: "var(--font-body)", color: "var(--app-primary)" }}>
              {labels.howToMake}
            </span>
            <ol className="space-y-2.5">
              {recipeLines.map((line: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5">
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
        )}

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
  const search = useSearch({ from: "/drinks/$id" }) as { from?: string; d?: string; restaurant?: string };
  const fromGallery = search.from === "gallery";
  const restaurantId = search.restaurant;
  const isRestaurant = !!restaurantId;
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string>("classic");
  const [persistedId, setPersistedId] = useState<string | null>(null);
  const [persistedNumericId, setPersistedNumericId] = useState<number | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "save" | "share" | "bar">(null);
  const [mixingVisible, setMixingVisible] = useState(true);
  const mixingStartedAtRef = useRef(Date.now());
  const wasMixingRef = useRef(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const isPreview = !id || id === "preview";
  const isPersisted = !isPreview || persistedId !== null;

  const tapHint = t("result.tap");
  const distillingText = t("result.distilling");
  const cardLabels = {
    originalVibe: t("result.original"),
    tastingNotes: t("result.tasting"),
    ingredients: t("result.ingredients"),
    ingredientsRef: t("result.ingredients.ref"),
    ingredientsBar: t("result.ingredients.bar"),
    howToMake: t("result.howToMake"),
    scanQr: t("result.scanQr"),
  };

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const shareUrl = useMemo(() => {
    if (!cocktail || typeof window === "undefined") return "";
    const rid = persistedId ?? cocktail.publicId ?? null;
    if (rid) return `${window.location.origin}/drinks/${rid}`;
    return "";
  }, [cocktail, persistedId]);
  // QR on the saved/printed card always sends people to the site so they can
  // mix their own drink — not to this specific cocktail.
  const brandQrTarget = "https://vibetail.com/";
  useEffect(() => {
    QRCode.toDataURL(brandQrTarget, { margin: 2, width: 512, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch((err) => { console.error("QR generation failed", err); setQrDataUrl(null); });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getCocktail(id);
      if (cancelled) return;
      if (data) {
        setCocktail(data);
        setImageData(data.imageData ?? null);
        setImageLoading(!data.imageData);
      } else if (search.d) {
        const decoded = decodeCocktailFromHash(search.d);
        if (decoded) {
          setCocktail(decoded);
          setImageData(decoded.imageData ?? null);
          setImageLoading(!decoded.imageData);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, search.d]);

  // Generate watercolor illustration if missing (skip when a brand image URL is supplied)
  useEffect(() => {
    if (!cocktail || imageData || cocktail.imageUrl) return;
    let cancelled = false;
    setImageLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/generate-cocktail-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cocktail.cocktailName,
            ingredients: cocktail.ingredients,
            flavorProfile: cocktail.flavorProfile,
            tastesLike: cocktail.tastesLike,
            recipe: cocktail.recipe,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { imageData?: string };
        if (cancelled || !json.imageData) return;
        setImageData(json.imageData);
        const realNumericId = persistedNumericId ?? cocktail.id;
        if (Number.isFinite(realNumericId) && realNumericId > 0) {
          void updateCocktailImage(realNumericId, json.imageData);
        }
      } catch (e) {
        console.error("cocktail image generation failed", e);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cocktail, imageData]);

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

  // Composite the QR code on top of the captured PNG at a fixed position.
  // QR is generated independently and pasted bottom-right with a clean backdrop.
  const compositeQr = (baseDataUrl: string, qr: string | null): Promise<string> =>
    new Promise((resolve, reject) => {
      const base = new Image();
      base.onload = () => {
        const W = base.naturalWidth;
        const H = base.naturalHeight;
        const bandH = Math.round(W * 0.22);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H + bandH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        // paint the card
        ctx.drawImage(base, 0, 0, W, H);
        // footer band
        const grad = ctx.createLinearGradient(0, H, 0, H + bandH);
        grad.addColorStop(0, "#fdf8f3");
        grad.addColorStop(1, "#f4e7d6");
        ctx.fillStyle = grad;
        ctx.fillRect(0, H, W, bandH);
        // divider
        ctx.fillStyle = "rgba(74,62,61,0.18)";
        ctx.fillRect(Math.round(W * 0.08), H, Math.round(W * 0.84), 1);

        const drawText = () => {
          const pad = Math.round(W * 0.05);
          const qrSize = Math.round(bandH * 0.78);
          const qrX = pad;
          const qrY = H + Math.round((bandH - qrSize) / 2);
          if (qr) {
            // white quiet zone
            ctx.fillStyle = "#ffffff";
            const qz = Math.round(qrSize * 0.06);
            ctx.fillRect(qrX - qz, qrY - qz, qrSize + qz * 2, qrSize + qz * 2);
          }
          // text block
          const textX = qrX + qrSize + Math.round(W * 0.04);
          const textW = W - textX - pad;
          const slogan = "Every mood deserves the perfect pour.";
          const scanLine = "Scan to mix your own → vibetail.com";
          const igLine = "Follow @vibe.tail for more cocktails";

          ctx.fillStyle = "#4a3e3d";
          ctx.textBaseline = "top";
          ctx.font = `600 ${Math.round(bandH * 0.16)}px Georgia, "Times New Roman", serif`;
          const sloganY = H + Math.round(bandH * 0.16);
          wrapText(ctx, slogan, textX, sloganY, textW, Math.round(bandH * 0.19));

          ctx.fillStyle = "#c2410c";
          ctx.font = `700 ${Math.round(bandH * 0.11)}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(scanLine, textX, H + Math.round(bandH * 0.58));

          ctx.fillStyle = "#4a3e3d";
          ctx.font = `500 ${Math.round(bandH * 0.10)}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(igLine, textX, H + Math.round(bandH * 0.78));
        };

        if (!qr) { drawText(); return resolve(canvas.toDataURL("image/png")); }
        const qrImg = new Image();
        qrImg.onload = () => {
          const pad = Math.round(W * 0.05);
          const qrSize = Math.round(bandH * 0.78);
          const qrX = pad;
          const qrY = H + Math.round((bandH - qrSize) / 2);
          drawText();
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve(canvas.toDataURL("image/png"));
        };
        qrImg.onerror = () => { drawText(); resolve(canvas.toDataURL("image/png")); };
        qrImg.src = qr;
      };
      base.onerror = reject;
      base.src = baseDataUrl;
    });

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = w;
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }


  const handleSave = async () => {
    if (!cocktail || !captureRef.current) return;
    track("save_clicked", { cocktail_name: cocktail.cocktailName });
    setSaving(true);
    try {
      const raw = await htmlToImage.toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fdf8f3",
      });
      const dataUrl = await compositeQr(raw, qrDataUrl);
      const filename = `${cocktail.cocktailName.replace(/\s+/g, "-").toLowerCase()}-vibetail.png`;

      // Convert to blob
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string }) => Promise<void>;
      };
      // Prefer Web Share API whenever the browser supports sharing files
      // (Chrome Android, Safari iOS, Edge mobile) — this lets the user save
      // directly to Photos/Files rather than the Downloads folder.
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: cocktail.cocktailName });
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
          // fall through to download fallback
        }
      }

      // Try classic download link (works on desktop and most Android)
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = blobUrl;
      link.rel = "noopener";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // iOS Safari fallback: open image in new tab so user can long-press save
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        window.open(blobUrl, "_blank");
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      console.error("save error", e);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (frameId: string = "none") => {
    if (!cocktail || !captureRef.current) return;
    try {
      const raw = await htmlToImage.toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fdf8f3",
      });
      const dataUrl = await compositeQr(raw, qrDataUrl);
      const frame = FRAME_STYLES.find((f) => f.id === frameId) ?? FRAME_STYLES[0];
      const w = window.open("", "_blank");
      if (!w) return;
      // 2in x 3in card; frame is inset padding around the image
      const html = `<!doctype html><html><head><title>${cocktail.cocktailName} — Vibetail</title>
<style>
  @page { size: 2in 3in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fdf8f3; }
  .sheet { width: 2in; height: 3in; background: #fdf8f3; position: relative; box-sizing: border-box; }
  .frame { position: absolute; inset: 0; box-sizing: border-box; ${frame.outerCss} }
  .inner { position: absolute; inset: ${frame.inset}; box-sizing: border-box; ${frame.innerCss} display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .inner img { max-width:100%; max-height:100%; width:auto; height:auto; display:block; }
  .corner { position:absolute; width:${frame.cornerSize}; height:${frame.cornerSize}; ${frame.cornerCss} }
  .c-tl { top:${frame.cornerOffset}; left:${frame.cornerOffset}; }
  .c-tr { top:${frame.cornerOffset}; right:${frame.cornerOffset}; transform: rotate(90deg); }
  .c-br { bottom:${frame.cornerOffset}; right:${frame.cornerOffset}; transform: rotate(180deg); }
  .c-bl { bottom:${frame.cornerOffset}; left:${frame.cornerOffset}; transform: rotate(270deg); }
  @media print { .sheet { page-break-after: always; } }
</style></head><body>
<div class="sheet">
  <div class="frame"></div>
  ${frame.showCorners ? '<div class="corner c-tl"></div><div class="corner c-tr"></div><div class="corner c-br"></div><div class="corner c-bl"></div>' : ''}
  <div class="inner"><img src="${dataUrl}" onload="setTimeout(function(){window.focus();window.print();},250)" /></div>
</div></body></html>`;
      w.document.write(html);
      w.document.close();
    } catch (e) {
      console.error("print error", e);
    }
  };

  const handleShare = async () => {
    if (!cocktail) return;
    track("share_clicked", { cocktail_name: cocktail.cocktailName });

    let targetId: string | null = persistedId;
    // Try to persist for a clean short URL when signed in. Guests get a
    // self-contained hash link so they can still share without an account.
    if (!targetId && isPreview && user) {
      setPersisting(true);
      try {
        const saved = await saveCocktailFromPreview(cocktail, imageData);
        targetId = saved.publicId ?? null;
        setPersistedId(saved.publicId ?? null);
        setPersistedNumericId(saved.id);
        setCocktail(saved);
      } catch (e) {
        console.error("persist failed", e);
        // fall through to hash-link fallback below
      } finally {
        setPersisting(false);
      }
    }

    targetId = targetId ?? cocktail.publicId ?? null;
    const url = targetId
      ? `${window.location.origin}/drinks/${targetId}`
      : `${window.location.origin}/drinks/preview?d=${encodeCocktailToHash(cocktail)}`;
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

  const doPersist = async () => {
    if (!cocktail || isPersisted || persisting) return;
    setPersisting(true);
    try {
      const saved = await saveCocktailFromPreview(cocktail, imageData);
      setPersistedId(saved.publicId ?? null);
      setPersistedNumericId(saved.id);
      toast.success(lang === "zh" ? "已保存到你的 Vibe Bar" : "Saved to your Vibe Bar");
      if (saved.publicId) {
        navigate({
          to: "/drinks/$id",
          params: { id: saved.publicId },
          search: { ...(restaurantId ? { restaurant: restaurantId } : {}) },
          replace: true,
        });
      }
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_SIGNED_IN") {
        setShowAuth(true);
      } else {
        console.error(e);
        toast.error(lang === "zh" ? "保存失败，请重试" : "Save failed, please retry");
      }
    } finally {
      setPersisting(false);
    }
  };

  const handleSaveToBar = () => {
    if (!user) {
      setPendingAction("bar");
      setShowAuth(true);
      return;
    }
    void doPersist();
  };

  // After user completes auth in the modal, resume the pending action
  useEffect(() => {
    if (!user || !pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setShowAuth(false);
    if (action === "save") void handleSave();
    else if (action === "share") void handleShare();
    else if (action === "bar") void doPersist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const mixingLines =
    lang === "zh"
      ? [
          "正在捕捉你的当下味道…",
          "正在调和你的情绪基酒…",
          "加入一点不理智的香气…",
          "为你的 vibe 倒上最后一滴…",
        ]
      : [
          "Capturing your current flavor…",
          "Blending your emotional base…",
          "Adding a dash of irrational aroma…",
          "Pouring the last drop of your vibe…",
        ];

  const wantsMixingOverlay = loading || (!!cocktail && imageLoading && !cocktail.imageUrl);

  useEffect(() => {
    if (wantsMixingOverlay) {
      if (!wasMixingRef.current) mixingStartedAtRef.current = Date.now();
      wasMixingRef.current = true;
      setMixingVisible(true);
      return;
    }

    wasMixingRef.current = false;
    const elapsed = Date.now() - mixingStartedAtRef.current;
    const remaining = Math.max(0, 4200 - elapsed);
    const timeout = window.setTimeout(() => setMixingVisible(false), remaining);
    return () => window.clearTimeout(timeout);
  }, [wantsMixingOverlay]);

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
        <MixingOverlay open={mixingVisible} lines={mixingLines} />
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
            {cocktail.imageUrl ? (
              <img src={cocktail.imageUrl} alt={cocktail.cocktailName} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : imageData ? (
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
              <span key={f} style={{ padding: "3px 9px", borderRadius: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(210,201,189,0.6)", color: "var(--app-text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--app-text-muted)" }}>{cardLabels.ingredients}</span>
              <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "var(--app-primary)", fontStyle: "italic" }}>· {cardLabels.ingredientsRef}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(cocktail.ingredients as string[]).map((ing, i) => (
                <li key={i} style={{ position: "relative", paddingLeft: 16, fontSize: 13, color: "var(--app-text-secondary)", marginBottom: 8, lineHeight: 1.55, wordBreak: "break-word" }}>
                  <span style={{ position: "absolute", left: 0, top: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--app-primary)" }} />
                  {simplifyIngredient(ing)}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 10, color: "var(--app-text-muted)", fontStyle: "italic", marginTop: 6, marginBottom: 0 }}>{cardLabels.ingredientsBar}</p>
          </div>

          {/* Recipe */}
          {!isRestaurant && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--app-primary)", marginBottom: 12 }}>{cardLabels.howToMake}</div>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {cocktail.recipe.split("\n").filter(Boolean).map((line, i) => (
                  <li key={i} style={{ position: "relative", paddingLeft: 34, minHeight: 24, marginBottom: 12, fontSize: 13, lineHeight: 1.55, color: "var(--app-text-secondary)", wordBreak: "break-word" }}>
                    <span style={{ position: "absolute", left: 0, top: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--app-primary)", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* QR is composited at fixed bottom-right position on the exported image */}
        </div>
      </div>


      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => isRestaurant ? navigate({ to: "/restaurant/$id", params: { id: restaurantId! } }) : fromGallery ? navigate({ to: "/gallery" }) : navigate({ to: "/" })}
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
            <CardFront cocktail={cocktail} imageData={imageData} imageUrl={cocktail.imageUrl ?? null} imageLoading={imageLoading} tapHint={tapHint} distillingText={distillingText} />
            <CardBack cocktail={cocktail} tapHint={tapHint} labels={cardLabels} hideRecipe={isRestaurant} />

          </motion.div>
        </div>
      </div>

      {/* ── Bottom action group: CTAs + community ── */}
      <div className="px-5 pt-3 pb-28 md:pb-8 flex-shrink-0 space-y-3">
        {/* Primary CTAs */}
        <div className="space-y-2">
          {!isPersisted && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSaveToBar}
              disabled={persisting}
              className="w-full py-3 px-4 text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 relative overflow-hidden disabled:opacity-60"
              style={{
                borderRadius: "4px",
                background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
                color: "white",
                boxShadow: "2px 3px 10px rgba(194,65,12,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <span className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
                animation: "liquid-flow 4s linear infinite",
              }} />
              <svg className="w-4 h-4 relative z-10" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 3v18M8 22h8M4 6c0 4.418 3.582 8 8 8s8-3.582 8-8V4H4v2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="relative z-10">
                {persisting
                  ? (lang === "zh" ? "保存中…" : "Saving…")
                  : (lang === "zh" ? "保存到 Vibe Bar" : "Save to Vibe Bar")}
              </span>
            </motion.button>
          )}
          <div className={`grid gap-2 ${isRestaurant ? "grid-cols-3" : "grid-cols-2"}`}>

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
                animation: "liquid-flow 4s linear infinite",
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

            {/* Print — only in restaurant flow */}
            {isRestaurant && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowFramePicker(true)}
                className="py-3 px-4 text-xs font-semibold tracking-wider flex items-center justify-center gap-1.5 transition-all"
                style={{
                  borderRadius: "4px",
                  background: "transparent",
                  color: "var(--app-text-secondary)",
                  border: "1.5px solid rgba(74,62,61,0.3)",
                  boxShadow: "1px 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="var(--app-primary)" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t("result.print")}</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Community card: Follow + Guest list */}
        <NewsletterSection lang={lang} />

        {/* Last secondary action */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => isRestaurant ? navigate({ to: "/restaurant/$id", params: { id: restaurantId! } }) : navigate({ to: "/mood-input" })}
          className="w-full text-xs font-semibold uppercase tracking-widest py-3 text-center block"
          style={{ color: "var(--app-primary)" }}
        >
          {t("result.another")}
        </motion.button>
      </div>



      {/* Frame picker modal — interactive preview */}
      {showFramePicker && (() => {
        const selected = FRAME_STYLES.find((f) => f.id === selectedFrameId) ?? FRAME_STYLES[0];
        // Preview card is 2:3 aspect — match the printed 2in x 3in proportion.
        const PREVIEW_W = 220;
        const PREVIEW_H = 330;
        // Scale "in"-based insets/borders to preview pixels (1in -> PREVIEW_W/2 px).
        const scaleIn = (v: string) => v.replace(/([\d.]+)in/g, (_, n) => `${(parseFloat(n) * PREVIEW_W) / 2}px`);
        const previewOuterCss = scaleIn(selected.outerCss);
        const previewInnerCss = scaleIn(selected.innerCss);
        const previewCornerCss = scaleIn(selected.cornerCss);
        const previewInset = scaleIn(selected.inset);
        const previewCornerSize = scaleIn(selected.cornerSize);
        const previewCornerOffset = scaleIn(selected.cornerOffset);

        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowFramePicker(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-5"
              style={{ background: "#fdf8f3", border: "1px solid rgba(74,62,61,0.15)", maxHeight: "92vh" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: "var(--app-text-primary)", fontFamily: "var(--font-body)" }}>
                  {t("result.chooseFrame") || "Choose a frame"}
                </h3>
                <button onClick={() => setShowFramePicker(false)} className="text-xs w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5" style={{ color: "var(--app-text-muted)" }}>✕</button>
              </div>

              {/* Live preview of the actual card inside the frame */}
              <div className="flex justify-center py-2">
                <div
                  style={{
                    width: PREVIEW_W,
                    height: PREVIEW_H,
                    position: "relative",
                    background: "#fdf8f3",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                    boxSizing: "border-box",
                  }}
                >
                  {/* outer frame border */}
                  <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", pointerEvents: "none", ...parseFrameCss(previewOuterCss) }} />
                  {/* corner ornaments */}
                  {selected.showCorners && (
                    <>
                      {(["tl", "tr", "br", "bl"] as const).map((c, i) => (
                        <div key={c} style={{
                          position: "absolute",
                          width: previewCornerSize,
                          height: previewCornerSize,
                          boxSizing: "border-box",
                          top: c.includes("t") ? previewCornerOffset : undefined,
                          bottom: c.includes("b") ? previewCornerOffset : undefined,
                          left: c.includes("l") ? previewCornerOffset : undefined,
                          right: c.includes("r") ? previewCornerOffset : undefined,
                          transform: `rotate(${i * 90}deg)`,
                          ...parseFrameCss(previewCornerCss),
                        }} />
                      ))}
                    </>
                  )}
                  {/* inner content area */}
                  <div style={{
                    position: "absolute",
                    inset: previewInset || 0,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(160deg, #fdf8f3 0%, #faf0e6 100%)",
                    padding: 10,
                    gap: 6,
                    ...parseFrameCss(previewInnerCss),
                  }}>
                    {/* cocktail thumbnail */}
                    <div style={{ width: "100%", flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {(cocktail?.imageUrl || imageData) ? (
                        <img
                          src={cocktail?.imageUrl ?? `data:image/png;base64,${imageData}`}
                          alt=""
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--app-primary)" strokeWidth="1" opacity="0.4">
                          <path d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--app-text)",
                      textAlign: "center",
                      lineHeight: 1.15,
                      padding: "0 4px",
                    }}>
                      {cocktail?.cocktailName ?? "Vibetail"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Frame swatch row */}
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
                {FRAME_STYLES.map((f) => {
                  const isActive = f.id === selectedFrameId;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFrameId(f.id)}
                      className="flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition flex-shrink-0"
                      style={{
                        background: isActive ? "rgba(224,83,60,0.10)" : "transparent",
                        border: isActive ? "1.5px solid var(--app-primary)" : "1.5px solid transparent",
                      }}
                    >
                      <div style={{ width: 48, height: 72, position: "relative", background: "#fdf8f3", boxSizing: "border-box" }}>
                        <div style={{ position: "absolute", inset: 0, boxSizing: "border-box", ...parseFrameCss(scaleIn(f.outerCss).replace(/(\d+(\.\d+)?)px/g, (_, n) => `${Math.max(1, parseFloat(n) * 48 / PREVIEW_W)}px`)) }} />
                        <div style={{
                          position: "absolute",
                          inset: f.id === "none" ? 3 : 6,
                          background: "linear-gradient(160deg,#e0533c33,#b8893a22)",
                          borderRadius: 1,
                        }} />
                      </div>
                      <span className="text-[9px] tracking-wider uppercase whitespace-nowrap" style={{ color: isActive ? "var(--app-primary)" : "var(--app-text-secondary)", fontFamily: "var(--font-body)" }}>
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFramePicker(false)}
                  className="flex-1 py-3 text-xs font-semibold tracking-wider uppercase rounded transition"
                  style={{
                    background: "transparent",
                    color: "var(--app-text-secondary)",
                    border: "1.5px solid rgba(74,62,61,0.3)",
                  }}
                >
                  {t("result.cancel") || "Cancel"}
                </button>
                <button
                  onClick={() => { setShowFramePicker(false); handlePrint(selectedFrameId); }}
                  className="flex-1 py-3 text-xs font-semibold tracking-wider uppercase rounded transition"
                  style={{
                    background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
                    color: "white",
                    border: "none",
                    boxShadow: "2px 3px 12px rgba(194,65,12,0.25)",
                  }}
                >
                  {t("result.print") || "Print"}
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      <MixingOverlay
        open={mixingVisible}
        lines={mixingLines}
      />
    </div>
  );
}

/** Convert a small subset of inline CSS string into a React style object for the preview swatches. */
function parseFrameCss(css: string): CSSProperties {
  const style: Record<string, string> = {};
  css.split(";").forEach((rule) => {
    const idx = rule.indexOf(":");
    if (idx < 0) return;
    const key = rule.slice(0, idx).trim();
    const val = rule.slice(idx + 1).trim();
    if (!key || !val) return;
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    style[camel] = val;
  });
  return style as CSSProperties;
}

function NewsletterSection({ lang }: { lang: "zh" | "en" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const copy = lang === "zh"
    ? {
        title: "喜欢你的这杯吗？",
        body: "我们围绕酒、心情和人做各种小游戏。",
        ig: "关注 @vibe.tail",
        emailLabel: "留下邮箱",
        emailHint: "第一时间试玩我们的新游戏。",
        placeholder: "your@email.com",
        submit: "订阅",
        submitting: "订阅中…",
        done: "已订阅 ✓",
        invalid: "请输入有效的邮箱",
        error: "订阅失败，请稍后再试",
        already: "这个邮箱已经订阅过啦 ✓",
      }
    : {
        title: "Like your cocktail?",
        body: "We build tiny games around drinks, vibes, and people.",
        ig: "Follow @vibe.tail",
        emailLabel: "Leave your email",
        emailHint: "to try new games before everyone else.",
        placeholder: "your@email.com",
        submit: "Subscribe",
        submitting: "Subscribing…",
        done: "Subscribed ✓",
        invalid: "Please enter a valid email",
        error: "Something went wrong. Try again.",
        already: "You're already on the list ✓",
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error(copy.invalid);
      return;
    }
    setStatus("loading");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed, source: "cocktail_card" });
    if (error) {
      if (error.code === "23505") {
        toast.success(copy.already);
        setStatus("done");
        track("email_submitted", { already_subscribed: true });
        return;
      }
      console.error("newsletter subscribe failed", error);
      toast.error(copy.error);
      setStatus("idle");
      return;
    }
    toast.success(copy.done);
    setStatus("done");
    track("email_submitted");
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(255, 255, 255, 0.50)",
        border: "1px solid rgba(210, 201, 189, 0.45)",
      }}
    >
      <div className="space-y-0.5">
        <h3
          className="text-base font-semibold leading-snug"
          style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}
        >
          {copy.title}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
          {copy.body}
        </p>
      </div>

      <a
        href="https://instagram.com/vibe.tail"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("instagram_clicked")}
        className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
        style={{ color: "var(--app-primary)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {copy.ig}
      </a>

      <div className="space-y-1.5">
        <div className="text-xs font-medium" style={{ color: "var(--app-text)" }}>
          {copy.emailLabel}
        </div>
        <p className="text-xs" style={{ color: "var(--app-text-secondary)" }}>
          {copy.emailHint}
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2 pt-0.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status !== "idle"}
            placeholder={copy.placeholder}
            className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-md outline-none disabled:opacity-60"
            style={{
              background: "white",
              border: "1px solid rgba(74,62,61,0.25)",
              color: "var(--app-text)",
            }}
          />
          <button
            type="submit"
            disabled={status !== "idle"}
            className="px-4 py-2.5 text-xs font-semibold tracking-wider rounded-md disabled:opacity-60 whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
              color: "white",
              boxShadow: "0 2px 8px rgba(194,65,12,0.25)",
            }}
          >
            {status === "loading" ? copy.submitting : status === "done" ? "✓" : copy.submit}
          </button>
        </form>
      </div>
    </div>
  );
}


