import { useLang } from "@/lib/i18n";
import { STEP_ACCENTS, STEP_IDS, STEP_TITLES, type MixOrder, orderSummary } from "@/lib/mix-flow";

/**
 * "The order" — a running docket of everything chosen so far. Lives as a
 * sticky right-hand column on desktop and inside a pull-up sheet on mobile,
 * so the five separate step screens never feel like a black box.
 */
export default function OrderPanel({
  order,
  current,
  onJump,
  compact = false,
}: {
  order: MixOrder;
  current: number;
  onJump: (index: number) => void;
  compact?: boolean;
}) {
  const { lang } = useLang();

  return (
    <div>
      {!compact && (
        <div className="mb-5 flex items-baseline justify-between">
          <span className="eyebrow-gilt">{"The order"}</span>
          <span className="mono-sm">
            {String(current + 1).padStart(2, "0")}/{String(STEP_IDS.length).padStart(2, "0")}
          </span>
        </div>
      )}

      <ol>
        {STEP_IDS.map((id, i) => {
          const value = orderSummary(order, lang, id);
          const isCurrent = i === current;
          const visited = i < current;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={i > current && !order.moodText.trim()}
                className="group grid w-full grid-cols-[34px_1fr] items-start gap-3 py-3.5 text-left disabled:cursor-not-allowed"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <span
                  className="specimen-no pt-0.5"
                  style={{ color: isCurrent ? STEP_ACCENTS[id] : undefined }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span
                    className="block text-[15px] leading-tight"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: isCurrent || visited ? "var(--ink)" : "var(--ink-faint)",
                    }}
                  >
                    {STEP_TITLES[id].en}
                  </span>
                  <span
                    className="mt-1 block text-[12.5px] leading-snug"
                    style={{
                      color: value ? "var(--ink-soft)" : "var(--ink-faint)",
                      fontStyle: value ? "normal" : "italic",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value ?? (i === 0 ? "not set" : "we'll decide")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div style={{ borderTop: "1px solid var(--line)" }} />
    </div>
  );
}
