import { useEffect, useRef, useState } from "react";
import { useAuthUser } from "../auth/useAuthUser.js";
import { VenueClientError } from "../../clients/http-venue-client.js";
import { addJournalEntry } from "./drink-log-store.js";
import { compressPhoto } from "./photo.js";
import { CameraIcon, StarIcon } from "./icons.js";

/**
 * Record a drink: photo first — `capture` sends iOS straight to the camera —
 * then a name and whatever else the guest can still type at this hour.
 */
export function RecordDrinkSheet({ venueNames, onSaved }: { venueNames: string[]; onSaved(): void }) {
  const auth = useAuthUser();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [drinkName, setDrinkName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    const compressed = await compressPhoto(file);
    setPhoto(compressed);
    setPhotoUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(compressed);
    });
  }

  async function save() {
    if (!drinkName.trim()) { setError("Give the drink a name — even just “house negroni”."); return; }
    setBusy(true);
    setError("");
    try {
      await addJournalEntry({
        drinkName: drinkName.trim(),
        venueName: venueName.trim() || null,
        rating: rating || null,
        note: note.trim() || null,
        photo,
        source: "camera",
      });
      onSaved();
    } catch (saveError) {
      // A 4xx is the server explaining what's wrong (bad photo format, full
      // journal) — show that, not a misleading connectivity line.
      if (saveError instanceof VenueClientError && saveError.status < 500) {
        setError(saveError.detail.message);
      } else {
        setError(auth.status === "signed_in"
          ? "Couldn’t reach your account just now. Check the connection and try again."
          : "Couldn’t save on this device. Free up a little storage and try again.");
      }
      setBusy(false);
    }
  }

  return <div className="ma-record">
    <h2 className="display">Record a drink</h2>

    <input
      accept="image/*"
      capture="environment"
      hidden
      ref={fileInput}
      type="file"
      onChange={(event) => { void pickPhoto(event.target.files?.[0]); event.target.value = ""; }}
    />
    <button className="ma-photo-slot" type="button" onClick={() => fileInput.current?.click()}>
      {photoUrl
        ? <img alt="Your drink" src={photoUrl} />
        : <span className="ma-photo-hint"><CameraIcon size={30} /><span>Snap the drink</span></span>}
    </button>
    {photoUrl && <button className="ma-photo-retake" type="button" onClick={() => fileInput.current?.click()}>Retake</button>}

    <label className="ma-field">
      <span className="mono-sm">Drink</span>
      <input
        maxLength={120}
        placeholder="What’s in the glass?"
        value={drinkName}
        onChange={(event) => setDrinkName(event.target.value)}
      />
    </label>

    <label className="ma-field">
      <span className="mono-sm">Where</span>
      <input
        list="ma-venue-names"
        maxLength={120}
        placeholder="Bar, party, home…"
        value={venueName}
        onChange={(event) => setVenueName(event.target.value)}
      />
      <datalist id="ma-venue-names">
        {venueNames.map((name) => <option key={name} value={name} />)}
      </datalist>
    </label>

    <div className="ma-field">
      <span className="mono-sm">How was it</span>
      <div className="ma-stars" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          return <button
            aria-checked={rating === value}
            aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
            key={value}
            role="radio"
            type="button"
            onClick={() => setRating(rating === value ? 0 : value)}
          >
            <StarIcon filled={value <= rating} />
          </button>;
        })}
      </div>
    </div>

    <label className="ma-field">
      <span className="mono-sm">Note</span>
      <textarea
        maxLength={500}
        placeholder="Who poured it, who you were with…"
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </label>

    {error && <p className="ma-alert" role="alert">{error}</p>}
    <button className="btn btn-solid ma-save" disabled={busy} type="button" onClick={() => void save()}>
      {busy ? "Saving…" : "Save to calendar"}
    </button>
    <p className="ma-fineprint">
      {auth.status === "signed_in"
        ? "Saved to your Vibetail account — it follows you across devices."
        : "Stays on this phone. Sign in from your profile to sync."}
    </p>
  </div>;
}
