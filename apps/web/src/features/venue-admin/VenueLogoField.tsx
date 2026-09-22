import { useState } from "react";

interface VenueLogoFieldProps {
  file: File | undefined;
  onSelect: (file: File | undefined) => void;
  /** The stored avatar, shown until the owner picks a replacement. */
  currentUrl?: string | null;
  hint: string;
}

/**
 * Avatar picker shared by venue setup (where an avatar is required) and the
 * profile page (where it replaces the stored one). The parent owns the File so
 * it can read the bytes on submit; this only renders the preview.
 */
export function VenueLogoField({ file, onSelect, currentUrl, hint }: VenueLogoFieldProps) {
  const [preview, setPreview] = useState("");
  const shown = preview || currentUrl || "";

  return (
    <div className="vt-venue-logo-field vt-span-2">
      <div>
        <p className="vt-kicker">Venue avatar</p>
        <p>{hint}</p>
      </div>
      <div className="vt-venue-logo-preview" data-empty={shown ? undefined : "true"}>
        {shown
          ? <img alt="Venue avatar preview" src={shown} />
          : <span aria-hidden="true">No avatar yet</span>}
      </div>
      <label className="vt-file-drop">
        <span>{file ? file.name : "Choose an image"}</span>
        <small>PNG, JPEG, or WebP · up to 8 MB</small>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            onSelect(chosen);
            setPreview((current) => {
              if (current) URL.revokeObjectURL(current);
              return chosen ? URL.createObjectURL(chosen) : "";
            });
          }}
        />
      </label>
    </div>
  );
}
