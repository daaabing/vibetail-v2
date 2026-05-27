import { createFileRoute } from "@tanstack/react-router";
import ResultCardScreen from "@/components/screens/ResultCardScreen";

export const Route = createFileRoute("/result/$id")({
  validateSearch: (s: Record<string, unknown>): { from?: string; d?: string } => ({
    from: typeof s.from === "string" ? s.from : undefined,
    d: typeof s.d === "string" ? s.d : undefined,
  }),
  component: ResultRoute,
});

function ResultRoute() {
  const { id } = Route.useParams();
  return <ResultCardScreen id={Number(id)} />;
}
