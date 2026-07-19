import { forwardRef } from "react";
import type { Cocktail } from "@/lib/cocktails-store";

export const SHARE_CARD_W = 1200;
export const SHARE_CARD_H = 1800;

interface ShareCardProps {
  cocktail: Cocktail;
  illustrationSource: string;
  qrDataUrl: string | null;
  lang: "zh" | "en";
}

/**
 * Offscreen 2:3 editorial cover used exclusively for save/share export.
 * The cocktail illustration is the exact same asset shown in-app — never
 * re-generated. Layout is one relatively-positioned root with the
 * illustration absolutely positioned so it can bleed into the text column.
 */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { cocktail, illustrationSource, qrDataUrl, lang },
  ref,
) {
  const matched = cocktail.matchedFromMenu;
  const matchedDrinkName = cocktail.menuItemName ?? null;

  // Split tastesLike into first-line quote + rest for "why"
  const tastes = (cocktail.tastesLike ?? "").trim();
  const sentences = tastes.split(/(?<=[。.!?！？])\s*/).filter(Boolean);
  const quote = (sentences[0] ?? tastes).replace(/^["“”'']|["“”'']$/g, "").trim();
  const shortQuote = quote.length > 56 ? quote.slice(0, 54) + "…" : quote;

  const whyRaw = matched
    ? (cocktail.whyThisMatch ?? sentences.slice(1).join(" "))
    : sentences.slice(1).join(" ");
  const why = (whyRaw ?? "").trim();
  const whyClamped = why.length > 160 ? why.slice(0, 158) + "…" : why;

  const rawVibe = (cocktail.originalMood ?? "").trim();
  const userVibe = rawVibe.length > 54 ? rawVibe.slice(0, 52) + "…" : rawVibe;

  const serif = '"Cormorant Garamond", "Songti SC", Georgia, serif';
  const sans = '"Inter", "PingFang SC", "Hiragino Sans GB", sans-serif';

  const tagline = lang === "zh"
    ? "每一种心情，都值得一杯专属"
    : "Every mood deserves the perfect pour.";

  return (
    <div
      ref={ref}
      style={{
        width: SHARE_CARD_W,
        height: SHARE_CARD_H,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(140% 100% at 20% 15%, #F5EAD3 0%, #EFE3C8 40%, #E4D2AF 85%, #D9C69E 100%)",
        fontFamily: sans,
        color: "#2A2118",
        boxSizing: "border-box",
      }}
    >
      {/* Watercolor accents — very subtle, painted onto parchment */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(45% 35% at 18% 22%, rgba(155,120,90,0.16) 0%, transparent 65%), radial-gradient(35% 28% at 82% 78%, rgba(120,90,70,0.14) 0%, transparent 70%), radial-gradient(30% 22% at 8% 82%, rgba(140,110,150,0.10) 0%, transparent 60%)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />

      {/* COCKTAIL ILLUSTRATION — absolute, bleeds, no frame */}
      <div
        style={{
          position: "absolute",
          left: -40,
          top: 120,
          width: 720,
          height: 1320,
          pointerEvents: "none",
        }}
      >
        <img
          src={illustrationSource}
          alt=""
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center bottom",
            mixBlendMode: "multiply",
          }}
        />
      </div>

      {/* RIGHT COLUMN — text stack */}
      <div
        style={{
          position: "absolute",
          left: 620,
          top: 160,
          width: 500,
          display: "flex",
          flexDirection: "column",
          gap: 28,
          zIndex: 2,
        }}
      >
        {/* Cocktail name */}
        <div
          style={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: 88,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            color: "#1E1710",
          }}
        >
          {cocktail.cocktailName}
        </div>

        {/* Thin divider */}
        <div style={{ height: 1, width: 220, background: "rgba(40,25,10,0.35)" }} />

        {/* Vibe quote */}
        {shortQuote && (
          <div
            style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 30,
              lineHeight: 1.35,
              color: "#4A3A28",
            }}
          >
            “{shortQuote}”
          </div>
        )}

        {/* Matched drink (merchant only) */}
        {matched && matchedDrinkName && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 5,
                color: "#8A7A62",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Matched
            </div>
            <div
              style={{
                fontFamily: serif,
                fontWeight: 600,
                fontSize: 34,
                lineHeight: 1.15,
                color: "#2A2118",
              }}
            >
              {matchedDrinkName}
            </div>
          </div>
        )}

        {/* User vibe */}
        {userVibe && (
          <div
            style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 24,
              lineHeight: 1.45,
              color: "#5A4A38",
              marginTop: 4,
            }}
          >
            — {userVibe}
          </div>
        )}

        {/* Why */}
        {whyClamped && (
          <div
            style={{
              fontSize: 19,
              lineHeight: 1.6,
              color: "#3A2E20",
              maxWidth: 480,
            }}
          >
            {whyClamped}
          </div>
        )}
      </div>

      {/* FOOTER STRIP — QR + wordmark + slogan */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 140,
          background: "linear-gradient(to top, rgba(60,40,20,0.06), transparent)",
          display: "flex",
          alignItems: "center",
          padding: "0 70px",
          gap: 24,
          zIndex: 3,
        }}
      >
        {qrDataUrl && (
          <div
            style={{
              background: "#FBF3E1",
              padding: 8,
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <img
              src={qrDataUrl}
              alt=""
              crossOrigin="anonymous"
              style={{ width: 104, height: 104, display: "block" }}
            />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontFamily: serif,
              fontSize: 34,
              fontWeight: 600,
              color: "#1E1710",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            Vibetail
          </div>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 3,
              color: "#8A7A62",
              textTransform: "uppercase",
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
