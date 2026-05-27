import { createFileRoute } from "@tanstack/react-router";
import GalleryScreen from "@/components/screens/GalleryScreen";

export const Route = createFileRoute("/gallery")({ component: GalleryScreen });
