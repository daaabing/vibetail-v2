import { createFileRoute } from "@tanstack/react-router";
import MoodInputScreen from "@/components/screens/MoodInputScreen";

const TITLE = "Mix a Vibe — Share Your Mood | Vibetail";
const DESC = "Tell Vibetail what you're feeling. Share your vibe, pick flavors, and let our AI distill a cocktail recipe just for this moment.";
const URL = "https://vibetail.com/mood-input";

export const Route = createFileRoute("/mood-input")({
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
  component: MoodInputScreen,
});
