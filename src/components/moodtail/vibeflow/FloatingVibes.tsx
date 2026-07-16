import { useEffect, useMemo, useRef } from "react";
import type { Lang } from "@/lib/i18n";
import { VIBE_ROWS_EN, VIBE_ROWS_ZH } from "@/lib/vibe-cloud";

interface Props {
  lang: Lang;
  selected: string | null;
  onPick: (label: string, color: string) => void;
}

interface Item {
  label: string;
  color: string;
}

/**
 * Compact vibe cloud with infinite vertical loop scroll — items are
 * tripled and scrollTop snaps between the middle third so users never
 * see a top/bottom edge.
 */
export default function FloatingVibes({ lang, selected, onPick }: Props) {
  const rows = lang === "zh" ? VIBE_ROWS_ZH : VIBE_ROWS_EN;
  const items = useMemo<Item[]>(
    () => rows.flatMap((r) => r.labels.map((label) => ({ label, color: r.color }))),
    [rows],
  );
  const loopItems = useMemo(() => [...items, ...items, ...items], [items]);
  const anyPicked = !!selected;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Center scroll on the middle third on mount.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight / 3;
    });
    return () => cancelAnimationFrame(id);
  }, [loopItems.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const oneSet = el.scrollHeight / 3;
    if (el.scrollTop < oneSet * 0.35) {
      el.scrollTop += oneSet;
    } else if (el.scrollTop > oneSet * 1.65) {
      el.scrollTop -= oneSet;
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="mood-tags-scroll relative w-full h-full no-scrollbar"
      style={{
        maxWidth: 600,
        margin: "0 auto",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "flex-start",
        gap: "10px 10px",
        padding: "8px 14px 24px",
        maskImage:
          "linear-gradient(180deg, transparent 0, black 12%, black 82%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent 0, black 12%, black 82%, transparent 100%)",
      }}
    >
      {loopItems.map((it, i) => {
        const isSel = selected === it.label;
        return (
          <Chip
            key={`${it.label}-${i}`}
            label={it.label}
            color={it.color}
            selected={isSel}
            dimmed={anyPicked && !isSel}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
}

function Chip({
  label,
  color,
  selected,
  dimmed,
  onPick,
}: {
  label: string;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onPick: (label: string, color: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(label, color)}
      className="shrink-0 rounded-full active:scale-95"
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 12,
        padding: "6px 14px",
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        border: selected
          ? `1.4px solid ${color}`
          : "1px solid rgba(255,255,255,0.10)",
        background: selected
          ? `${color}2E`
          : "rgba(255,255,255,0.045)",
        color: selected ? "var(--app-text)" : "var(--app-text-secondary)",
        opacity: dimmed ? 0.5 : 1,
        boxShadow: selected ? `0 0 18px ${color}55` : "none",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition:
          "background 200ms, border-color 200ms, opacity 200ms, transform 120ms",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 5,
          height: 5,
          borderRadius: 999,
          background: selected ? "currentColor" : color,
          marginRight: 6,
          verticalAlign: "middle",
          opacity: selected ? 1 : 0.7,
        }}
      />
      {label}
    </button>
  );
}
