import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ManagedMenu,
  ManagedMenuItem,
  ManagedMerchant,
  MenuItemInput,
  UpdateMenuInput,
} from "@vibetail/contracts";
import { HttpManagementClient } from "../../../clients/http-management-client.js";
import { RestaurantClientError } from "../../../clients/http-restaurant-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

export function ManagementPage({ privateToken }: { privateToken?: string }) {
  useSeo("Bar management — Vibetail", "Manage a Vibetail merchant and its menus.", true);
  if (!privateToken) return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><header className="vt-page-title"><p className="vt-kicker">For bar teams</p><h1>Keep every recommendation honest.</h1><p>Open your private management link to edit menus, mark sold-out items and publish changes.</p></header><div className="vt-management-entry"><p>Local fixture demo</p><a className="vt-primary" href="/manage/fixture-double-chicken-demo">Open Double Chicken Please</a><small>This demo token is local, non-sensitive fixture data.</small></div></main><SiteFooter /></div>;
  return <ManagementWorkspace privateToken={privateToken} />;
}

function ManagementWorkspace({ privateToken }: { privateToken: string }) {
  const client = useMemo(() => new HttpManagementClient(privateToken), [privateToken]);
  const [merchant, setMerchant] = useState<ManagedMerchant>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { client.getManagedMerchant().then(setMerchant).catch((caught) => setError(message(caught))); }, [client]);

  async function run(operation: () => Promise<ManagedMerchant>, success: string) {
    setError(""); setNotice("");
    try { setMerchant(await operation()); setNotice(success); }
    catch (caught) { setError(message(caught)); }
  }

  if (!merchant && !error) return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><p className="vt-loading">Verifying your management link…</p></main></div>;
  if (!merchant) return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><div className="vt-alert" role="alert"><strong>Management link unavailable</strong><p>{error}</p></div></main></div>;

  return <div className="vt-page vt-management"><SiteHeader /><main className="vt-wide">
    <header className="vt-management-title"><div><p className="vt-kicker">Temporary private-link management</p><h1>{merchant.name}</h1><p>Edit the live facts. Matching only sees active items on published menus.</p></div><a className="vt-secondary" href={`/restaurants/${merchant.slug}`}>Public listing</a></header>
    {error && <div className="vt-alert" role="alert">{error}</div>}{notice && <p className="vt-notice" role="status">{notice}</p>}
    <MerchantForm merchant={merchant} save={(input) => run(() => client.updateMerchant(input), "Bar profile saved.")} />
    <section className="vt-manage-section"><div className="vt-section-heading"><div><p className="vt-kicker">Menus</p><h2>Published experiences</h2></div><span>{merchant.menus.length} total</span></div>
      <CreateMenuForm create={(input) => run(() => client.createMenu(input), "Draft menu created.")} />
      <div className="vt-menu-stack">{merchant.menus.map((menu) => <MenuEditor key={menu.id} merchantSlug={merchant.slug} menu={menu} run={run} client={client} />)}</div>
    </section>
  </main><SiteFooter /></div>;
}

function MerchantForm({ merchant, save }: { merchant: ManagedMerchant; save: (input: { name: string; shortIntro: string | null; logoUrl: string | null; coverImageUrl: string | null; isActive: boolean }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    save({ name: String(data.get("name")), shortIntro: nullable(data.get("shortIntro")), logoUrl: nullable(data.get("logoUrl")), coverImageUrl: nullable(data.get("coverImageUrl")), isActive: data.get("isActive") === "on" });
  }
  return <section className="vt-manage-section"><div className="vt-section-heading"><div><p className="vt-kicker">Bar profile</p><h2>Guest-facing details</h2></div></div><form className="vt-admin-form vt-admin-grid" onSubmit={submit}>
    <label>Name<input name="name" defaultValue={merchant.name} required /></label><label>Short intro<input name="shortIntro" defaultValue={merchant.shortIntro ?? ""} /></label>
    <label>Logo URL<input name="logoUrl" type="url" defaultValue={merchant.logoUrl ?? ""} /></label><label>Cover URL<input name="coverImageUrl" type="url" defaultValue={merchant.coverImageUrl ?? ""} /></label>
    <label className="vt-check"><input name="isActive" type="checkbox" defaultChecked={merchant.isActive} /> Active and discoverable</label><button className="vt-primary" type="submit">Save profile</button>
  </form></section>;
}

function CreateMenuForm({ create }: { create: (input: { name: string; slug: string; shortIntro: string | null }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); create({ name: String(data.get("name")), slug: String(data.get("slug")), shortIntro: nullable(data.get("shortIntro")) }); form.reset(); }
  return <details className="vt-create-panel"><summary>Create a menu</summary><form className="vt-admin-form vt-admin-grid" onSubmit={submit}><label>Name<input name="name" required placeholder="Late Night" /></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="late-night" /></label><label className="vt-span-2">Short intro<input name="shortIntro" /></label><button className="vt-primary" type="submit">Create draft</button></form></details>;
}

function MenuEditor({ merchantSlug, menu, client, run }: { merchantSlug: string; menu: ManagedMenu; client: HttpManagementClient; run: (operation: () => Promise<ManagedMerchant>, success: string) => Promise<void> }) {
  const deepLink = `/m/${merchantSlug}/${menu.slug}`;
  async function copyLink() { await navigator.clipboard.writeText(`${window.location.origin}${deepLink}`); }
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const status = String(data.get("status")); const input: UpdateMenuInput = { name: String(data.get("name")), slug: String(data.get("slug")), shortIntro: nullable(data.get("shortIntro")), ...(status === "draft" || status === "paused" ? { status } : {}) }; void run(() => client.updateMenu(menu.id, input), "Menu details saved."); }
  return <article className="vt-menu-editor"><div className="vt-menu-editor-head"><div><span className={`vt-status vt-status-${menu.status}`}>{menu.status}</span><h3>{menu.name}</h3></div><div className="vt-inline-actions"><button className="vt-link-button" onClick={() => void copyLink()}>Copy link</button><a className="vt-link-button" href={deepLink}>Preview</a>{menu.status !== "published" && <button className="vt-primary" onClick={() => void run(() => client.publishMenu(menu.id), "Menu published.")}>Publish</button>}</div></div>
    <form className="vt-admin-form vt-admin-grid" onSubmit={save}><label>Name<input name="name" defaultValue={menu.name} required /></label><label>Slug<input name="slug" defaultValue={menu.slug} required /></label><label>Short intro<input name="shortIntro" defaultValue={menu.shortIntro ?? ""} /></label><label>Status<select name="status" defaultValue={menu.status}><option value="published">Published (keep)</option><option value="draft">Draft</option><option value="paused">Paused</option></select></label><button className="vt-secondary" type="submit">Save menu</button></form>
    <div className="vt-items"><h4>Menu items</h4>{menu.items.length === 0 && <p>No items yet. Add one before publishing.</p>}{menu.items.map((item) => <ItemEditor key={item.id} item={item} client={client} run={run} />)}<CreateItemForm menuId={menu.id} client={client} run={run} /></div>
  </article>;
}

