import { useState, type FormEvent } from "react";
import { venuePreferencesSchema, type Locale, type VenuePreferences } from "@vibetail/contracts";

const FLAVORS = ["bright", "citrusy", "fresh", "herbal", "spicy", "smoky", "rich"];
const MOODS = {
  en: ["Quietly curious", "Friday, finally", "Flirting with bad ideas", "Celebrating something small"],
  zh: ["安静地好奇", "终于到周五", "想冒一点险", "庆祝一件小事"],
} as const;

interface PreferenceFormProps {
  busy: boolean;
  initial?: VenuePreferences;
  locale: Locale;
  onSubmit(preferences: VenuePreferences): void;
}

export function PreferenceForm({ busy, initial, locale, onSubmit }: PreferenceFormProps) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [flavors, setFlavors] = useState<string[]>(initial?.flavors ?? []);
  const [alcoholPreference, setAlcoholPreference] = useState<VenuePreferences["alcoholPreference"]>(initial?.alcoholPreference ?? "either");
  const [error, setError] = useState("");

  const copy = locale === "zh" ? {
    vibe: "此刻状态 · 必填", feeling: "今晚，真实的感觉是什么？", ownWords: "或者用自己的话说", placeholder: "漫长的一天。想喝点明亮、又有一点奇怪的……",
    direction: "风味方向 · 可选", flavorLean: "你想让风味往哪里走？", chooseAny: "选择所有符合直觉的风味",
    strength: "酒精强度 · 可选", edge: "今晚想要多少锋芒？", alcohol: "酒精偏好", either: "都可以", alcoholic: "含酒精", zero: "无酒精",
    back: "← 返回", continue: "继续 →", submit: "找到今晚这一杯 →", busy: "正在寻找……", required: "请选择一种心情，或者写下自己的描述。", invalid: "请描述心情，或至少选择一种风味。",
  } : {
    vibe: "The vibe · required", feeling: "How does tonight actually feel?", ownWords: "Or write it in your own words", placeholder: "Long day. I want something bright and a little strange…",
    direction: "The direction · optional", flavorLean: "Where should the flavor lean?", chooseAny: "Choose any that feel right",
    strength: "The strength · optional", edge: "How much edge should it have?", alcohol: "Alcohol preference", either: "Either", alcoholic: "Alcoholic", zero: "Zero proof",
    back: "← Back", continue: "Continue →", submit: "Meet my drink →", busy: "Finding your pour…", required: "Choose a mood or write your own line.", invalid: "Tell us a mood or choose at least one flavor.",
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step < 2) {
      if (step === 0 && !mood.trim()) { setError(copy.required); return; }
      setError("");
      setStep((value) => value + 1);
      return;
    }
    const parsed = venuePreferencesSchema.safeParse({
      mood: mood.trim() || undefined,
      flavors,
      alcoholPreference,
      excludedAllergens: initial?.excludedAllergens ?? [],
      excludedIngredients: initial?.excludedIngredients ?? [],
      locale,
    });
    if (!parsed.success) { setError(copy.invalid); return; }
    setError("");
    onSubmit(parsed.data);
  }

  return <form className="vt-preferences vt-flow" onSubmit={submit} noValidate>
    <div className="vt-flow-progress"><span>0{step + 1}</span><div><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><small>03</small></div>
    {step === 0 && <section><p className="vt-flow-label">{copy.vibe}</p><h2>{copy.feeling}</h2><div className="vt-mood-cloud">{MOODS[locale].map((value) => <button type="button" key={value} className={mood === value ? "is-selected" : ""} onClick={() => { setMood(value); setError(""); }}>{value}</button>)}</div><label htmlFor="mood">{copy.ownWords}</label><textarea id="mood" data-testid="mood-input" maxLength={500} value={mood} onChange={(event) => { setMood(event.target.value); setError(""); }} placeholder={copy.placeholder} aria-invalid={Boolean(error)} /></section>}
    {step === 1 && <section><p className="vt-flow-label">{copy.direction}</p><h2>{copy.flavorLean}</h2><fieldset><legend>{copy.chooseAny}</legend><div className="vt-chips">{FLAVORS.map((flavor) => <button key={flavor} className={flavors.includes(flavor) ? "is-selected" : ""} type="button" aria-pressed={flavors.includes(flavor)} onClick={() => setFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])}>{flavor}</button>)}</div></fieldset></section>}
    {step === 2 && <section><p className="vt-flow-label">{copy.strength}</p><h2>{copy.edge}</h2><fieldset><legend>{copy.alcohol}</legend><div className="vt-segments">{(["either", "alcoholic", "non_alcoholic"] as const).map((value) => <label key={value}><input type="radio" name="alcohol" checked={alcoholPreference === value} onChange={() => setAlcoholPreference(value)} /><span>{value === "non_alcoholic" ? copy.zero : value === "alcoholic" ? copy.alcoholic : copy.either}</span></label>)}</div></fieldset></section>}
    {error && <p className="vt-form-error" role="alert">{error}</p>}
    <div className="vt-flow-actions">{step > 0 && <button className="vt-link-button" type="button" onClick={() => setStep((value) => value - 1)}>{copy.back}</button>}<button className="vt-primary" data-testid="match-button" disabled={busy} type="submit">{busy ? copy.busy : step === 2 ? copy.submit : copy.continue}</button></div>
  </form>;
}
