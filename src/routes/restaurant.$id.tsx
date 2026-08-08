import { useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import MoodInputScreen from "@/components/screens/MoodInputScreen";
import LandingScreen from "@/components/screens/LandingScreen";
import { setRestaurantCtx } from "@/lib/restaurant-ctx";

export const Route = createFileRoute("/restaurant/$id")({
  beforeLoad: ({ params }) => {
    if (params.id !== "0") {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const TITLE = `Restaurant #${params.id} — Vibetail`;
    const DESC = `Share your vibe and let Vibetail mix a cocktail for you at restaurant #${params.id}.`;
    const URL = `https://vibetail.com/restaurant/${params.id}`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
      ],
      links: [{ rel: "canonical", href: URL }],
    };
  },
  component: RestaurantRoute,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground">Restaurant not found</p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground">Something went wrong</p>
      </div>
    </div>
  ),
});

function RestaurantRoute() {
  const { id } = Route.useParams();
  const [started, setStarted] = useState(false);
  useEffect(() => {
    setRestaurantCtx(id);
  }, [id]);
  if (!started) {
    return <LandingScreen onMix={() => setStarted(true)} />;
  }
  return <MoodInputScreen restaurantId={id} />;
}
