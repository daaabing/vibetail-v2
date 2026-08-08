import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import LandingScreen from "@/components/screens/LandingScreen";
import { clearRestaurantCtx } from "@/lib/restaurant-ctx";

const TITLE = "Vibetail — AI Cocktail Generator from Your Vibe";
const DESC =
  "Turn your current mood into a personalized cocktail. Vibetail's AI mixes a bespoke recipe from your vibe, flavors, and ingredients.";
const URL = "https://vibetail.com/";
const IMG =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/17PkbIkJJbhD4Z7df3muH0hvMGK2/social-images/social-1780006827115-115.webp";

function IndexPage() {
  useEffect(() => {
    clearRestaurantCtx();
  }, []);
  return <LandingScreen />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:image", content: IMG },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: IMG },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: IndexPage,
});
