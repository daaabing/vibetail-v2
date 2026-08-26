import { useEffect, useState, type FormEvent } from "react";
import type { DrinkInput, MenuPhotoScanResult, VenueAdminMenu, VenueDrink } from "@vibetail/contracts";
import type { HttpVenueManagementClient } from "../../../clients/http-venue-management-client.js";
import { useSeo } from "../../platform/useSeo.js";
import { DrinkForm } from "../DrinkForm.js";
import { VenueAdminLoading, VenueShell, errorMessage, useVenueSession } from "../VenueShell.js";
import { readVenueImage } from "../imageUpload.js";

export function VenueMenusPage() {
  useSeo("Menus — Vibetail", "Create, publish, and archive your venue menus.", true);
  const state = useVenueSession();
  const [menus, setMenus] = useState<VenueAdminMenu[]>();
  const [drinks, setDrinks] = useState<VenueDrink[]>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const client = state?.client;
  useEffect(() => {
    if (!client) return;
    let active = true;
    Promise.all([client.listMenus(), client.listDrinks()])
      .then(([loadedMenus, loadedDrinks]) => {
        if (!active) return;
        setMenus(loadedMenus);
        setDrinks(loadedDrinks);
      })
      .catch((caught: unknown) => { if (active) setError(errorMessage(caught)); });
    return () => { active = false; };
  }, [client]);

  if (!state) return <VenueAdminLoading />;
  const venue = state.session.venue;

  async function run(operation: () => Promise<VenueAdminMenu[]>, success: string): Promise<boolean> {
    setError("");
    setNotice("");
    try {
      setMenus(await operation());
      setNotice(success);
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    }
  }

  return (
    <VenueShell active="menus" state={state}>
      <section className="vt-manage-section">
        <div className="vt-section-heading">
          <div><p className="vt-kicker">Menus</p><h2>One published menu at a time</h2></div>
          <span>{menus?.length ?? 0} total</span>
        </div>
        <p>Publishing a menu automatically archives the previously published one. Your printed QR code always opens the current published menu.</p>
        {error && <div className="vt-alert" role="alert">{error}</div>}
        {notice && <p className="vt-notice" role="status">{notice}</p>}

        <details className="vt-create-panel" open={menus !== undefined && menus.length === 0}>
          <summary>Create a menu</summary>
          <MenuCreationStudio
            client={state.client}
            drinks={drinks ?? []}
            onError={setError}
            onNotice={setNotice}
            onChanged={async () => {
              const [nextMenus, nextDrinks] = await Promise.all([state.client.listMenus(), state.client.listDrinks()]);
              setMenus(nextMenus);
              setDrinks(nextDrinks);
            }}
          />
        </details>

        {!menus && !error && <p className="vt-loading">Loading menus…</p>}
        <div className="vt-menu-stack">
          {menus?.map((menu) => (
            <MenuEditor
              key={menu.id}
              menu={menu}
              drinks={drinks ?? []}
              venueSlug={venue?.slug ?? ""}
              run={run}
              client={state.client}
            />
          ))}
        </div>
      </section>
    </VenueShell>
  );
}

