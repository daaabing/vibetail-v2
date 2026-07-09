import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import MoodInputScreen from "@/components/screens/MoodInputScreen";
import VibetailLogo from "@/components/moodtail/VibetailLogo";
import { setRestaurantCtx } from "@/lib/restaurant-ctx";


const TITLE = "Vibetail × Double Chicken Please — Match Your Vibe to a Cocktail";
const DESC = "Tell us your vibe and we'll match you to a cocktail from the Double Chicken Please menu.";
const URL = "https://vibetail.com/restaurants/double-chicken-please";

export const Route = createFileRoute("/restaurants/double-chicken-please")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: DcpRoute,
});

function DcpRoute() {
  const [started, setStarted] = useState(false);
  useEffect(() => { setRestaurantCtx("double-chicken-please"); }, []);

  if (!started) {
    return (
      <div
        className="w-full md:max-w-2xl lg:max-w-3xl md:mx-auto min-h-svh flex flex-col items-center justify-center px-6 py-10 text-center"
      >
        <VibetailLogo size={140} />
        <div className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          Vibetail × Double Chicken Please
        </div>
        <h1 className="mt-3 text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)", letterSpacing: "-0.01em" }}>
          Double Chicken Please
        </h1>
        <p className="mt-3 max-w-md text-base italic leading-relaxed" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text-secondary)" }}>
          Tell us your vibe. We'll match you to one cocktail from tonight's menu — and tell you why.
        </p>

        <button
          onClick={() => setStarted(true)}
          className="mt-10 px-8 py-3.5 rounded-full text-sm font-medium tracking-wider text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
            boxShadow: "0 12px 30px -6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          Match my vibe →
        </button>

        <p className="mt-6 text-[11px]" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          Menu from doublechickenplease.com
        </p>
      </div>
    );
  }
  return <MoodInputScreen menuSlug="dcp" />;
}
