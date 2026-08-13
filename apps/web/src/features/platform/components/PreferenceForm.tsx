import { useState, type FormEvent } from "react";
import { restaurantPreferencesSchema, type RestaurantPreferences } from "@vibetail/contracts";

const FLAVORS = ["bright", "citrusy", "fresh", "herbal", "spicy", "smoky", "rich"];
const MOODS = ["Quietly curious", "Friday, finally", "Flirting with bad ideas", "Celebrating something small"];

export function PreferenceForm({ busy, onSubmit }: { busy: boolean; onSubmit: (preferences: RestaurantPreferences) => void }) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState("");
  const [flavors, setFlavors] = useState<string[]>([]);
  const [alcoholPreference, setAlcoholPreference] = useState<RestaurantPreferences["alcoholPreference"]>("either");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 2) { if (step === 0 && !mood.trim()) { setError("Choose a mood or write your own line."); return; } setError(""); setStep((value) => value + 1); return; }
    const parsed = restaurantPreferencesSchema.safeParse({ mood: mood || undefined, flavors, alcoholPreference, locale: "en" });
    if (!parsed.success) { setError("Tell us a mood or choose at least one flavor."); return; }
    setError(""); onSubmit(parsed.data);
  }

  return <form className="vt-preferences vt-flow" onSubmit={submit}>
    <div className="vt-flow-progress"><span>0{step + 1}</span><div><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><small>03</small></div>
    {step === 0 && <section><p className="vt-flow-label">The vibe · required</p><h2>How does tonight<br /><em>actually feel?</em></h2><div className="vt-mood-cloud">{MOODS.map((value) => <button type="button" key={value} className={mood === value ? "is-selected" : ""} onClick={() => { setMood(value); setError(""); }}>{value}</button>)}</div><label htmlFor="mood">Or write it in your own words</label><textarea id="mood" value={mood} onChange={(event) => { setMood(event.target.value); setError(""); }} placeholder="Long day. I want something bright and a little strange…" /></section>}
    {step === 1 && <section><p className="vt-flow-label">The direction · optional</p><h2>Where should the<br /><em>flavor lean?</em></h2><fieldset><legend>Choose any that feel right</legend><div className="vt-chips">{FLAVORS.map((flavor) => <button key={flavor} className={flavors.includes(flavor) ? "is-selected" : ""} type="button" aria-pressed={flavors.includes(flavor)} onClick={() => setFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])}>{flavor}</button>)}</div></fieldset></section>}
    {step === 2 && <section><p className="vt-flow-label">The strength · optional</p><h2>How much edge<br /><em>should it have?</em></h2><fieldset><legend>Alcohol preference</legend><div className="vt-segments">{(["either", "alcoholic", "non_alcoholic"] as const).map((value) => <label key={value}><input type="radio" name="alcohol" checked={alcoholPreference === value} onChange={() => setAlcoholPreference(value)} /><span>{value === "non_alcoholic" ? "Zero proof" : value}</span></label>)}</div></fieldset></section>}
    {error && <p className="vt-form-error" role="alert">{error}</p>}
    <div className="vt-flow-actions">{step > 0 && <button className="vt-link-button" type="button" onClick={() => setStep((value) => value - 1)}>← Back</button>}<button className="vt-primary" disabled={busy} type="submit">{busy ? "Finding your pour…" : step === 2 ? "Meet my drink →" : "Continue →"}</button></div>
  </form>;
}
