import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

import { type Cocktail, listMyCocktails } from "@/lib/cocktails-store";
import { useLang } from "@/lib/i18n";
import { getRestaurantCtx, clearRestaurantCtx } from "@/lib/restaurant-ctx";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";

import AuthModal from "@/components/moodtail/AuthModal";
import UserMenu from "@/components/moodtail/UserMenu";

const PAGE_SIZE = 12;

/**
 * The Vibe Bar — every drink you've kept, filed as a catalogue of specimens.
 */
export default function GalleryScreen() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { user, loading: authLoading } = useAuth();
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [restaurantCtx, setRestCtx] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setRestCtx(getRestaurantCtx());
    if (!user) {
      setCocktails([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listMyCocktails().then((list) => {
      setCocktails(list);
      setLoading(false);
    });
  }, [user, authLoading]);

  useEffect(() => {
    setPage(1);
  }, [lang]);

  if (!authLoading && !user) {
    return (
      <>
        <div className="noir min-h-svh" style={{ background: "var(--paper)" }} />
        <AuthModal
          open
          onClose={() => {
            // AuthModal auto-fires onClose on SIGNED_IN — if a session now exists,
            // stay so the gallery re-renders. Otherwise the user dismissed it.
            supabase.auth.getSession().then(({ data }) => {
              if (!data.session) navigate({ to: "/" });
            });
          }}
        />
      </>
    );
  }

  // Filter by current language. Legacy entries without an explicit `lang`
  // field are bucketed by sniffing CJK characters in the cocktail name.
  const cjk = /[一-鿿]/;
  const filtered = cocktails.filter((c) => {
    const cLang = c.lang ?? (cjk.test(c.cocktailName) ? "zh" : "en");
    return cLang === lang;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goHome = () => {
    if (restaurantCtx) {
      if (restaurantCtx === "double-chicken-please") {
        navigate({ to: "/restaurants/double-chicken-please" });
      } else {
        navigate({ to: "/restaurant/$id", params: { id: restaurantCtx } });
      }
      return;
    }
    clearRestaurantCtx();
    navigate({ to: "/" });
  };

  return (
    <div className="noir flex min-h-svh flex-col" style={{ background: "var(--paper)" }}>
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-30"
        style={{
          background: "rgba(14,14,13,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="shell flex items-center justify-between gap-4 py-3.5">
          <button type="button" onClick={goHome} className="mono flex items-center gap-2">
            <span aria-hidden>←</span>
            {t("gallery.home")}
          </button>
          <div className="flex items-center gap-2.5">
            <UserMenu />
            <button
              className="btn btn-solid !px-4 !py-2.5"
              onClick={() => navigate({ to: "/mood-input" })}
            >
              {t("gallery.addVibe")}
            </button>
          </div>
        </div>
      </div>

      <div className="shell pb-28 pt-10 md:pb-16">
        <div className="section-eyebrow">
          <span className="eyebrow-gilt">{"The collection"}</span>
        </div>
        <h1 className="display text-[clamp(32px,5.4vw,56px)]">{t("gallery.title")}</h1>
        <p className="mono-sm mt-3" style={{ color: "var(--gold)" }}>
          {filtered.length} {filtered.length === 1 ? "specimen filed" : "specimens filed"}
        </p>

        {/* ── Catalogue ── */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card-paper p-5">
                <div className="shimmer mb-4 h-3 w-20" />
                <div className="shimmer mb-3 h-40 w-full" />
                <div className="shimmer h-5 w-3/4" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div
              className="col-span-full flex flex-col items-start gap-5 py-16"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <p className="display text-2xl">{t("gallery.empty")}</p>
              <button className="btn btn-accent" onClick={() => navigate({ to: "/mood-input" })}>
                {t("gallery.emptyBtn")}
                <span aria-hidden>→</span>
              </button>
            </div>
          ) : (
            paged.map((cocktail, idx) => {
              const no = String((page - 1) * PAGE_SIZE + idx + 1).padStart(2, "0");
              const image = cocktail.imageData
                ? `data:image/png;base64,${cocktail.imageData}`
                : (cocktail.imageUrl ?? null);
              return (
                <button
                  key={cocktail.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/drinks/$id",
                      params: { id: cocktail.publicId ?? String(cocktail.id) },
                      search: {
                        from: "gallery",
                        ...(restaurantCtx ? { restaurant: restaurantCtx } : {}),
                      },
                    })
                  }
                  className="paper-pocket pocket-card card-lift relative overflow-hidden text-left"
                  style={{ background: "var(--paper-card)", border: "1px solid var(--line)" }}
                >
                  <div className="grain-layer" aria-hidden style={{ opacity: 0.26 }} />

                  <div className="relative flex items-baseline justify-between px-4 pt-3.5">
                    <span className="specimen-no" style={{ color: "var(--gold)" }}>
                      {no}
                    </span>
                    <span className="mono-sm">
                      {formatDistanceToNow(new Date(cocktail.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <div
                    className="relative mx-auto flex items-center justify-center px-4"
                    style={{ height: 170 }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={cocktail.cocktailName}
                        className="print-img max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <svg
                        width="56"
                        height="56"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-faint)"
                        strokeWidth="0.8"
                      >
                        <path
                          d="M12 21h8M4 21h8M12 11v10M19 3H5v4c0 3.866 3.134 7 7 7s7-3.134 7-7V3z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="relative px-4 pb-4">
                    <hr className="rule mb-3" />
                    <h2 className="display text-[21px] leading-tight">{cocktail.cocktailName}</h2>
                    <p
                      className="serif-italic mt-1.5 text-[14px] leading-snug"
                      style={{ color: "var(--ink-mute)" }}
                    >
                      &ldquo;{cocktail.originalMood.slice(0, 78)}
                      {cocktail.originalMood.length > 78 ? "…" : ""}&rdquo;
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            className="mt-12 flex items-center justify-between pt-6"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <button
              className="btn btn-outline"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {t("gallery.prev")}
            </button>
            <span className="mono">
              {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
            <button
              className="btn btn-outline"
              disabled={page === totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {t("gallery.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
