import { createFileRoute, useNavigate } from "@tanstack/react-router";
import MixFlow from "@/components/mix/MixFlow";
import { STEP_IDS } from "@/lib/mix-flow";

const TITLE = "Mix a Vibe — Share Your Mood | Vibetail";
const DESC =
  "Tell Vibetail what you're feeling. Five short steps — vibe, texture, strength, base and notes — and our AI distills a cocktail recipe for this exact moment.";
const URL = "https://vibetail.com/mood-input";

export const Route = createFileRoute("/mood-input")({
  validateSearch: (s: Record<string, unknown>): { step?: number } => {
    const raw = Number(s.step);
    if (!Number.isFinite(raw)) return {};
    const clamped = Math.min(STEP_IDS.length, Math.max(1, Math.round(raw)));
    return clamped === 1 ? {} : { step: clamped };
  },
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
  component: MoodInputRoute,
});

/**
 * Each step is its own history entry, so browser Back walks the flow one
 * question at a time and a step is directly linkable.
 */
function MoodInputRoute() {
  const navigate = useNavigate({ from: "/mood-input" });
  const { step } = Route.useSearch();

  return (
    <MixFlow
      step={(step ?? 1) - 1}
      onStepChange={(index) => navigate({ search: index === 0 ? {} : { step: index + 1 } })}
    />
  );
}
