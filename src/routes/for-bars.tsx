import { createFileRoute } from "@tanstack/react-router";
import ForBarsPage from "@/components/site/ForBarsPage";

const TITLE = "Vibetail for Bars — Photograph Your Menu, We Do the Typing";
const DESC =
  "Upload a photo of your cocktail menu. Vibetail reads every item, drafts descriptions and tasting tones, and you correct the details — then guests get matched to drinks you actually pour.";
const URL = "https://vibetail.com/for-bars";

export const Route = createFileRoute("/for-bars")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ForBarsPage,
});
