import { useState, type FormEvent } from "react";
import type { DrinkInput, VenueDrink } from "@vibetail/contracts";
import type { HttpVenueManagementClient } from "../../clients/http-venue-management-client.js";
import { errorMessage } from "./VenueShell.js";
import { readVenueImage } from "./imageUpload.js";

const STRENGTHS = [
  { value: "", label: "Not set" },
  { value: "zero", label: "Zero proof (non-alcoholic)" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
] as const;

interface DrinkFormFields {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  ingredients: string;
  flavorTags: string;
  allergens: string;
  baseSpirit: string;
  strength: string;
  recommendationNote: string;
}

function fieldsFrom(drink?: VenueDrink): DrinkFormFields {
  return {
    name: drink?.name ?? "",
    description: drink?.description ?? "",
    price: drink?.price ?? "",
    imageUrl: drink?.imageUrl ?? "",
    ingredients: drink?.ingredients.join(", ") ?? "",
    flavorTags: drink?.flavorTags.join(", ") ?? "",
    allergens: drink?.allergens.join(", ") ?? "",
    baseSpirit: drink?.baseSpirit ?? "",
    strength: drink?.strength ?? "",
    recommendationNote: drink?.recommendationNote ?? "",
  };
}

function toInput(fields: DrinkFormFields): DrinkInput {
  return {
    name: fields.name.trim(),
    description: fields.description.trim() || null,
    price: fields.price.trim() || null,
    imageUrl: fields.imageUrl.trim() || null,
    ingredients: splitTags(fields.ingredients),
    flavorTags: splitTags(fields.flavorTags),
    allergens: splitTags(fields.allergens),
    baseSpirit: fields.baseSpirit.trim() || null,
    strength: fields.strength === "zero" || fields.strength === "light" || fields.strength === "medium" || fields.strength === "strong"
      ? fields.strength
      : null,
    recommendationNote: fields.recommendationNote.trim() || null,
  };
}

function splitTags(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function DrinkForm({ drink, client, submitLabel, onSubmit }: {
  drink?: VenueDrink;
  client: HttpVenueManagementClient;
  submitLabel: string;
  onSubmit: (input: DrinkInput, reset: () => void) => Promise<void>;
}) {
  const [fields, setFields] = useState<DrinkFormFields>(() => fieldsFrom(drink));
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [photoFile, setPhotoFile] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState(drink?.imageUrl ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState("");

  function set<K extends keyof DrinkFormFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function suggest() {
    if (!fields.name.trim()) {
      setSuggestError("Give the drink a name first, then ask for suggestions.");
      return;
    }
    setSuggesting(true);
    setSuggestError("");
    try {
      const suggestion = await client.suggestDrinkInfo({
        name: fields.name.trim(),
        description: fields.description.trim() || null,
        ingredients: splitTags(fields.ingredients),
      });
      setFields((current) => ({
        ...current,
        flavorTags: suggestion.flavorTags.join(", "),
        baseSpirit: suggestion.baseSpirit,
        strength: suggestion.strength,
        recommendationNote: suggestion.recommendationNote,
      }));
    } catch (caught) {
      setSuggestError(errorMessage(caught));
    } finally {
      setSuggesting(false);
    }
  }

  async function preparePhoto() {
    if (!photoFile) return;
    if (!fields.name.trim()) {
      setSuggestError("Give the drink a name before preparing its photo.");
      return;
    }
    setPhotoBusy(true);
    setSuggestError("");
    setPhotoNotice("");
    try {
      const result = await client.prepareDrinkPhoto({
        name: fields.name.trim(),
        description: fields.description.trim() || null,
        ...(await readVenueImage(photoFile)),
      });
      set("imageUrl", result.imageUrl);
      setPhotoPreview(result.imageUrl);
      setPhotoFile(undefined);
      setPhotoNotice(result.backgroundRemoved
        ? "Background removed. Review the cutout before saving."
        : "Photo uploaded. Automatic background removal is not enabled on this server.");
    } catch (caught) {
      setSuggestError(errorMessage(caught));
    } finally {
      setPhotoBusy(false);
    }
  }

  function resetForm() {
    setFields(fieldsFrom());
    setPhotoFile(undefined);
    setPhotoPreview("");
    setPhotoNotice("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = toInput(fields);
    setPending(true);
    setSubmitError("");
    setSavedName("");
    onSubmit(input, resetForm)
      .then(() => setSavedName(input.name))
      .catch((caught: unknown) => setSubmitError(errorMessage(caught)))
      .finally(() => setPending(false));
  }

  return (
    <form className="vt-admin-form vt-admin-grid" onSubmit={submit}>
      <label>Drink name<input value={fields.name} onChange={(event) => set("name", event.target.value)} required maxLength={200} placeholder="Smoked Pear Old Fashioned" /></label>
      <label>Price<input value={fields.price} onChange={(event) => set("price", event.target.value)} maxLength={100} placeholder="$18" /></label>
      <label className="vt-span-2">Description<input value={fields.description} onChange={(event) => set("description", event.target.value)} maxLength={2000} placeholder="What the guest tastes" /></label>
      <label className="vt-span-2">Ingredients<input value={fields.ingredients} onChange={(event) => set("ingredients", event.target.value)} placeholder="rye whiskey, pear syrup, bitters" /></label>
      <section className="vt-span-2 vt-drink-photo-field" aria-labelledby={`drink-photo-${drink?.id ?? "new"}`}>
        <div>
          <p className="vt-kicker" id={`drink-photo-${drink?.id ?? "new"}`}>Drink photo</p>
          <p>Upload a photo of the drink to show on your menu.</p>
        </div>
        {photoPreview && <div className="vt-drink-photo-preview"><img src={photoPreview} alt={`${fields.name || "Drink"} preview`} /></div>}
        <label className="vt-file-drop">
          <span>{photoFile ? photoFile.name : "Choose or take a photo"}</span>
          <small>PNG, JPEG, or WebP · up to 8 MB</small>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPhotoFile(file);
              setPhotoNotice("");
              if (file) setPhotoPreview(URL.createObjectURL(file));
            }}
          />
        </label>
        {photoFile && <button className="vt-secondary" type="button" onClick={() => void preparePhoto()} disabled={photoBusy}>
          {photoBusy ? "Preparing photo…" : "Upload & prepare photo"}
        </button>}
        {photoNotice && <small className="vt-photo-notice" role="status">{photoNotice}</small>}
      </section>

      <div className="vt-span-2 vt-venue-suggest">
        <button className="vt-secondary" type="button" onClick={() => void suggest()} disabled={suggesting}>
          {suggesting ? "Asking Vibetail…" : "Suggest flavor profile with AI"}
        </button>
        <small>Fills the fields below from the name, description, and ingredients. Review and edit before saving.</small>
        {suggestError && <div className="vt-alert" role="alert">{suggestError}</div>}
      </div>

      <label>Flavor tags<input value={fields.flavorTags} onChange={(event) => set("flavorTags", event.target.value)} placeholder="smoky, rich" /></label>
      <label>Base spirit<input value={fields.baseSpirit} onChange={(event) => set("baseSpirit", event.target.value)} maxLength={100} placeholder="whiskey" /></label>
      <label>Strength
        <select value={fields.strength} onChange={(event) => set("strength", event.target.value)}>
          {STRENGTHS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
        </select>
      </label>
      <label>Allergens<input value={fields.allergens} onChange={(event) => set("allergens", event.target.value)} placeholder="sulfites" /></label>
      <label className="vt-span-2">Recommendation note<input value={fields.recommendationNote} onChange={(event) => set("recommendationNote", event.target.value)} maxLength={500} placeholder="When to pour this drink" /></label>
      {/* Feedback sits next to the button: on long pages the shared banner at
          the top of the section is outside the viewport when submitting. */}
      <div className="vt-span-2 vt-submit-row">
        <button className="vt-primary" type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        {submitError && <div className="vt-alert" role="alert">{submitError}</div>}
        {!submitError && savedName && <p className="vt-notice" role="status">{savedName} saved.</p>}
      </div>
    </form>
  );
}
