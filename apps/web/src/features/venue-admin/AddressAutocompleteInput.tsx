import { useEffect, useRef, useState } from "react";
import { geocodeSuggestListSchema, type GeocodeSuggestion } from "@vibetail/contracts";
import { getAccessToken } from "../auth/auth-session.js";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 3;

/**
 * Address input with typeahead from /v1/geocode/suggest. Picking a suggestion
 * fills the field AND hands back its coordinates; editing the text afterwards
 * clears them (a changed address makes stale coordinates worse than none).
 * If the geocode proxy is down the field quietly stays a plain input.
 */
export function AddressAutocompleteInput({ name, placeholder, required, maxLength, onCoordinates }: {
  name: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  onCoordinates(coords: { latitude: number; longitude: number } | null): void;
}) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const skipNextFetch = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNextFetch.current) { skipNextFetch.current = false; return; }
    const query = value.trim();
    if (query.length < MIN_QUERY) { setSuggestions([]); setOpen(false); return; }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const token = await getAccessToken();
          if (!token) return;
          const response = await fetch(`/v1/geocode/suggest?q=${encodeURIComponent(query)}`, {
            headers: { authorization: `Bearer ${token}` },
          });
          if (!response.ok) return;
          const { suggestions: loaded } = geocodeSuggestListSchema.parse(await response.json());
          setSuggestions(loaded);
          setOpen(loaded.length > 0);
          setActiveIndex(-1);
        } catch {
          // Autocomplete is a garnish: any failure just means no dropdown.
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on outside taps so the dropdown doesn't linger over the next field.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(suggestion: GeocodeSuggestion) {
    skipNextFetch.current = true;
    setValue(suggestion.label);
    setOpen(false);
    setSuggestions([]);
    onCoordinates({ latitude: suggestion.latitude, longitude: suggestion.longitude });
  }

  return <div className="vt-autocomplete" ref={rootRef}>
    <input
      autoComplete="off"
      maxLength={maxLength}
      name={name}
      placeholder={placeholder}
      required={required}
      role="combobox"
      aria-expanded={open}
      aria-autocomplete="list"
      value={value}
      onChange={(event) => { setValue(event.target.value); onCoordinates(null); }}
      onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % suggestions.length);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        } else if (event.key === "Enter" && activeIndex >= 0) {
          event.preventDefault();
          const chosen = suggestions[activeIndex];
          if (chosen) pick(chosen);
        } else if (event.key === "Escape") {
          setOpen(false);
        }
      }}
    />
    {open && <ul className="vt-autocomplete-list" role="listbox">
      {suggestions.map((suggestion, index) => <li key={suggestion.label} role="option" aria-selected={index === activeIndex}>
        <button
          data-active={index === activeIndex || undefined}
          type="button"
          onClick={() => pick(suggestion)}
          onMouseEnter={() => setActiveIndex(index)}
        >
          {suggestion.label}
        </button>
      </li>)}
    </ul>}
  </div>;
}
