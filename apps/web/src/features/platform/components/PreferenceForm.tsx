import { useState, type FormEvent } from "react";
import { restaurantPreferencesSchema, type RestaurantPreferences } from "@vibetail/contracts";

const FLAVORS = ["bright", "citrusy", "fresh", "herbal", "spicy", "smoky", "rich"];

export function PreferenceForm({ busy, onSubmit }: { busy: boolean; onSubmit: (preferences: RestaurantPreferences) => void }) {
  const [mood, setMood] = useState("");
  const [flavors, setFlavors] = useState<string[]>([]);
  const [alcoholPreference, setAlcoholPreference] = useState<RestaurantPreferences["alcoholPreference"]>("either");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = restaurantPreferencesSchema.safeParse({ mood: mood || undefined, flavors, alcoholPreference, locale: "en" });
    if (!parsed.success) { setError("Tell us a mood or choose at least one flavor."); return; }
    setError("");
    onSubmit(parsed.data);
  }

  return (
    <form className="vt-preferences" onSubmit={submit}>
      <label htmlFor="mood">What kind of night are you having?</label>
      <textarea id="mood" value={mood} onChange={(event) => setMood(event.target.value)} placeholder="Celebratory, quietly curious, first-date energy…" />
      <fieldset><legend>Flavor direction</legend><div className="vt-chips">
        {FLAVORS.map((flavor) => <button key={flavor} className={flavors.includes(flavor) ? "is-selected" : ""} type="button" aria-pressed={flavors.includes(flavor)} onClick={() => setFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])}>{flavor}</button>)}
      </div></fieldset>
      <fieldset><legend>Alcohol preference</legend><div className="vt-segments">
        {(["either", "alcoholic", "non_alcoholic"] as const).map((value) => <label key={value}><input type="radio" name="alcohol" checked={alcoholPreference === value} onChange={() => setAlcoholPreference(value)} /><span>{value === "non_alcoholic" ? "Zero proof" : value}</span></label>)}
      </div></fieldset>
      {error && <p className="vt-form-error" role="alert">{error}</p>}
      <button className="vt-primary" disabled={busy} type="submit">{busy ? "Finding your pour…" : "Match my vibe"}</button>
    </form>
  );
}