function MenuCreationStudio({ client, drinks, onChanged, onError, onNotice }: {
  client: HttpVenueManagementClient;
  drinks: VenueDrink[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [mode, setMode] = useState<"photo" | "url" | "manual">("photo");
  const [photo, setPhoto] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState("");
  const [scan, setScan] = useState<MenuPhotoScanResult>();
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  async function scanPhoto() {
    if (!photo) return;
    setScanning(true);
    onError("");
    onNotice("");
    try {
      const result = await client.scanMenuPhoto({ ...(await readVenueImage(photo)), fileName: photo.name });
      setScan(result);
      setMenuName(result.suggestedMenuName);
      onNotice(`${result.drinks.length} drinks found. Review them before creating the draft.`);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setScanning(false);
    }
  }

  async function importScan() {
    if (!scan) return;
    setImporting(true);
    onError("");
    try {
      const result = await client.importScannedMenu({ name: menuName, drinks: scan.drinks });
      await onChanged();
      onNotice(`Draft “${result.menu.name}” created with ${result.drinks.length} new drinks.`);
      setPhoto(undefined);
      setPhotoPreview("");
      setSourceUrl("");
      setScan(undefined);
      setMenuName("");
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setImporting(false);
    }
  }

  async function fetchMenuUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScanning(true);
    onError("");
    onNotice("");
    try {
      const result = await client.scanMenuUrl({ sourceUrl: sourceUrl.trim() });
      setScan(result);
      setMenuName(result.suggestedMenuName);
      onNotice(`${result.drinks.length} drinks fetched. Review them before creating the draft.`);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setScanning(false);
    }
  }

  async function createManualMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const drinkIds = data.getAll("drinkIds").map(String);
    onError("");
    try {
      await client.createMenu({ name, drinkIds });
      await onChanged();
      onNotice(`Draft menu “${name}” created.`);
      form.reset();
    } catch (caught) {
      onError(errorMessage(caught));
    }
  }

  function updateScannedDrink(index: number, updates: Partial<Omit<DrinkInput, "imageUrl">>) {
    setScan((current) => current && ({
      ...current,
      drinks: current.drinks.map((drink, drinkIndex) => drinkIndex === index ? { ...drink, ...updates } : drink),
    }));
  }

  return (
    <div className="vt-menu-creation-studio">
      <div className="vt-creation-paths" role="tablist" aria-label="How do you want to create the menu?">
        <button className={mode === "photo" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "photo"} onClick={() => setMode("photo")}>
          <span className="vt-path-mark">One photo</span>
          <strong>Scan a whole menu</strong>
          <small>Fastest — extract every drink, then review.</small>
        </button>
        <button className={mode === "url" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "url"} onClick={() => setMode("url")}>
          <span className="vt-path-mark">Public link</span>
          <strong>Auto-fetch a menu</strong>
          <small>Paste the venue's menu webpage and pull in every drink.</small>
        </button>
        <button className={mode === "manual" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "manual"} onClick={() => setMode("manual")}>
          <span className="vt-path-mark">Drink by drink</span>
          <strong>Build it manually</strong>
          <small>Choose library drinks or add new ones with photos.</small>
        </button>
      </div>

      {mode === "photo" && <div className="vt-photo-menu-flow" role="tabpanel">
        <div className="vt-menu-photo-stage">
          {photoPreview
            ? <img src={photoPreview} alt="Menu upload preview" />
            : <div><span>MENU PHOTO</span><p>Lay the menu flat, avoid glare, and keep all drink names in frame.</p></div>}
          <label className="vt-file-drop vt-menu-file-drop">
            <span>{photo ? photo.name : "Choose or take a menu photo"}</span>
            <small>PNG, JPEG, or WebP · up to 8 MB</small>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              setPhoto(file);
              setScan(undefined);
              if (file) setPhotoPreview(URL.createObjectURL(file));
            }} />
          </label>
          <button className="vt-primary" type="button" disabled={!photo || scanning} onClick={() => void scanPhoto()}>
            {scanning ? "Reading every drink…" : "Read menu photo"}
          </button>
        </div>

      </div>}

      {mode === "url" && <form className="vt-menu-url-flow" role="tabpanel" onSubmit={(event) => void fetchMenuUrl(event)}>
        <div className="vt-menu-url-copy">
          <p className="vt-kicker">Fetch from the web</p>
          <h3>Paste the venue's menu page.</h3>
          <p>Use a public webpage that lists the drinks. Photo-only menus work better with Scan a whole menu.</p>
        </div>
        <label>Menu webpage URL<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required maxLength={2048} placeholder="https://yourbar.com/menu" /></label>
        <button className="vt-primary" type="submit" disabled={scanning || !sourceUrl.trim()}>
          {scanning ? "Fetching every drink…" : "Fetch menu from link"}
        </button>
        <small>This uses the same editable review flow as a scanned menu. Automatic retrieval is handled behind the menu-import API.</small>
      </form>}

      {scan && mode !== "manual" && <section className="vt-scan-review" aria-label="Imported drinks review">
        <div className="vt-scan-review-head">
          <div><p className="vt-kicker">Review before import</p><h3>{scan.drinks.length} drinks found</h3></div>
          <small>Source: {scan.provider}</small>
        </div>
        <label>Menu name<input value={menuName} required maxLength={200} onChange={(event) => setMenuName(event.target.value)} /></label>
        <div className="vt-scanned-drinks">
          {scan.drinks.map((drink, index) => <ScannedDrinkEditor
            key={index}
            drink={drink}
            index={index}
            onChange={(updates) => updateScannedDrink(index, updates)}
            onRemove={() => setScan((current) => current && ({ ...current, drinks: current.drinks.filter((_, drinkIndex) => drinkIndex !== index) }))}
          />)}
        </div>
        <button className="vt-primary vt-import-menu-button" type="button" disabled={importing || !menuName.trim() || scan.drinks.length === 0} onClick={() => void importScan()}>
          {importing ? "Creating drinks and menu…" : `Create draft with ${scan.drinks.length} drinks`}
        </button>
      </section>}

      {mode === "manual" && <div className="vt-manual-menu-flow" role="tabpanel">
        <form className="vt-admin-form" onSubmit={(event) => void createManualMenu(event)}>
          <label>Menu name<input name="name" required maxLength={200} placeholder="Summer Menu" /></label>
          <fieldset className="vt-venue-drink-picker">
            <legend>Choose drinks from your library</legend>
            {drinks.length === 0 && <p>Your library is empty — add the first drink below.</p>}
            {drinks.map((drink) => <label key={drink.id} className="vt-check"><input type="checkbox" name="drinkIds" value={drink.id} /> {drink.name}</label>)}
          </fieldset>
          <button className="vt-primary" type="submit">Create draft menu</button>
        </form>
        <details className="vt-create-panel" open={drinks.length === 0}>
          <summary>Add a new drink — including its photo</summary>
          <DrinkForm client={client} submitLabel="Add to library" onSubmit={async (input, reset) => {
            // Failures propagate to DrinkForm, which reports them beside its
            // own submit button — closer to the merchant than onError's banner.
            onError("");
            await client.createDrink(input);
            await onChanged();
            onNotice(`${input.name} added — tick it above to include it.`);
            reset();
          }} />
        </details>
      </div>}
    </div>
  );
}

