import { createFileRoute } from "@tanstack/react-router";
import MoodInputScreen from "@/components/screens/MoodInputScreen";

export const Route = createFileRoute("/restaurant/$id")({
  head: ({ params }) => {
    const TITLE = `Vibetail — Restaurant ${params.id}`;
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
});

function RestaurantRoute() {
  const { id } = Route.useParams();
  return <MoodInputScreen restaurantId={id} />;
}
