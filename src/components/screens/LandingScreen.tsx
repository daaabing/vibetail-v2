import { useEffect } from "react";
import { track } from "@/lib/analytics";
import LandingPage from "@/components/site/LandingPage";
import UserMenu from "@/components/moodtail/UserMenu";
import Draw from "@/components/draw/art";
import { BRAND, HERO, pick } from "@/components/site/landing-content";

/**
 * `/` renders the full marketing page. When a venue embeds the app it passes
 * `onMix`, and we show a compact single-screen cover instead — the guest is
 * already in the room, they don't need the pitch.
 */
export default function LandingScreen({
  onMix,
  hideGallery,
}: { onMix?: () => void; hideGallery?: boolean } = {}) {
  useEffect(() => {
    track("landing_opened");
  }, []);

  if (!onMix) return <LandingPage />;

  return <CompactCover onMix={onMix} hideGallery={hideGallery} />;
}

function CompactCover({ onMix, hideGallery }: { onMix: () => void; hideGallery?: boolean }) {
  return (
    <div className="flex min-h-svh flex-col" style={{ background: "var(--paper)" }}>
      <div
        className="shell flex items-center justify-between py-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <span className="display-fat text-xl leading-none">{BRAND.wordmark}</span>
        <div className="flex items-center gap-2.5">{!hideGallery && <UserMenu />}</div>
      </div>

      <div className="shell-narrow flex flex-1 flex-col justify-center py-12 text-center">
        <div className="mono mb-8">{pick(HERO.eyebrow)}</div>

        <div className="mx-auto grid w-full max-w-sm grid-cols-4 gap-x-3 gap-y-4">
          {["party", "moon", "fire", "lemon"].map((n, i) => (
            <span key={n} style={{ color: "var(--ink)" }}>
              <Draw name={n} wash="ink" strokeWidth={2.6} />
            </span>
          ))}
        </div>

        <h1 className="display-fat mt-10 text-[clamp(38px,10vw,60px)]">
          {HERO.headline.en.map((line, i) => (
            <span key={line} className="block">
              {i === 1 ? <span style={{ color: "var(--vermilion)" }}>{line}</span> : line}
            </span>
          ))}
        </h1>

        <p
          className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed"
          style={{ color: "var(--ink-soft)" }}
        >
          {pick(HERO.sub)}
        </p>

        <div className="mt-10">
          <button className="btn btn-accent w-full sm:w-auto" onClick={onMix}>
            {pick(HERO.primaryCta)}
            <span aria-hidden>→</span>
          </button>
        </div>

        <div className="mono-sm mt-5">{pick(HERO.note)}</div>
      </div>
    </div>
  );
}
