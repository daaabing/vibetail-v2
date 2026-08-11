import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import * as htmlToImage from "html-to-image";
import QRCode from "qrcode";
import {
  type Cocktail,
  decodeCocktailFromHash,
  encodeCocktailToHash,
  getCocktail,
  saveCocktailFromPreview,
  updateCocktailImage,
} from "@/lib/cocktails-store";
import { useLang } from "@/lib/i18n";
import { loadingLines } from "@/lib/vibeflow";
import { useAuth } from "@/lib/use-auth";
import AuthModal from "@/components/moodtail/AuthModal";
import MixingOverlay from "@/components/moodtail/MixingOverlay";
import GuestList from "@/components/site/GuestList";
import Draw from "@/components/draw/art";
import { ROUGH } from "@/components/draw/Sketch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

import { useSharePosterPreparation } from "@/hooks/use-share-poster";
import { getPublishedMenu } from "@/lib/menu/public.functions";
import type { PublicMenu, PublicMenuItem } from "@/lib/matching/types";

/** Strip quantity / measurement prefixes from AI-generated ingredient strings. */
function simplifyIngredient(name: string): string {
  return name
    .replace(
      /^\d+(\.\d+)?\s*(oz|ounces?|tsps?|tbsps?|ml|cl|cups?|parts?|shots?|drops?|pinch(es)?|dash(es)?|splash(es)?|squeezes?|sprigs?|slices?|pieces?|crushed|g|kg|lb|oz\.|tsp\.|tbsp\.)\b\s*(of\s+)?/i,
      "",
    )
    .replace(
      /^[Aa]n?\s+(garnish|splash|squeeze|dash|sprig|twist|pinch|drop|slice|piece)\s*(of\s+)?/i,
      "",
    )
    .replace(/^Topped with\s+/i, "")
    .replace(/^Garnish:\s*[Aa]n?\s*/i, "")
    .replace(/^Garnish:\s*/i, "")
    .trim();
}

// Image background processing removed — Gemini now renders drinks directly on
// parchment (#E9DBC4), so we display the returned image as-is.

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
    outerCss:
      "border: 2px dashed #6b4a2b; box-shadow: inset 0 0 0 4px #fdf8f3, inset 0 0 0 5px #6b4a2b;",
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
    outerCss:
      "border: 1px solid #4a3e3d; box-shadow: inset 0 0 0 3px #fdf8f3, inset 0 0 0 4px #4a3e3d;",
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

/* ── The brand's line-drawn guests. One is picked per drink (stable by
   serial) and drawn onto the drink, black ink on the paper card. Art is
   white line-work from the Figma brand board, inverted via CSS filter. ── */
const CARD_GUESTS = [
  // lounging in the glass, bottles mid-air
  { src: "/brand/ill-party.png", width: "42%", left: "50%", top: "1%", tx: "-46%", rotate: 0 },
  // legs kicked over the rim
  { src: "/brand/ill-legs.png", width: "28%", left: "54%", top: "16%", tx: "0%", rotate: 8 },
  // a face leaning in for a sip
  { src: "/brand/ill-face.png", width: "36%", left: "8%", top: "22%", tx: "0%", rotate: -4 },
  // a hand presenting the drink
  { src: "/brand/ill-hand-open.png", width: "46%", left: "50%", top: "58%", tx: "-58%", rotate: -8 },
  // two tiny guests sitting on the rim
  { src: "/brand/ill-sitters.png", width: "36%", left: "32%", top: "12%", tx: "0%", rotate: 0 },
] as const;

function guestForSerial(serial: string) {
  let h = 0;
  for (const ch of serial) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_GUESTS[h % CARD_GUESTS.length];
}