function ScannedDrinkEditor({ drink, index, onChange, onRemove }: {
  drink: DrinkInput;
  index: number;
  onChange: (updates: Partial<Omit<DrinkInput, "imageUrl">>) => void;
  onRemove: () => void;
}) {
  return <details className="vt-scanned-drink" open={index === 0}>
    <summary><span><small>Drink {String(index + 1).padStart(2, "0")}</small><strong>{drink.name}</strong></span><span>{drink.price || "No price"}</span></summary>
    <div className="vt-admin-form vt-admin-grid">
      <label>Drink name<input value={drink.name} required onChange={(event) => onChange({ name: event.target.value })} /></label>
      <label>Price<input value={drink.price ?? ""} onChange={(event) => onChange({ price: event.target.value || null })} /></label>
      <label className="vt-span-2">Description<input value={drink.description ?? ""} onChange={(event) => onChange({ description: event.target.value || null })} /></label>
      <label className="vt-span-2">Ingredients<input value={drink.ingredients.join(", ")} onChange={(event) => onChange({ ingredients: splitList(event.target.value) })} /></label>
      <label>Flavor tags<input value={drink.flavorTags.join(", ")} onChange={(event) => onChange({ flavorTags: splitList(event.target.value) })} /></label>
      <label>Base spirit<input value={drink.baseSpirit ?? ""} onChange={(event) => onChange({ baseSpirit: event.target.value || null })} /></label>
      <label>Strength<select value={drink.strength ?? ""} onChange={(event) => {
        const value = event.target.value;
        onChange({ strength: value === "zero" || value === "light" || value === "medium" || value === "strong" ? value : null });
      }}>
        <option value="">Not set</option><option value="zero">Zero proof</option><option value="light">Light</option><option value="medium">Medium</option><option value="strong">Strong</option>
      </select></label>
      <label>Allergens<input value={drink.allergens.join(", ")} onChange={(event) => onChange({ allergens: splitList(event.target.value) })} /></label>
      <label className="vt-span-2">Recommendation note<input value={drink.recommendationNote ?? ""} onChange={(event) => onChange({ recommendationNote: event.target.value || null })} /></label>
      <button className="vt-link-button" type="button" onClick={onRemove}>Remove this drink</button>
    </div>
  </details>;
}

