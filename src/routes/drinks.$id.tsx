import { createFileRoute } from "@tanstack/react-router";
import ResultCardScreen from "@/components/screens/ResultCardScreen";

export const Route = createFileRoute("/drinks/$id")({
  validateSearch: (s: Record<string, unknown>): { from?: string; d?: string; restaurant?: string } => ({
    from: typeof s.from === "string" ? s.from : undefined,
    d: typeof s.d === "string" ? s.d : undefined,
    restaurant: typeof s.restaurant === "string" ? s.restaurant : undefined,
  }),
  head: ({ params }) => {
    const TITLE = "Your Cocktail — Vibetail";
    const DESC = "A bespoke cocktail recipe distilled from your vibe by Vibetail's AI bartender.";
    const URL = `https://vibetail.com/drinks/${params.id}`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
      ],
      links: [{ rel: "canonical", href: URL }],
    };
  },
  component: ResultRoute,
});

function ResultRoute() {
  const { id } = Route.useParams();
  return <ResultCardScreen id={id} />;
}
