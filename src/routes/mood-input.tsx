import { createFileRoute } from "@tanstack/react-router";
import MoodInputScreen from "@/components/screens/MoodInputScreen";

export const Route = createFileRoute("/mood-input")({ component: MoodInputScreen });