function ItemEditor({ item, client, run }: { item: ManagedMenuItem; client: HttpManagementClient; run: (operation: () => Promise<ManagedMerchant>, success: string) => Promise<void> }) {
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); void run(() => client.updateMenuItem(item.id, itemInput(data)), `${item.name} saved.`); }
  return <details className="vt-item" open={false}><summary><span><strong>{item.name}</strong><small>{item.section ?? "Unsectioned"}</small></span><select aria-label={`${item.name} availability`} value={item.availabilityStatus} onClick={(event) => event.stopPropagation()} onChange={(event) => void run(() => client.updateMenuItemAvailability(item.id, { availabilityStatus: event.target.value as ManagedMenuItem["availabilityStatus"] }), `${item.name} is now ${event.target.value}.`)}><option value="active">Active</option><option value="sold_out">Sold out</option><option value="hidden">Hidden</option></select></summary><ItemFields item={item} save={save} /></details>;
}

function CreateItemForm({ menuId, client, run }: { menuId: string; client: HttpManagementClient; run: (operation: () => Promise<ManagedMerchant>, success: string) => Promise<void> }) {
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(() => client.createMenuItem(menuId, itemInput(data)), "Menu item added."); form.reset(); }
  return <details className="vt-create-panel"><summary>Add an item</summary><ItemFields save={save} /></details>;
}

function ItemFields({ item, save }: { item?: ManagedMenuItem; save: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="vt-admin-form vt-admin-grid" onSubmit={save}><label>Name<input name="name" defaultValue={item?.name} required /></label><label>Section<input name="section" defaultValue={item?.section ?? ""} /></label><label className="vt-span-2">Description<input name="description" defaultValue={item?.description ?? ""} /></label><label>Base spirit<input name="baseSpirit" defaultValue={item?.baseSpirit ?? ""} /></label><label>Image URL<input name="imageUrl" type="url" defaultValue={item?.imageUrl ?? ""} /></label><label>Flavor tags<input name="flavorTags" defaultValue={item?.flavorTags.join(", ")} placeholder="bright, citrusy" /></label><label>Mood tags<input name="moodTags" defaultValue={item?.moodTags.join(", ")} placeholder="curious, celebratory" /></label><label>Ingredients<input name="ingredients" defaultValue={item?.ingredients.join(", ")} /></label><label>Allergens<input name="allergens" defaultValue={item?.allergens.join(", ")} /></label><label className="vt-check"><input name="alcoholic" type="checkbox" defaultChecked={item?.alcoholic ?? true} /> Contains alcohol</label><button className="vt-secondary" type="submit">{item ? "Save item" : "Add active item"}</button></form>;
}

function itemInput(data: FormData): MenuItemInput { return { name: String(data.get("name")), description: nullable(data.get("description")), imageUrl: nullable(data.get("imageUrl")), alcoholic: data.get("alcoholic") === "on", baseSpirit: nullable(data.get("baseSpirit")), flavorTags: tags(data.get("flavorTags")), moodTags: tags(data.get("moodTags")), ingredients: tags(data.get("ingredients")), allergens: tags(data.get("allergens")), section: nullable(data.get("section")) }; }
function tags(value: FormDataEntryValue | null): string[] { return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean); }
function nullable(value: FormDataEntryValue | null): string | null { const result = String(value ?? "").trim(); return result || null; }
function message(error: unknown): string { return error instanceof RestaurantClientError ? error.detail.message : "The management service could not complete that action."; }
