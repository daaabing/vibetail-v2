import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { NAV_LINKS, pick } from "./landing-content";

/** The wordmark as the Figma sets it: spaced didone caps, VIBETAL(E.) */
export function Logotype({ className = "" }: { className?: string }) {
  return (
    <a
      href="/"
      className={className}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontSize: 19,
        letterSpacing: "0.32em",
        color: "inherit",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      VIBETAL(E.)
    </a>
  );
}

/**
 * The nav sits once, at the top of the photograph, and scrolls away with
 * it — hairline white caps over the film, nothing else. No bar, no blur,
 * no colour change.
 */
export default function SiteNav({ onMix }: { onMix: () => void }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  const jump = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "inherit",
    opacity: 0.85,
  };

  return (
    <header
      className="absolute inset-x-0 top-0 z-40"
      style={{ color: "rgba(244,243,240,0.95)" }}
    >
      <div className="shell flex items-center justify-between gap-6 py-6">
        <div className="flex items-baseline gap-10">
          <Logotype />
          <nav className="hidden items-baseline gap-8 lg:flex">
            {NAV_LINKS.map((l) =>
              l.id === "venues" ? (
                <a
                  key={l.id}
                  href="/for-bars"
                  className="transition-opacity hover:opacity-100"
                  style={{ ...linkStyle, textDecoration: "none" }}
                >
                  {pick(l.label, lang)}
                </a>
              ) : (
                <button
                  key={l.id}
                  onClick={() => jump(l.id)}
                  className="transition-opacity hover:opacity-100"
                  style={linkStyle}
                >
                  {pick(l.label, lang)}
                </button>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={onMix}
            className="hidden transition-opacity hover:opacity-60 sm:block"
            style={{
              ...linkStyle,
              opacity: 1,
              paddingBottom: 3,
              borderBottom: "1px solid rgba(244,243,240,0.7)",
            }}
          >
            Mix your drink
          </button>
          <button
            className="p-2 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            style={{ color: "inherit" }}
          >
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
              <path
                d={open ? "M3 2 L17 12 M17 2 L3 12" : "M0 1.5h20M0 7h20M0 12.5h20"}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          className="lg:hidden"
          style={{
            background: "rgba(13,13,12,0.96)",
            color: "rgba(244,243,240,0.95)",
            borderTop: "1px solid rgba(244,243,240,0.15)",
          }}
        >
          <div className="shell grid gap-0 py-2">
            {NAV_LINKS.map((l) =>
              l.id === "venues" ? (
                <a
                  key={l.id}
                  href="/for-bars"
                  className="py-4 text-left"
                  style={{
                    ...linkStyle,
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(244,243,240,0.1)",
                  }}
                >
                  {pick(l.label, lang)}
                </a>
              ) : (
                <button
                  key={l.id}
                  onClick={() => jump(l.id)}
                  className="py-4 text-left"
                  style={{ ...linkStyle, borderBottom: "1px solid rgba(244,243,240,0.1)" }}
                >
                  {pick(l.label, lang)}
                </button>
              ),
            )}
            <button onClick={onMix} className="py-4 text-left" style={linkStyle}>
              Mix your drink
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
