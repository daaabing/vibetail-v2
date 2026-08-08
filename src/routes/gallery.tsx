import { createFileRoute } from "@tanstack/react-router";
import GalleryScreen from "@/components/screens/GalleryScreen";

const TITLE = "Vibe Bar — Your Cocktail Gallery | Vibetail";
const DESC =
  "Browse your collection of AI-generated cocktails. Revisit every vibe you've mixed, with names, recipes, and tasting notes.";
const URL = "https://vibetail.com/gallery";

export const Route = createFileRoute("/gallery")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vibe Bar",
          description: DESC,
          url: URL,
          isPartOf: { "@type": "WebSite", name: "Vibetail", url: "https://vibetail.com" },
        }),
      },
    ],
  }),
  component: GalleryScreen,
});
