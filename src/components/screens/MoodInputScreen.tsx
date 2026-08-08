import MixFlow, { type MixFlowProps } from "@/components/mix/MixFlow";

/**
 * The mixing flow. Kept as a named screen because three routes mount it:
 * the standalone `/mood-input`, the legacy `/restaurant/$id` cover, and the
 * merchant menu page. Only the standalone route drives the step index through
 * the URL; the embedded mounts keep it internal.
 */
export default function MoodInputScreen(props: MixFlowProps = {}) {
  return <MixFlow {...props} />;
}
