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
  head: () => {
    const TITLE = "Vibetail — Restaurant";
    const DESC = "Share your vibe and let Vibetail mix a cocktail for you at this restaurant.";
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
      ],
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
  useEffect(() => { setRestaurantCtx(id); }, [id]);
  if (!started) {
    return <LandingScreen onMix={() => setStarted(true)} />;
  }
  return <MoodInputScreen restaurantId={id} />;
}
