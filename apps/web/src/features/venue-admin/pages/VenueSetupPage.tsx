import { useState, type FormEvent } from "react";
import { venueTypeSchema } from "@vibetail/contracts";
import { SiteFooter, SiteHeader } from "../../platform/components/SiteHeader.js";
import { useSeo } from "../../platform/useSeo.js";
import { VenueAdminLoading, errorMessage, useVenueSession } from "../VenueShell.js";
import { saveCachedVenueSession } from "../session-store.js";

const VENUE_TYPES = [
  { value: "cocktail_bar", label: "Cocktail bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "event", label: "Event / pop-up" },
  { value: "other", label: "Other" },
] as const;

export function VenueSetupPage() {
  useSeo("Create your venue — Vibetail", "Set up a venue in the Vibetail backend.", true);
  const state = useVenueSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!state) return <VenueAdminLoading />;
  if (state.session.venue) {
    window.location.replace("/venue/dashboard");
    return <VenueAdminLoading />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (!state) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const created = await state.client.createVenue({
        name: String(data.get("name") ?? "").trim(),
        address: String(data.get("address") ?? "").trim(),
        venueType: venueTypeSchema.parse(data.get("venueType") ?? "cocktail_bar"),
      });
      // The dashboard renders from this snapshot on arrival; without it the
      // brand-new venue would flash the account name until the recheck lands.
      saveCachedVenueSession(created);
      window.location.assign("/venue/dashboard");
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <div className="vt-page">
      <SiteHeader />
      <main className="vt-narrow">
        <header className="vt-page-title">
          <p className="vt-kicker">Welcome, {state.session.account.displayName}</p>
          <h1>Create your venue.</h1>
          <p>These details introduce your venue to guests. You can refine everything later.</p>
        </header>
        <section className="vt-management-entry">
          <form className="vt-admin-form vt-admin-grid" onSubmit={submit}>
            <label>Venue name<input name="name" required maxLength={200} placeholder="Nightjar" /></label>
            <label>Venue type
              <select name="venueType" defaultValue="cocktail_bar">
                {VENUE_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
              </select>
            </label>
            <label className="vt-span-2">Address<input name="address" required maxLength={500} placeholder="129 City Road, London" /></label>
            <button className="vt-primary" type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create venue"}
            </button>
          </form>
          {error && <div className="vt-alert" role="alert">{error}</div>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
