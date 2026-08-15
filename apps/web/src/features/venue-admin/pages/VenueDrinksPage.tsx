import { useEffect, useState } from "react";
import type { VenueDrink } from "@vibetail/contracts";
import { useSeo } from "../../platform/useSeo.js";
import { DrinkForm } from "../DrinkForm.js";
import { VenueAdminLoading, VenueShell, errorMessage, useVenueSession } from "../VenueShell.js";

export function VenueDrinksPage() {
  useSeo("Drink library — Vibetail", "Manage your venue's drink library.", true);
  const state = useVenueSession();
  const [drinks, setDrinks] = useState<VenueDrink[]>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const client = state?.client;
  useEffect(() => {
    if (!client) return;
    let active = true;
    client.listDrinks()
      .then((loaded) => { if (active) setDrinks(loaded); })
      .catch((caught: unknown) => { if (active) setError(errorMessage(caught)); });
    return () => { active = false; };
  }, [client]);

  if (!state) return <VenueAdminLoading />;

  async function run(operation: () => Promise<VenueDrink[]>, success: string) {
    setError("");
    setNotice("");
    try {
      setDrinks(await operation());
      setNotice(success);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function removeDrink(drink: VenueDrink) {
    if (!state) return;
    setError("");
    setNotice("");
    try {
      const usage = await state.client.getDrinkUsage(drink.id);
      const inMenus = usage.menus.map((menu) => menu.name);
      const warning = inMenus.length > 0
        ? `“${drink.name}” is used by ${inMenus.length} menu(s): ${inMenus.join(", ")}. Deleting removes it from those menus too.`
        : `Delete “${drink.name}” from your library?`;
      if (!window.confirm(warning)) return;
      const result = await state.client.deleteDrink(drink.id);
      setDrinks(await state.client.listDrinks());
      setNotice(result.removedFromMenus > 0
        ? `${drink.name} deleted and removed from ${result.removedFromMenus} menu(s).`
        : `${drink.name} deleted.`);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <VenueShell active="drinks" state={state}>
      <section className="vt-manage-section">
        <div className="vt-section-heading">
          <div><p className="vt-kicker">Drink library</p><h2>Every drink, once</h2></div>
          <span>{drinks?.length ?? 0} drinks</span>
        </div>
        <p>Drinks live here independently of menus — one drink can appear on several menus, and edits reach all of them.</p>
        {error && <div className="vt-alert" role="alert">{error}</div>}
        {notice && <p className="vt-notice" role="status">{notice}</p>}

        <details className="vt-create-panel" open={drinks !== undefined && drinks.length === 0}>
          <summary>Add a drink</summary>
          <DrinkForm
            client={state.client}
            submitLabel="Add to library"
            onSubmit={async (input, reset) => {
              await run(async () => {
                await state.client.createDrink(input);
                return state.client.listDrinks();
              }, `${input.name} added to the library.`);
              reset();
            }}
          />
        </details>

        {!drinks && !error && <p className="vt-loading">Loading your library…</p>}
        <div className="vt-menu-stack">
          {drinks?.map((drink) => (
            <details className="vt-item" key={drink.id}>
              <summary>
                <span>
                  <strong>{drink.name}</strong>
                  <small>
                    {[drink.baseSpirit, drink.strength, drink.price].filter(Boolean).join(" · ") || "No details yet"}
                  </small>
                </span>
                <button
                  className="vt-link-button"
                  onClick={(event) => { event.preventDefault(); void removeDrink(drink); }}
                >
                  Delete
                </button>
              </summary>
              <DrinkForm
                key={`${drink.id}-editor`}
                drink={drink}
                client={state.client}
                submitLabel="Save drink"
                onSubmit={async (input) => run(async () => {
                  await state.client.updateDrink(drink.id, input);
                  return state.client.listDrinks();
                }, `${input.name} saved. Changes apply to every menu using it.`)}
              />
            </details>
          ))}
        </div>
      </section>
    </VenueShell>
  );
}
