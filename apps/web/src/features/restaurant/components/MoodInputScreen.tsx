import { useState, type FormEvent } from "react";
import type { RestaurantPreferences } from "@vibetail/contracts";

const FLAVORS = ["citrusy", "spicy", "fresh", "earthy", "bittersweet", "smoky"] as const;

interface MoodInputScreenProps {
  locale: "en" | "zh";
  initial?: RestaurantPreferences;
  onSubmit(preferences: RestaurantPreferences): void;
}

export function MoodInputScreen({ locale, initial, onSubmit }: MoodInputScreenProps) {
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [flavors, setFlavors] = useState<string[]>(initial?.flavors ?? []);
  const [alcoholPreference, setAlcoholPreference] = useState<RestaurantPreferences["alcoholPreference"]>(initial?.alcoholPreference ?? "either");
  const [validation, setValidation] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mood.trim() && flavors.length === 0) {
      setValidation(true);
      return;
    }
    setValidation(false);
    onSubmit({
      mood: mood.trim() || undefined,
      flavors,
      alcoholPreference,
      excludedAllergens: [],
      excludedIngredients: [],
      locale,
    });
  }

  function toggleFlavor(flavor: string) {
    setValidation(false);
    setFlavors((current) => current.includes(flavor)
      ? current.filter((value) => value !== flavor)
      : [...current, flavor]);
  }

  return (
    <form className="preference-form" onSubmit={submit} noValidate>
      <div className="field-group">
        <label htmlFor="mood">{locale === "zh" ? "此刻是什么心情？" : "How are you feeling?"}</label>
        <textarea
          id="mood"
          data-testid="mood-input"
          value={mood}
          maxLength={500}
          onChange={(event) => {
            setMood(event.target.value);
            if (event.target.value.trim()) setValidation(false);
          }}
          placeholder={locale === "zh" ? "例如：刚结束漫长的一天，想喝点明亮又有趣的…" : "Long day. I want something bright and a little playful…"}
          aria-describedby={validation ? "preference-error" : undefined}
          aria-invalid={validation}
        />
      </div>
      <fieldset>
        <legend>{locale === "zh" ? "想要的风味（可多选）" : "Flavors you want (choose any)"}</legend>
        <div className="chip-list">
          {FLAVORS.map((flavor) => (
            <button
              className={flavors.includes(flavor) ? "chip selected" : "chip"}
              key={flavor}
              type="button"
              aria-pressed={flavors.includes(flavor)}
              onClick={() => toggleFlavor(flavor)}
            >{flavor}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{locale === "zh" ? "酒精偏好" : "Alcohol preference"}</legend>
        <div className="segmented-control">
          {(["either", "alcoholic", "non_alcoholic"] as const).map((value) => (
            <label key={value}>
              <input type="radio" name="alcohol" value={value} checked={alcoholPreference === value} onChange={() => setAlcoholPreference(value)} />
              <span>{value === "either" ? (locale === "zh" ? "都可以" : "Either") : value === "alcoholic" ? (locale === "zh" ? "含酒精" : "Alcoholic") : (locale === "zh" ? "无酒精" : "No alcohol")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {validation && <p className="validation-message" id="preference-error" role="alert">{locale === "zh" ? "请写一点心情，或至少选择一种风味。" : "Tell us a little about your mood or choose at least one flavor."}</p>}
      <button className="primary-button" data-testid="match-button" type="submit">{locale === "zh" ? "找到今晚这一杯" : "Find my match"}</button>
    </form>
  );
}
