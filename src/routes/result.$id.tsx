import { createFileRoute } from "@tanstack/react-router";
import ResultCardScreen from "@/components/screens/ResultCardScreen";

export const Route = createFileRoute("/result/$id")({
  validateSearch: (s: Record<string, unknown>): { from?: string } => ({
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  component: ResultRoute,
});

function ResultRoute() {
  const { id } = Route.useParams();
  return <ResultCardScreen id={Number(id)} />;
}
