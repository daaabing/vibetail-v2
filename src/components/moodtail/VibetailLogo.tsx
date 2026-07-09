import GlassVessel from "./GlassVessel";

export default function VibetailLogo({ size = 144 }: { size?: number }) {
  return <GlassVessel size={size} color="#99B9C6" mode="idle" />;
}
