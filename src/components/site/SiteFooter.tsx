import { useLang } from "@/lib/i18n";
import { BRAND, FOOTER_NOTE, NAV_LINKS, pick } from "./landing-content";

const YEAR = new Date().getFullYear();

export default function SiteFooter({ onMix }: { onMix: () => void }) {
  const { lang } = useLang();

  const columns: {
    title: string;
    items: { label: string; href?: string; onClick?: () => void }[];
  }[] = [
    {
      title: "Product",
      items: [
        { label: "Mix a drink", onClick: onMix },
        { label: "Vibe Bar", href: "/gallery" },
        { label: "Mood recipe guide", href: "/guides/mood-cocktail-recipes" },
      ],
    },
    {
      title: "Venues",
      items: [
        { label: "Menu matching", onClick: () => jump("venues") },
        { label: "Partners", onClick: () => jump("partners") },
        { label: `${"Email"} · ${BRAND.email}`, href: `mailto:${BRAND.email}` },
      ],
    },
    {
      title: "About",
      items: [
        { label: "Team", onClick: () => jump("team") },
        { label: "FAQ", onClick: () => jump("faq") },
        { label: `Instagram ${BRAND.handle}`, href: BRAND.instagram },
      ],
    },
  ];

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <footer className="panel-ink relative overflow-hidden">
      <div className="grain-layer" aria-hidden style={{ opacity: 0.18 }} />

      <div className="shell relative py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="display-fat text-4xl leading-none">{BRAND.wordmark}</div>
            <p
              className="accent-italic mt-4 max-w-xs text-[20px] leading-snug"
              style={{ color: "var(--gold)" }}
            >
              {pick(BRAND.tagline, lang)}
            </p>
            <button className="btn btn-gilt mt-7" onClick={onMix}>
              {"Mix a drink"}
              <span aria-hidden>→</span>
            </button>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <div className="eyebrow-gilt mb-4" style={{ fontSize: 10 }}>
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-sm transition-opacity hover:opacity-60"
                        style={{ color: "var(--paper)", textDecoration: "none" }}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className="text-left text-sm transition-opacity hover:opacity-60"
                        style={{ color: "var(--paper)" }}
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="my-10" style={{ borderColor: "rgba(244,240,230,0.16)" }} />

        <p className="accent-italic text-[19px]" style={{ color: "rgba(244,240,230,0.7)" }}>
          {"Better choices. Completed orders. Memorable nights."}
        </p>
        <p
          className="mono-plain mt-4 max-w-3xl text-[11px] leading-relaxed"
          style={{ color: "rgba(244,240,230,0.5)" }}
        >
          {pick(FOOTER_NOTE, lang)}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="mono-sm" style={{ color: "rgba(244,240,230,0.45)" }}>
            © {YEAR} {BRAND.name}
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => jump(l.id)}
                className="mono-sm"
                style={{ color: "rgba(244,240,230,0.45)" }}
              >
                {pick(l.label, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
