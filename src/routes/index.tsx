import { createFileRoute } from "@tanstack/react-router";
import LandingScreen from "@/components/screens/LandingScreen";

export const Route = createFileRoute("/")({ component: LandingScreen });
