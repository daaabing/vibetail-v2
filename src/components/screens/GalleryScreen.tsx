
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { type Cocktail, listCocktails } from "@/lib/cocktails-store";
import { formatDistanceToNow } from "date-fns";
import { useLang } from "@/lib/i18n";

const PAGE_SIZE = 10;

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      className="flex rounded-full overflow-hidden"
      style={{
        border: "1px solid rgba(74,62,61,0.2)",
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(8px)",
      }}
    >
      {(["zh", "en"] as const).map((l) => (
        <motion.button
          key={l}
          whileTap={{ scale: 0.92 }}
          onClick={() => setLang(l)}
          className="px-2.5 py-1 text-[11px] font-semibold tracking-wider transition-all"
          style={{
            background: lang === l ? "var(--app-primary)" : "transparent",
            color: lang === l ? "white" : "var(--app-text-muted)",
            borderRadius: "9999px",
          }}
        >
          {l === "zh" ? "中文" : "EN"}
        </motion.button>
      ))}
    </div>
  );
}

export default function GalleryScreen() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setCocktails(listCocktails());
    setLoading(false);
  }, []);

  // Filter by current language. Legacy entries without an explicit `lang`
  // field are bucketed by sniffing CJK characters in the cocktail name.
  const cjk = /[\u4e00-\u9fff]/;
  const filtered = cocktails.filter((c) => {
    const cLang = c.lang ?? (cjk.test(c.cocktailName) ? "zh" : "en");
    return cLang === lang;
  });
  useEffect(() => { setPage(1); }, [lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="w-full md:max-w-4xl lg:max-w-5xl md:mx-auto px-5 pb-28 md:pb-8 relative">

      {/* ── 顶部返回首页 ── */}
      <div className="relative flex items-center justify-between pt-3 pb-4">

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--app-text-secondary)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-body)" }}>{t("gallery.home")}</span>
        </motion.button>

        <span
          className="absolute left-1/2 -translate-x-1/2 text-[10px] tracking-wider pointer-events-none"
          style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}
        >
          {t("nav.vibeBar")}
        </span>

        <div className="flex items-center gap-2">
          <LangToggle />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate({ to: "/mood-input" })}
            className="text-xs font-semibold tracking-wider px-3 py-1.5 relative overflow-hidden"
            style={{
              borderRadius: "4px",
              background: "linear-gradient(135deg, #C2410C 0%, #E0533C 100%)",
              color: "white",
              boxShadow: "1px 2px 8px rgba(194,65,12,0.2)",
            }}
          >
            {t("gallery.addVibe")}
          </motion.button>
        </div>
      </div>


      <h1 className="sr-only">Vibe Bar — Your Cocktail Gallery</h1>

      {/* ── 卡片列表 ── */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-2">
              <div className="h-3 w-24 rounded shimmer" />
              <div className="h-5 w-3/4 rounded shimmer" />
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-3 w-2/3 rounded shimmer" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 md:col-span-2 lg:col-span-3">
            <svg className="w-12 h-12 opacity-20" fill="none" stroke="var(--app-text-muted)" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 3v18M8 22h8M4 6c0 4.418 3.582 8 8 8s8-3.582 8-8V4H4v2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>{t("gallery.empty")}</p>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate({ to: "/mood-input" })}
              className="text-xs font-semibold underline"
              style={{ color: "var(--app-primary)" }}
            >
              {t("gallery.emptyBtn")}
            </motion.button>
          </div>
        ) : (
          paged.map((cocktail, idx) => (
            <motion.div
              key={cocktail.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              onClick={() => navigate({ to: "/result/$id", params: { id: String(cocktail.id) }, search: { from: "gallery" } })}
              className="glass-card rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
            >
              {/* 缩略图 */}
              {cocktail.imageData && (
                <div className="w-full overflow-hidden bg-white">
                  <img
                    src={`data:image/png;base64,${cocktail.imageData}`}
                    alt={cocktail.cocktailName}
                    className="w-full h-auto object-contain block"
                  />
                </div>
              )}


              <div className="p-4">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-[8px] tracking-wider uppercase"
                    style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                    {formatDistanceToNow(new Date(cocktail.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <h4 className="text-lg font-semibold leading-snug"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
                  {cocktail.cocktailName}
                </h4>
                <p className="text-[11px] mt-1 leading-relaxed"
                  style={{ color: "var(--app-text-secondary)", fontFamily: "var(--font-heading)", fontStyle: "italic" }}>
                  "{cocktail.originalMood.slice(0, 80)}{cocktail.originalMood.length > 80 ? "…" : ""}"
                </p>
                <div className="mt-2.5 pt-2 flex items-center justify-between"
                  style={{ borderTop: "1px solid rgba(210,201,189,0.4)" }}>
                  <p className="text-[9px] leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
                    {cocktail.tastesLike.slice(0, 60)}…
                  </p>
                  <svg className="w-4 h-4 flex-shrink-0 ml-2 opacity-30" fill="none" stroke="var(--app-text)" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ── 分页 ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={page === 1}
            className="px-4 py-2 text-xs font-semibold rounded disabled:opacity-30"
            style={{
              border: "1.5px solid rgba(74,62,61,0.25)",
              color: "var(--app-text-secondary)",
              background: "rgba(255,255,255,0.6)",
            }}
          >
            ← Prev
          </motion.button>

          <span className="text-[11px]" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
            {page} / {totalPages}
          </span>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={page === totalPages}
            className="px-4 py-2 text-xs font-semibold rounded disabled:opacity-30"
            style={{
              border: "1.5px solid rgba(74,62,61,0.25)",
              color: "var(--app-text-secondary)",
              background: "rgba(255,255,255,0.6)",
            }}
          >
            Next →
          </motion.button>
        </div>
      )}

    </div>
  );
}
