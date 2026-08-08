import { createFileRoute } from "@tanstack/react-router";
import ResultCardScreen from "@/components/screens/ResultCardScreen";

export const Route = createFileRoute("/drinks/$id")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { from?: string; d?: string; restaurant?: string; menu?: string } => ({
    from: typeof s.from === "string" ? s.from : undefined,
    d: typeof s.d === "string" ? s.d : undefined,
    restaurant: typeof s.restaurant === "string" ? s.restaurant : undefined,
    menu: typeof s.menu === "string" ? s.menu : undefined,
  }),
  head: ({ params }) => {
    const shortId = params.id.slice(0, 8);
    const TITLE = `Cocktail #${shortId} — Vibetail`;
    const DESC = `A bespoke AI-mixed cocktail (#${shortId}) distilled from your vibe by Vibetail's AI bartender.`;
    const URL = `https://vibetail.com/drinks/${params.id}`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Recipe",
            name: `Vibetail Cocktail #${shortId}`,
            description: DESC,
            url: URL,
            recipeCategory: "Cocktail",
            recipeCuisine: "Cocktail",
            author: { "@type": "Organization", name: "Vibetail" },
          }),
        },
      ],
    };
  },
  component: ResultRoute,
});

function ResultRoute() {
  const { id } = Route.useParams();
  return <ResultCardScreen id={id} />;
}
