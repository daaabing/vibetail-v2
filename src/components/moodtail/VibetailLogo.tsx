import GlassVessel from "./GlassVessel";

export default function VibetailLogo({ size = 144 }: { size?: number }) {
  return <GlassVessel size={size} color="#8FA99B" mode="idle" />;
}