/* ── The card — a note taped up on the wall behind the bar ── */
function SpecimenCard({
  cocktail,
  illustration,
  imageLoading,
  distillingText,
  serial,
}: {
  cocktail: Cocktail;
  illustration: string | null;
  imageLoading: boolean;
  distillingText: string;
  serial: string;
}) {
  const tags =
    Array.isArray((cocktail as { flavorKeywords?: string[] }).flavorKeywords) &&
    (cocktail as { flavorKeywords?: string[] }).flavorKeywords!.length > 0
      ? (cocktail as { flavorKeywords?: string[] }).flavorKeywords!
      : cocktail.flavorProfile.split(",").map((s) => s.trim());

  // The venue's own photograph wins whenever there is one — we only knock the
  // background out so the glass sits on the paper. Otherwise the AI
  // illustration, and failing that a drawn glass.
  const photo = cocktail.menuItemImageUrl ?? illustration;
  const guest = guestForSerial(serial);

  return (
    <article
      className="paper-pocket pocket-card frame-gilt relative"
      style={{ background: "var(--paper-card)" }}
    >
      <div className="grain-layer" aria-hidden style={{ opacity: 0.32 }} />

      {/* ── Masthead — set like a poster ── */}
      <div className="relative px-9 pt-10 text-center">
        <div className="mono-sm" style={{ letterSpacing: "0.3em" }}>
          {cocktail.matchedFromMenu
            ? (cocktail.restaurantName ?? "From the menu").toUpperCase()
            : "VIBETAL(E.) — TONIGHT'S POUR"}
        </div>
        <h1
          className="display mx-auto mt-6 max-w-[22ch] text-[clamp(30px,5vw,42px)] leading-[1.06]"
          style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}
        >
          {cocktail.cocktailName}
        </h1>
        <p
          className="accent-italic mx-auto mt-4 max-w-[34ch] text-[21px] leading-snug"
          style={{ color: "var(--ink-mute)" }}
        >
          &ldquo;{cocktail.originalMood}&rdquo;
        </p>
      </div>

      {/* ── The drink, centered in a unified slot, with the house guest
             drawn onto it ── */}
      <div
        className="relative mx-auto mt-2 flex items-center justify-center px-10"
        style={{ width: "100%", aspectRatio: "1/1", maxHeight: 380 }}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={cocktail.cocktailName}
              className="drink-cutout max-h-full max-w-full"
              style={{ objectFit: "contain" }}
            />
          ) : imageLoading ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="shimmer h-28 w-28 rounded-full" />
              <span className="scrawl-sm">{distillingText}</span>
            </div>
          ) : (
            <span className="block" style={{ width: "52%", color: "var(--ink)" }}>
              <Draw name="glass" strokeWidth={2} />
            </span>
          )}

          {!imageLoading && (
            <img
              src={guest.src}
              alt=""
              aria-hidden
              draggable={false}
              style={{
                position: "absolute",
                width: guest.width,
                left: guest.left,
                top: guest.top,
                transform: `translateX(${guest.tx}) rotate(${guest.rotate}deg)`,
                // brand art is white line-work — invert to ink for the paper card
                filter: "invert(0.92)",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>

      {/* ── Colophon — description on the left, the tone on the right ── */}
      <div className="relative px-10 pb-9 pt-2">
        <span
          className="mx-auto block h-px w-12"
          aria-hidden
          style={{ background: "var(--line-strong)" }}
        />
        <div className="mt-6 grid grid-cols-[1.4fr_0.9fr] items-start gap-8">
          <p className="note text-left text-[13.5px] leading-relaxed" style={{ maxWidth: "36ch" }}>
            {cocktail.roast}
          </p>
          <div className="flex flex-col items-end gap-1.5">
            {tags.slice(0, 5).map((f) => (
              <span key={f} className="scrawl-sm" style={{ letterSpacing: "0.24em", textAlign: "right" }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between">
          <span className="specimen-no">No. {serial}</span>
          <span className="signature text-[25px]" style={{ color: "var(--ink-mute)" }}>
            Vibetail
          </span>
        </div>
      </div>
    </article>
  );
}

/* ── Dossier — everything behind the card, laid out in the open ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="py-6" style={{ borderTop: "1px solid var(--line)" }}>
      <div className="mono-sm mb-3">{label}</div>
      {children}
    </section>
  );
}

function Dossier({
  cocktail,
  labels,
  hideRecipe,
}: {
  cocktail: Cocktail;
  labels: {
    originalVibe: string;
    tastingNotes: string;
    ingredients: string;
    ingredientsBar: string;
    howToMake: string;
  };
  hideRecipe?: boolean;
}) {
  const recipeLines = cocktail.recipe.split("\n").filter(Boolean);

  return (
    <div>
      {cocktail.matchedFromMenu && (
        <Field label={"Order this"}>
          <div className="flex items-center gap-4">
            {cocktail.menuItemImageUrl && (
              <img
                src={cocktail.menuItemImageUrl}
                alt={cocktail.menuItemName ?? cocktail.cocktailName}
                className="h-20 w-20 flex-none object-cover"
                style={{ border: "1px solid var(--line)" }}
              />
            )}
            <p className="display text-[20px] leading-snug">
              {cocktail.menuItemName || cocktail.cocktailName}
              {cocktail.menuPrice ? ` · ${cocktail.menuPrice}` : ""}
              {cocktail.restaurantName ? (
                <span className="mono-sm mt-1 block">@ {cocktail.restaurantName}</span>
              ) : null}
            </p>
          </div>
          {cocktail.fullMenuUrl && (
            <a
              className="link-ul mono-sm mt-4 inline-block"
              href={cocktail.fullMenuUrl}
              target="_blank"
              rel="noreferrer"
            >
              {"View full menu →"}
            </a>
          )}
        </Field>
      )}

      <Field label={cocktail.matchedFromMenu ? "Why this one" : labels.tastingNotes}>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {cocktail.matchedFromMenu
            ? cocktail.whyThisMatch || cocktail.tastesLike
            : cocktail.tastesLike}
        </p>
      </Field>

      <Field label={labels.ingredients}>
        <ul>
          {(cocktail.ingredients as string[]).map((ing, i) => (
            <li
              key={i}
              className="grid grid-cols-[30px_1fr] gap-3 py-2"
              style={{ borderBottom: "1px solid var(--line-soft)" }}
            >
              <span className="specimen-no pt-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="note text-[17px] leading-snug">{ing}</span>
            </li>
          ))}
        </ul>
        <p className="mono-sm mt-3">{labels.ingredientsBar}</p>
      </Field>

      {!hideRecipe && (
        <Field label={labels.howToMake}>
          <ol className="space-y-4">
            {recipeLines.map((line, i) => (
              <li key={i} className="grid grid-cols-[30px_1fr] gap-3">
                <span className="specimen-no pt-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[15px] leading-relaxed">{line}</span>
              </li>
            ))}
          </ol>
        </Field>
      )}

      <Field label={labels.originalVibe}>
        <p className="serif-italic text-[17px] leading-relaxed">
          &ldquo;{cocktail.originalMood}&rdquo;
        </p>
      </Field>
    </div>
  );
}

/* ── Main screen ── */
export default function ResultCardScreen({ id }: ResultCardScreenProps) {
  const navigate = useNavigate();
  const search = useSearch({ from: "/drinks/$id" }) as {
    from?: string;
    d?: string;
    restaurant?: string;
    menu?: string;
  };
  const fromGallery = search.from === "gallery";
  const restaurantId = search.restaurant;
  const menuSlug = search.menu;
  const isRestaurant = !!restaurantId;
  const goToRestaurant = () => {
    if (menuSlug && restaurantId) {
      navigate({
        to: "/m/$merchantSlug/$menuSlug",
        params: { merchantSlug: restaurantId, menuSlug },
      });
    } else if (restaurantId === "double-chicken-please") {
      navigate({ to: "/restaurants/double-chicken-please" });
    } else {
      navigate({ to: "/restaurant/$id", params: { id: restaurantId! } });
    }
  };
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [loading, setLoading] = useState(true);
  // Figma capture mode: keep overlays and offscreen capture targets out of the DOM snapshot.
  const [figMode, setFigMode] = useState(false);
  // "See more" — the full order, and (at a venue) the rest of the shelf.
  const [seeMore, setSeeMore] = useState(false);
  const [publicMenu, setPublicMenu] = useState<PublicMenu | null>(null);
  const menuFetchedRef = useRef(false);
  useEffect(() => {
    if (window.location.hash.includes("figmacapture")) setFigMode(true);
  }, []);

  useEffect(() => {
    if (!seeMore || menuFetchedRef.current || !restaurantId || !menuSlug) return;
    menuFetchedRef.current = true;
    getPublishedMenu({ data: { merchantSlug: restaurantId, menuSlug } })
      .then((m) => setPublicMenu(m))
      .catch(() => {
        // the shelf stays closed; the order still shows
      });
  }, [seeMore, restaurantId, menuSlug]);
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

  const illustrationSource = imageData
    ? `data:image/png;base64,${imageData}`
    : cocktail?.matchedFromMenu
      ? null
      : (cocktail?.imageUrl ?? null);

  const isPreview = !id || id === "preview";
  const isPersisted = !isPreview || persistedId !== null;

  const tapHint = cocktail?.matchedFromMenu ? t("result.tap.menu") : t("result.tap");

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
    QRCode.toDataURL(brandQrTarget, {
      margin: 2,
      width: 512,
      errorCorrectionLevel: "M",
      color: { dark: "#2A2118", light: "#00000000" },
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.error("QR generation failed", err);
        setQrDataUrl(null);
      });
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
    return () => {
      cancelled = true;
    };
  }, [id, search.d]);

  // Generate watercolor illustration if missing. In restaurant mode, menu photos
  // live in menuItemImageUrl only; the front/save illustration must still be AI watercolor.
  useEffect(() => {
    if (!cocktail || imageData || (!cocktail.matchedFromMenu && cocktail.imageUrl)) return;
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
            merchant: cocktail.matchedFromMenu
              ? {
                  actualDrinkName: cocktail.menuItemName ?? "",
                  actualDrinkDescription: cocktail.menuItemDescription ?? "",
                  actualDrinkIngredients:
                    cocktail.menuItemIngredients ?? cocktail.ingredients ?? [],
                  vibeDrinkName: cocktail.cocktailName,
                  vibeDescription: cocktail.tastesLike,
                  whyThisMatch: cocktail.whyThisMatch ?? "",
                  toneKeywords: cocktail.flavorProfile,
                }
              : undefined,
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
        const contentH = H + bandH;
        // Square 1:1 output ("2x2"). Side = max(W, contentH); pad the shorter axis with parchment.
        const S = Math.max(W, contentH);
        const offsetX = Math.round((S - W) / 2);
        const offsetY = Math.round((S - contentH) / 2);
        const canvas = document.createElement("canvas");
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));

        // Fill full square with parchment gradient background
        const bgGrad = ctx.createRadialGradient(S / 2, S * 0.4, S * 0.1, S / 2, S / 2, S * 0.75);
        bgGrad.addColorStop(0, "#F3E8D6");
        bgGrad.addColorStop(0.6, "#E9DBC4");
        bgGrad.addColorStop(1, "#C9B79A");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, S, S);

        // paint the card
        ctx.drawImage(base, offsetX, offsetY, W, H);
        // footer band — same parchment tones as the card face
        const grad = ctx.createLinearGradient(0, offsetY + H, 0, offsetY + H + bandH);
        grad.addColorStop(0, "#F3E8D6");
        grad.addColorStop(0.55, "#E9DBC4");
        grad.addColorStop(1, "#DCC9AC");
        ctx.fillStyle = grad;
        ctx.fillRect(offsetX, offsetY + H, W, bandH);
        // divider
        ctx.fillStyle = "rgba(80,55,30,0.20)";
        ctx.fillRect(offsetX + Math.round(W * 0.08), offsetY + H, Math.round(W * 0.84), 1);

        const drawText = () => {
          const pad = Math.round(W * 0.05);
          const qrSize = Math.round(bandH * 0.72);
          const qrX = offsetX + pad;
          const qrY = offsetY + H + Math.round((bandH - qrSize) / 2);
          // text block
          const textX = qrX + qrSize + Math.round(W * 0.04);
          const textW = W - pad - (textX - offsetX);
          const slogan = "Every mood deserves the perfect pour.";
          const scanLine = "Scan to mix your own → vibetail.com";
          const igLine = "Follow @vibe.tail for more cocktails";

          ctx.fillStyle = "#2A2118";
          ctx.textBaseline = "top";
          ctx.font = `600 ${Math.round(bandH * 0.16)}px "Cormorant Garamond", Georgia, serif`;
          const sloganY = offsetY + H + Math.round(bandH * 0.18);
          wrapText(ctx, slogan, textX, sloganY, textW, Math.round(bandH * 0.2));

          ctx.fillStyle = "#8A7A62";
          ctx.font = `600 ${Math.round(bandH * 0.11)}px "Cormorant Garamond", Georgia, serif`;
          ctx.fillText(scanLine, textX, offsetY + H + Math.round(bandH * 0.58));

          ctx.fillStyle = "#8A7A62";
          ctx.font = `500 ${Math.round(bandH * 0.1)}px "Cormorant Garamond", Georgia, serif`;
          ctx.fillText(igLine, textX, offsetY + H + Math.round(bandH * 0.8));

          return { qrX, qrY, qrSize };
        };

        if (!qr) {
          drawText();
          return resolve(canvas.toDataURL("image/png"));
        }
        const qrImg = new Image();
        qrImg.onload = () => {
          const { qrX, qrY, qrSize } = drawText();
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve(canvas.toDataURL("image/png"));
        };
        qrImg.onerror = () => {
          drawText();
          resolve(canvas.toDataURL("image/png"));
        };
        qrImg.src = qr;
      };
      base.onerror = reject;
      base.src = baseDataUrl;
    });

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lineH: number,
  ) {
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

  const downloadDataUrl = async (dataUrl: string, filename: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = blobUrl;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const waitForCaptureImages = async (root: HTMLElement) => {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        if (img.complete && img.naturalWidth > 0) return;
        if (typeof img.decode === "function") {
          try {
            await img.decode();
            if (img.naturalWidth > 0) return;
          } catch {
            // fall through to onload wait
          }
        }
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 2500);
          img.onload = () => {
            window.clearTimeout(timeout);
            resolve();
          };
          img.onerror = () => {
            window.clearTimeout(timeout);
            resolve();
          };
        });
      }),
    );
  };

  const sharePreparedFile = async (file: File, dataUrl: string, filename: string) => {
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title?: string }) => Promise<void>;
    };
    // Only use the Web Share sheet on touch devices (phones/tablets). On
    // desktop browsers the share sheet is either missing or a poor UX —
    // always trigger a direct download instead.
    const isTouch =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    if (isTouch && nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: cocktail?.cocktailName ?? "Vibetail" });
      return;
    }
    await downloadDataUrl(dataUrl, filename);
  };

  // Background pre-generation of the dedicated 2:3 share poster.
  const shareFilename = cocktail
    ? `${cocktail.cocktailName.replace(/\s+/g, "-").toLowerCase()}-vibetail.png`
    : "vibetail.png";
  const sharePoster = useSharePosterPreparation({
    cocktail,
    cocktailId: cocktail?.id ?? cocktail?.publicId ?? null,
    illustrationSource,
    qrDataUrl,
    filename: shareFilename,
    lang,
    enabled: !!cocktail && !!illustrationSource,
  });

  const handleSave = async () => {
    if (!cocktail) return;
    if (!illustrationSource) {
      toast.info("Illustration still brewing — one moment");
      return;
    }
    if (sharePoster.status === "error") {
      sharePoster.retry();
      return;
    }
    if (sharePoster.status !== "ready" || !sharePoster.file || !sharePoster.dataUrl) {
      toast.info("Preparing your card…");
      return;
    }
    track("save_clicked", { cocktail_name: cocktail.cocktailName });
    setSaving(true);
    try {
      try {
        await sharePreparedFile(sharePoster.file, sharePoster.dataUrl, shareFilename);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          await downloadDataUrl(sharePoster.dataUrl, shareFilename);
        }
      }
    } catch (e) {
      console.error("save error", e);
      toast.error("Save failed, please retry");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (frameId: string = "none") => {
    if (!cocktail || !captureRef.current) return;
    try {
      await waitForCaptureImages(captureRef.current);
      const raw = await htmlToImage.toPng(captureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#F3E8D6",
        skipFonts: true,
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
  ${frame.showCorners ? '<div class="corner c-tl"></div><div class="corner c-tr"></div><div class="corner c-br"></div><div class="corner c-bl"></div>' : ""}
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
      toast.success("Saved to your Vibe Bar");
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
        toast.error("Save failed, please retry");
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

  const mixingLines = loadingLines(lang, !!cocktail?.matchedFromMenu);

  const wantsMixingOverlay = loading || (!!cocktail && imageLoading && !illustrationSource);

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
      <div className="noir min-h-svh" style={{ background: "var(--paper)" }}>
        <div className="shell-narrow flex min-h-svh flex-col py-6">
          <div className="shimmer mb-6 h-4 w-32" />
          <div className="shimmer w-full" style={{ aspectRatio: "3/4" }} />
          <MixingOverlay open={mixingVisible && !figMode} lines={mixingLines} />
        </div>
      </div>
    );
  }

  if (!cocktail) {
    return (
      <div
        className="noir flex min-h-svh flex-col items-center justify-center gap-4 p-5 text-center"
        style={{ background: "var(--paper)" }}
      >
        <p className="display text-2xl">{"This drink isn't on the shelf."}</p>
        <button className="btn btn-gilt" onClick={() => navigate({ to: "/mood-input" })}>
          {"Mix another"}
        </button>
      </div>
    );
  }

  // A stable four-character catalogue number: the public id once the drink has
  // been saved, otherwise a hash of the name so previews still read as filed.
  const serial = makeSerial(
    persistedId ?? cocktail.publicId ?? `${cocktail.cocktailName}|${cocktail.originalMood}`,
  );

  return (
    <div className="noir relative flex min-h-svh flex-col" style={{ background: "var(--paper)" }}>
      {/* Offscreen capture target — flat long image, no card frame */}
      <div
        aria-hidden
        style={{
          display: figMode ? "none" : undefined,
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
            background:
              "radial-gradient(ellipse at 50% 35%, #F3E8D6 0%, #E9DBC4 55%, #C9B79A 100%)",
            padding: "44px 44px 48px",
            fontFamily: "var(--font-heading)",
            color: "#2A2118",
            border: "1px solid rgba(80,60,40,0.18)",
            boxShadow: "inset 0 0 80px rgba(80,55,30,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          {/* Hero image — printed directly onto parchment */}
          <div
            style={{
              width: "100%",
              height: 480,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            {illustrationSource ? (
              <img
                src={illustrationSource}
                alt={cocktail.cocktailName}
                crossOrigin="anonymous"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                  mixBlendMode: "multiply",
                }}
              />
            ) : (
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8A7A62"
                strokeWidth="0.8"
                opacity="0.3"
              >
                <path
                  d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {/* Name */}
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              color: "#2A2118",
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.15,
              textAlign: "center",
              margin: 0,
            }}
          >
            {cocktail.cocktailName}
          </h2>

          {/* Roast */}
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              color: "#5C4A36",
              fontSize: 16,
              lineHeight: 1.45,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            "{cocktail.roast}"
          </p>

          {/* Flavor keywords */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 16,
            }}
          >
            {(Array.isArray((cocktail as { flavorKeywords?: string[] }).flavorKeywords) &&
            (cocktail as { flavorKeywords?: string[] }).flavorKeywords!.length > 0
              ? (cocktail as { flavorKeywords?: string[] }).flavorKeywords!
              : cocktail.flavorProfile.split(",").map((s: string) => s.trim())
            ).map((f: string) => (
              <span
                key={f}
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontFamily: "var(--font-heading)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  background: "rgba(80,55,30,0.06)",
                  border: "1px solid rgba(80,55,30,0.25)",
                  color: "#2A2118",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {f.trim()}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(80,55,30,0.20)", margin: "28px 0 24px" }} />

          {/* Order this — only for menu matches */}
          {cocktail.matchedFromMenu && (
            <div
              style={{
                marginBottom: 20,
                padding: 14,
                borderRadius: 14,
                background: "rgba(80,55,30,0.08)",
                border: "1px solid rgba(80,55,30,0.18)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#2A2118",
                  marginBottom: 8,
                }}
              >
                {"Order this"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {cocktail.menuItemImageUrl && (
                  <img
                    src={cocktail.menuItemImageUrl}
                    alt={cocktail.menuItemName ?? cocktail.cocktailName}
                    crossOrigin="anonymous"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      objectFit: "cover",
                      border: "1px solid rgba(80,55,30,0.18)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <p
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "#2A2118",
                    margin: 0,
                  }}
                >
                  {cocktail.menuItemName || cocktail.cocktailName}
                  {cocktail.menuPrice ? ` · ${cocktail.menuPrice}` : ""}
                  {cocktail.restaurantName ? ` @ ${cocktail.restaurantName}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Original vibe */}
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              borderRadius: 14,
              background: "rgba(80,55,30,0.05)",
              border: "1px solid rgba(80,55,30,0.15)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#8A7A62",
                marginBottom: 6,
              }}
            >
              {cardLabels.originalVibe}
            </div>
            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                color: "#2A2118",
                fontSize: 14,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              "{cocktail.originalMood}"
            </p>
          </div>

          {/* Tasting notes / Why this one */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#8A7A62",
                marginBottom: 6,
              }}
            >
              {cocktail.matchedFromMenu ? "Why this one" : cardLabels.tastingNotes}
            </div>
            <p
              style={{
                fontFamily: "var(--font-heading)",
                color: "#2A2118",
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {cocktail.matchedFromMenu
                ? cocktail.whyThisMatch || cocktail.tastesLike
                : cocktail.tastesLike}
            </p>
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#8A7A62",
                }}
              >
                {cardLabels.ingredients}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 9,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#8A7A62",
                  fontStyle: "italic",
                }}
              >
                · {cardLabels.ingredientsRef}
              </span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(cocktail.ingredients as string[]).map((ing, i) => (
                <li
                  key={i}
                  style={{
                    position: "relative",
                    paddingLeft: 16,
                    fontFamily: "var(--font-heading)",
                    fontSize: 13,
                    color: "#2A2118",
                    marginBottom: 8,
                    lineHeight: 1.55,
                    wordBreak: "break-word",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#2A2118",
                    }}
                  />
                  {simplifyIngredient(ing)}
                </li>
              ))}
            </ul>
            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 10,
                color: "#8A7A62",
                fontStyle: "italic",
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              {cardLabels.ingredientsBar}
            </p>
          </div>

          {/* Recipe */}
          {!isRestaurant && (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "rgba(80,55,30,0.08)",
                border: "1px solid rgba(80,55,30,0.18)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#2A2118",
                  marginBottom: 12,
                }}
              >
                {cardLabels.howToMake}
              </div>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {cocktail.recipe
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <li
                      key={i}
                      style={{
                        position: "relative",
                        paddingLeft: 34,
                        minHeight: 24,
                        marginBottom: 12,
                        fontFamily: "var(--font-heading)",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "#2A2118",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#2A2118",
                          color: "#F3E8D6",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {i + 1}
                      </span>
                      {line}
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {/* QR is composited at fixed bottom-right position on the exported image */}
        </div>
      </div>

      {/* Saved 2:3 poster is rendered entirely on canvas via
          useSharePosterPreparation — no offscreen React node needed. */}

      {/* Top bar */}
      <div
        className="sticky top-0 z-30"
        style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}
      >
        <div className="shell-narrow flex items-center justify-between py-3.5">
          <button
            type="button"
            onClick={() =>
              isRestaurant
                ? goToRestaurant()
                : fromGallery
                  ? navigate({ to: "/gallery" })
                  : navigate({ to: "/" })
            }
            className="mono flex items-center gap-2"
          >
            <span aria-hidden>←</span>
            {fromGallery ? t("gallery.title") : t("result.home")}
          </button>
          <span className="mono-sm" style={{ color: "var(--gold)" }}>
            {t("result.checked")}
          </span>
        </div>
      </div>

      {/* ── The card ── */}
      <div className="shell-narrow pb-28 pt-8 md:pb-14">
        <div className="mx-auto" style={{ maxWidth: 460 }}>
          <SpecimenCard
            cocktail={cocktail}
            illustration={illustrationSource}
            imageLoading={imageLoading}
            distillingText={distillingText}
            serial={serial}
          />
        </div>

        {/* ── Actions ── */}
        <div className="mx-auto mt-7 flex flex-wrap gap-2" style={{ maxWidth: 460 }}>
          <button
            className="btn btn-solid flex-1"
            onClick={handleSave}
            disabled={saving || sharePoster.status === "preparing"}
          >
            {saving
              ? t("result.saving")
              : sharePoster.status === "preparing"
                ? "Preparing…"
                : sharePoster.status === "error"
                  ? "Retry"
                  : t("result.save")}
          </button>
          <button
            className="btn btn-outline flex-1"
            onClick={handleShare}
            style={copied ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined}
          >
            {copied ? t("result.copied") : t("result.share")}
          </button>
          {isRestaurant && (
            <button className="btn btn-outline flex-1" onClick={() => setShowFramePicker(true)}>
              {t("result.print")}
            </button>
          )}
        </div>

        {!isPersisted && (
          <div className="mx-auto mt-2 flex" style={{ maxWidth: 460 }}>
            <button
              className="btn btn-outline w-full"
              onClick={handleSaveToBar}
              disabled={persisting}
            >
              {persisting ? "Saving…" : "Save to Vibe Bar"}
            </button>
          </div>
        )}

        {/* ── Dossier ── */}
        <div className="mx-auto mt-12" style={{ maxWidth: 560 }}>
          <Dossier cocktail={cocktail} labels={cardLabels} hideRecipe={isRestaurant} />
        </div>

        {/* ── See more — every choice behind the pour, then the shelf ── */}
        <div className="mx-auto mt-10" style={{ maxWidth: 560 }}>
          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={() => setSeeMore((o) => !o)}
            aria-expanded={seeMore}
          >
            {seeMore ? "See less" : "See more"}
            <span aria-hidden style={{ transform: seeMore ? "rotate(180deg)" : "none" }}>
              ⌄
            </span>
          </button>

          {seeMore && (
            <div className="mt-9">
              <div className="mono-sm mb-1" style={{ color: "var(--gold)" }}>
                {"The order — everything you told us"}
              </div>
              {(
                [
                  ["The mood", cocktail.originalMood],
                  ["The flavours", (cocktail.selectedFlavors ?? []).join(", ")],
                  ["The profile", cocktail.flavorProfile],
                  ["The ask", cocktail.customPreference],
                ] as const
              )
                .filter(([, v]) => v && String(v).trim())
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[120px_1fr] items-baseline gap-4 py-3.5"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <span className="mono-sm">{k}</span>
                    <span className="note text-[15px] leading-snug">{String(v)}</span>
                  </div>
                ))}

              {publicMenu && publicMenu.items.length > 0 && (
                <div className="mt-10">
                  <div className="mono-sm mb-1" style={{ color: "var(--gold)" }}>
                    {"The rest of the shelf"}
                    {cocktail.restaurantName ? ` — ${cocktail.restaurantName}` : ""}
                  </div>
                  {publicMenu.items.map((item: PublicMenuItem) => {
                    const soldOut = item.availabilityStatus === "sold_out";
                    const isThisOne =
                      !!cocktail.menuItemName && item.name === cocktail.menuItemName;
                    return (
                      <div
                        key={item.id}
                        className="flex items-baseline justify-between gap-4 py-3.5"
                        style={{
                          borderBottom: "1px solid var(--line)",
                          opacity: soldOut ? 0.45 : 1,
                        }}
                      >
                        <div className="min-w-0">
                          <span
                            className="block text-[17px] leading-tight"
                            style={{
                              fontFamily: "var(--font-display)",
                              color: isThisOne ? "var(--gold-bright)" : "var(--ink)",
                            }}
                          >
                            {item.name}
                            {isThisOne ? "  ·  yours" : ""}
                          </span>
                          {item.description ? (
                            <span
                              className="mt-0.5 block truncate text-[13px]"
                              style={{ color: "var(--ink-mute)" }}
                            >
                              {item.description}
                            </span>
                          ) : null}
                        </div>
                        <span className="mono-sm shrink-0">
                          {soldOut ? "sold out" : (item.baseSpirit ?? item.section ?? "")}
                        </span>
                      </div>
                    );
                  })}
                  {cocktail.fullMenuUrl && (
                    <a
                      className="link-ul mono-sm mt-5 inline-block"
                      href={cocktail.fullMenuUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {"View the full menu →"}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Community ── */}
        <div className="card-paper-warm relative mx-auto mt-12 p-6" style={{ maxWidth: 560 }}>
          <div className="grain-layer" aria-hidden style={{ opacity: 0.26 }} />
          <div className="relative">
            <GuestList source="cocktail_card" />
          </div>
        </div>

        <div
          className="mx-auto mt-10 flex flex-wrap items-center justify-between gap-4"
          style={{ maxWidth: 560 }}
        >
          <button
            className="btn btn-accent"
            onClick={() => (isRestaurant ? goToRestaurant() : navigate({ to: "/mood-input" }))}
          >
            {t("result.another")}
            <span aria-hidden>→</span>
          </button>
          <a
            className="mono link-ul"
            href="https://instagram.com/vibe.tail"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("instagram_clicked")}
          >
            {"Follow @vibe.tail"}
          </a>
        </div>
      </div>

      {/* Frame picker modal — interactive preview */}
      {showFramePicker &&
        (() => {
          const selected = FRAME_STYLES.find((f) => f.id === selectedFrameId) ?? FRAME_STYLES[0];
          // Preview card is 2:3 aspect — match the printed 2in x 3in proportion.
          const PREVIEW_W = 220;
          const PREVIEW_H = 330;
          // Scale "in"-based insets/borders to preview pixels (1in -> PREVIEW_W/2 px).
          const scaleIn = (v: string) =>
            v.replace(/([\d.]+)in/g, (_, n) => `${(parseFloat(n) * PREVIEW_W) / 2}px`);
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
                style={{
                  background: "#fdf8f3",
                  border: "1px solid rgba(255,255,255,0.10)",
                  maxHeight: "92vh",
                }}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className="text-sm font-semibold tracking-wider uppercase"
                    style={{ color: "var(--app-text-primary)", fontFamily: "var(--font-body)" }}
                  >
                    {t("result.chooseFrame") || "Choose a frame"}
                  </h3>
                  <button
                    onClick={() => setShowFramePicker(false)}
                    className="text-xs w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5"
                    style={{ color: "var(--app-text-muted)" }}
                  >
                    ✕
                  </button>
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
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        boxSizing: "border-box",
                        pointerEvents: "none",
                        ...parseFrameCss(previewOuterCss),
                      }}
                    />
                    {/* corner ornaments */}
                    {selected.showCorners && (
                      <>
                        {(["tl", "tr", "br", "bl"] as const).map((c, i) => (
                          <div
                            key={c}
                            style={{
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
                            }}
                          />
                        ))}
                      </>
                    )}
                    {/* inner content area */}
                    <div
                      style={{
                        position: "absolute",
                        inset: previewInset || 0,
                        boxSizing: "border-box",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "linear-gradient(160deg, rgba(30,34,40,0.72) 0%, rgba(20,24,28,0.85) 100%)",
                        padding: 10,
                        gap: 6,
                        ...parseFrameCss(previewInnerCss),
                      }}
                    >
                      {/* cocktail thumbnail */}
                      <div
                        style={{
                          width: "100%",
                          flex: "1 1 auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {illustrationSource ? (
                          <img
                            src={illustrationSource}
                            alt=""
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--app-primary)"
                            strokeWidth="1"
                            opacity="0.4"
                          >
                            <path
                              d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--app-text)",
                          textAlign: "center",
                          lineHeight: 1.15,
                          padding: "0 4px",
                        }}
                      >
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
                          background: isActive ? "rgba(0,0,0,0.45)" : "transparent",
                          border: isActive
                            ? "1.5px solid var(--app-primary)"
                            : "1.5px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 72,
                            position: "relative",
                            background: "#fdf8f3",
                            boxSizing: "border-box",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              boxSizing: "border-box",
                              ...parseFrameCss(
                                scaleIn(f.outerCss).replace(
                                  /(\d+(\.\d+)?)px/g,
                                  (_, n) => `${Math.max(1, (parseFloat(n) * 48) / PREVIEW_W)}px`,
                                ),
                              ),
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: f.id === "none" ? 3 : 6,
                              background: "linear-gradient(160deg,#e0533c33,#b8893a22)",
                              borderRadius: 1,
                            }}
                          />
                        </div>
                        <span
                          className="text-[9px] tracking-wider uppercase whitespace-nowrap"
                          style={{
                            color: isActive ? "var(--app-primary)" : "var(--app-text-secondary)",
                            fontFamily: "var(--font-body)",
                          }}
                        >
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
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    {t("result.cancel") || "Cancel"}
                  </button>
                  <button
                    onClick={() => {
                      setShowFramePicker(false);
                      handlePrint(selectedFrameId);
                    }}
                    className="flex-1 py-3 text-xs font-semibold tracking-wider uppercase rounded transition"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
                      color: "white",
                      border: "none",
                      boxShadow: "2px 3px 12px rgba(0,0,0,0.45)",
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

      <MixingOverlay open={mixingVisible && !figMode} lines={mixingLines} />
    </div>
  );
}

/** Four-character catalogue number, stable for a given key. */
function makeSerial(key: string): string {
  const clean = key.replace(/\W/g, "");
  if (clean.length >= 8 && !/\s/.test(key)) return clean.slice(0, 4).toUpperCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(4, "0").slice(-4);
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
