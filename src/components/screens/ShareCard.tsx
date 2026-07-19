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
 * Offscreen 2:3 editorial poster used exclusively for save/share export.
 * NOT the on-screen result card. Rendered at fixed 1200×1800 CSS px and
 * captured with html-to-image, so it must NOT depend on the viewport.
 */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { cocktail, illustrationSource, qrDataUrl, lang },
  ref,
) {
  const zh = lang === "zh";
  const matched = cocktail.matchedFromMenu;
  const matchedDrinkName = cocktail.menuItemName ?? cocktail.cocktailName;

  // Short vibe (truncate to keep layout tight)
  const rawVibe = (cocktail.originalMood ?? "").trim();
  const userVibe = rawVibe.length > 60 ? rawVibe.slice(0, 58) + "…" : rawVibe;

  // Why-this-drink: merchant uses whyThisMatch; solo falls back to tastesLike.
  const whyRaw = (matched ? cocktail.whyThisMatch : cocktail.tastesLike) ?? cocktail.tastesLike ?? "";
  const why = whyRaw.length > 180 ? whyRaw.slice(0, 178) + "…" : whyRaw;

  // Short quote under the title
  const quote = (cocktail.tastesLike ?? "").split(/[\n.。]/)[0]?.trim() ?? "";
  const shortQuote = quote.length > 60 ? quote.slice(0, 58) + "…" : quote;

  const labels = {
    eyebrow: "YOUR VIBETAIL",
    matched: zh ? "MATCHED DRINK" : "MATCHED DRINK",
    vibe: zh ? "YOUR VIBE" : "YOUR VIBE",
    why: zh ? "WHY THIS DRINK" : "WHY THIS DRINK",
    scan: zh ? "扫码调你的专属\nVibetail →" : "Scan to mix\nyour own →",
    slogan: "Every mood deserves the perfect pour.",
    handle: "@vibe.tail  ·  vibetail.com",
  };

  return (
    <div
      ref={ref}
      style={{
        width: SHARE_CARD_W,
        height: SHARE_CARD_H,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(120% 90% at 30% 20%, #F3E8D6 0%, #EFE4CE 45%, #E4D3B4 100%)",
        fontFamily: '"Inter", "PingFang SC", "Hiragino Sans GB", sans-serif',
        color: "#2A2118",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Watercolor accents (subtle, purely decorative) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(40% 30% at 12% 18%, rgba(155,120,90,0.18) 0%, transparent 60%), radial-gradient(35% 25% at 88% 82%, rgba(120,90,70,0.16) 0%, transparent 65%), radial-gradient(30% 22% at 8% 78%, rgba(140,110,150,0.14) 0%, transparent 60%)",
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />

      {/* Main split: left cocktail / right content */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
        {/* LEFT — cocktail illustration */}
        <div
          style={{
            width: "54%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px 60px 60px",
            position: "relative",
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
              mixBlendMode: "multiply",
            }}
          />
        </div>

        {/* RIGHT — text content */}
        <div
          style={{
            width: "46%",
            display: "flex",
            flexDirection: "column",
            padding: "90px 70px 40px 20px",
            gap: 22,
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 20,
              letterSpacing: 6,
              fontWeight: 500,
              color: "#8A7A62",
            }}
          >
            {labels.eyebrow}
          </div>

          {/* Vibetail title */}
          <div
            style={{
              fontFamily: '"Cormorant Garamond", "Songti SC", Georgia, serif',
              fontWeight: 600,
              fontSize: 72,
              lineHeight: 1.05,
              color: "#1E1710",
              letterSpacing: zh ? "-0.02em" : "-0.01em",
            }}
          >
            {cocktail.cocktailName}
          </div>

          {/* Short quote */}
          {shortQuote && (
            <div
              style={{
                fontFamily: '"Cormorant Garamond", "Songti SC", Georgia, serif',
                fontStyle: "italic",
                fontSize: 26,
                lineHeight: 1.35,
                color: "#5A4A38",
              }}
            >
              "{shortQuote}"
            </div>
          )}

          <div style={{ height: 1, background: "rgba(80,55,30,0.22)", margin: "6px 0" }} />

          {/* Matched drink */}
          <div>
            <div style={{ fontSize: 16, letterSpacing: 4, color: "#8A7A62", marginBottom: 10 }}>
              {labels.matched}
            </div>
            <div
              style={{
                fontFamily: '"Cormorant Garamond", "Songti SC", Georgia, serif',
                fontWeight: 600,
                fontSize: 40,
                lineHeight: 1.15,
                color: "#2A2118",
              }}
            >
              {matchedDrinkName}
            </div>
          </div>

          {/* Your vibe */}
          {userVibe && (
            <div>
              <div style={{ fontSize: 16, letterSpacing: 4, color: "#8A7A62", marginBottom: 10 }}>
                {labels.vibe}
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(154,120,86,0.14)",
                  borderRadius: 24,
                  padding: "14px 22px",
                  fontFamily: '"Cormorant Garamond", "Songti SC", Georgia, serif',
                  fontStyle: "italic",
                  fontSize: 24,
                  lineHeight: 1.4,
                  color: "#3A2E20",
                  maxWidth: "100%",
                }}
              >
                "{userVibe}"
              </div>
            </div>
          )}

          {/* Why this drink */}
          {why && (
            <div>
              <div style={{ fontSize: 16, letterSpacing: 4, color: "#8A7A62", marginBottom: 10 }}>
                {labels.why}
              </div>
              <div
                style={{
                  fontSize: 20,
                  lineHeight: 1.55,
                  color: "#3A2E20",
                }}
              >
                {why}
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* QR block */}
          {qrDataUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 10 }}>
              <div
                style={{
                  background: "#FBF3E1",
                  padding: 10,
                  borderRadius: 10,
                  boxShadow: "0 2px 10px rgba(60,40,20,0.10)",
                }}
              >
                <img
                  src={qrDataUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: 150, height: 150, display: "block" }}
                />
              </div>
              <div
                style={{
                  fontFamily: '"Cormorant Garamond", "Songti SC", Georgia, serif',
                  fontStyle: "italic",
                  fontSize: 22,
                  color: "#6B5A40",
                  whiteSpace: "pre-line",
                  lineHeight: 1.35,
                }}
              >
                {labels.scan}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "20px 40px 40px",
        }}
      >
        <div
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: "italic",
            fontSize: 26,
            color: "#2A2118",
          }}
        >
          {labels.slogan}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 16,
            letterSpacing: 3,
            color: "#8A7A62",
          }}
        >
          {labels.handle}
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
