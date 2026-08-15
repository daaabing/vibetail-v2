import { useEffect, useState, type FormEvent } from "react";
import type { VenueAdminMenu, VenueDrink } from "@vibetail/contracts";
import type { HttpVenueManagementClient } from "../../../clients/http-venue-management-client.js";
import { useSeo } from "../../platform/useSeo.js";
import { DrinkForm } from "../DrinkForm.js";
import { VenueAdminLoading, VenueShell, errorMessage, useVenueSession } from "../VenueShell.js";

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

  function createMenu(event: FormEvent<HTMLFormElement>) {
    if (!state) return;
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const drinkIds = data.getAll("drinkIds").map(String);
    void run(async () => {
      await state.client.createMenu({ name, drinkIds });
      return state.client.listMenus();
    }, `Draft menu “${name}” created.`).then((created) => { if (created) form.reset(); });
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
          <form className="vt-admin-form" onSubmit={createMenu}>
            <label>Menu name<input name="name" required maxLength={200} placeholder="Summer Menu" /></label>
            <fieldset className="vt-venue-drink-picker">
              <legend>Drinks from your library</legend>
              {drinks !== undefined && drinks.length === 0 && <p>Your library is empty — add a drink below first.</p>}
              {drinks?.map((drink) => (
                <label key={drink.id} className="vt-check">
                  <input type="checkbox" name="drinkIds" value={drink.id} /> {drink.name}
                </label>
              ))}
            </fieldset>
            <button className="vt-primary" type="submit">Create draft menu</button>
          </form>
          <details className="vt-create-panel">
            <summary>Need a new drink first?</summary>
            <DrinkForm
              client={state.client}
              submitLabel="Add to library"
              onSubmit={async (input, reset) => {
                setError("");
                try {
                  await state.client.createDrink(input);
                  setDrinks(await state.client.listDrinks());
                  setNotice(`${input.name} added — tick it above to include it.`);
                  reset();
                } catch (caught) {
                  setError(errorMessage(caught));
                }
              }}
            />
          </details>
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
