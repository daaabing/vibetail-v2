import { useState } from "react";
import { venueAvatarDataUri } from "../venue-avatar.js";

/**
 * A venue's avatar, with a generated monogram standing in whenever there is
 * nothing to show: no stored avatar, or a stored one that fails to load (an
 * expired signed URL, a deleted object). Tracking the failed URL rather than a
 * boolean means a later, working `src` heals itself without an effect.
 */
export function VenueAvatar({ className, name, src }: {
  className?: string;
  name: string;
  src: string | null;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const source = src && src !== failedSrc ? src : venueAvatarDataUri(name);
  return <img
    alt=""
    className={className}
    loading="lazy"
    src={source}
    onError={() => setFailedSrc(src)}
  />;
}