function splitList(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function MenuEditor({ menu, drinks, venueSlug, client, run }: {
  menu: VenueAdminMenu;
  drinks: VenueDrink[];
  venueSlug: string;
  client: HttpVenueManagementClient;
  run: (operation: () => Promise<VenueAdminMenu[]>, success: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const drinkNames = new Map(drinks.map((drink) => [drink.id, drink.name]));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const drinkIds = data.getAll("drinkIds").map(String);
    const saved = await run(async () => {
      await client.updateMenu(menu.id, { name, drinkIds });
      return client.listMenus();
    }, `“${name}” saved.`);
    if (saved) setEditing(false);
  }

  function remove() {
    if (!window.confirm(`Delete “${menu.name}”? Its drinks stay in your library.`)) return;
    void run(async () => {
      await client.deleteMenu(menu.id);
      return client.listMenus();
    }, `“${menu.name}” deleted. Drinks remain in the library.`);
  }

  function publish() {
    void run(() => client.publishMenu(menu.id), `“${menu.name}” is now the live menu.`);
  }

  return (
    <article className="vt-menu-editor">
      <div className="vt-menu-editor-head">
        <div>
          <span className={`vt-status vt-status-${menu.status}`}>{menu.status}</span>
          <h3>{menu.name}</h3>
        </div>
        <div className="vt-inline-actions">
          {menu.status === "published" && venueSlug && <a className="vt-link-button" href={`/m/${venueSlug}`}>Guest view</a>}
          <button className="vt-secondary" type="button" aria-expanded={editing} onClick={() => setEditing((value) => !value)}>
            {editing ? "Close editor" : "Edit menu"}
          </button>
          {menu.status !== "published" && (
            <button className="vt-primary" type="button" onClick={publish}>Publish</button>
          )}
          <button className="vt-link-button" type="button" onClick={remove}>Delete</button>
        </div>
      </div>
      {!editing && (
        <div className="vt-venue-menu-summary">
          <p className="vt-kicker">Drinks on this menu ({menu.drinkIds.length})</p>
          <p>{menu.drinkIds.length === 0
            ? "No drinks selected yet."
            : menu.drinkIds.map((id) => drinkNames.get(id)).filter(Boolean).join(", ") || "Selected drinks are no longer in the library."}</p>
        </div>
      )}
      {editing && (
        <form className="vt-admin-form vt-venue-menu-editor-form" onSubmit={(event) => void save(event)}>
          <label>Menu name<input name="name" defaultValue={menu.name} required maxLength={200} /></label>
          <fieldset className="vt-venue-drink-picker">
            <legend>Drinks on this menu ({menu.drinkIds.length})</legend>
            {drinks.length === 0 && <p>No drinks in the library yet.</p>}
            {drinks.map((drink) => (
              <label key={drink.id} className="vt-check">
                <input
                  type="checkbox"
                  name="drinkIds"
                  value={drink.id}
                  defaultChecked={menu.drinkIds.includes(drink.id)}
                /> {drink.name}
              </label>
            ))}
            {menu.drinkIds.filter((id) => !drinkNames.has(id)).length > 0 && (
              <p><small>Some drinks on this menu were deleted from the library.</small></p>
            )}
          </fieldset>
          <div className="vt-inline-actions">
            <button className="vt-primary" type="submit">Save changes</button>
            <button className="vt-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  );
}
