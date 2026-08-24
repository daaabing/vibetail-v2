import { useState, type FormEvent } from "react";
import { venueTypeSchema } from "@vibetail/contracts";
import { useSeo } from "../../platform/useSeo.js";
import { VenueAdminLoading, VenueShell, errorMessage, useVenueSession } from "../VenueShell.js";

const VENUE_TYPES = [
  { value: "cocktail_bar", label: "Cocktail bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "event", label: "Event / pop-up" },
  { value: "other", label: "Other" },
] as const;

export function VenueProfilePage() {
  useSeo("Venue profile — Vibetail", "Edit how your venue appears in the Vibetail directory.", true);
  const state = useVenueSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (!state) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await state.client.updateVenueProfile({
        name: String(data.get("name") ?? "").trim(),
        address: String(data.get("address") ?? "").trim(),
        venueType: venueTypeSchema.parse(data.get("venueType") ?? "cocktail_bar"),
        shortIntro: String(data.get("shortIntro") ?? "").trim() || null,
      });
      await state.refreshSession();
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (!state) return <VenueAdminLoading />;
  const venue = state.session.venue;
  // useVenueSession redirects to /venue/setup before this renders without a venue.
  if (!venue) return <VenueAdminLoading />;

  return (
    <VenueShell active="profile" state={state}>
      <section className="vt-manage-section">
        <div className="vt-section-heading">
          <div><p className="vt-kicker">Profile</p><h2>How guests see your venue</h2></div>
          <a className="vt-secondary" href={`/venues/${venue.slug}`}>Directory listing</a>
        </div>
        <form className="vt-admin-form vt-admin-grid" onSubmit={submit}>
          <label>Venue name<input name="name" defaultValue={venue.name} required maxLength={200} /></label>
          <label>Venue type
            <select name="venueType" defaultValue={venue.venueType ?? "cocktail_bar"}>
              {VENUE_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </label>
          <label className="vt-span-2">Address<input name="address" defaultValue={venue.address ?? ""} required maxLength={500} /></label>
          <label className="vt-span-2">Short intro
            <input
              name="shortIntro"
              defaultValue={venue.shortIntro ?? ""}
              maxLength={1000}
              placeholder="Culinary cocktails in NYC's Lower East Side."
            />
            <small>One line guests see next to your name in the Vibetail directory.</small>
          </label>
          <button className="vt-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
        </form>
        {error && <div className="vt-alert" role="alert">{error}</div>}
        {saved && !error && <p className="vt-loading">Profile saved.</p>}
      </section>
    </VenueShell>
  );
}
