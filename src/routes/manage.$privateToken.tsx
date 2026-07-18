import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMerchantForToken,
  getMenuItemsForManage,
  setItemAvailability,
  publishMenu,
  setMenuStatus,
  createMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "@/lib/menu/manage.functions";
import { listActiveGames } from "@/lib/games/registry";

export const Route = createFileRoute("/manage/$privateToken")({
  head: () => ({
    meta: [
      { title: "Vibetail — Menu Management" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ManagePage,
});

type Merchant = { id: string; slug: string; name: string; short_intro: string | null; is_active: boolean };
type Menu = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published" | "paused";
  short_intro: string | null;
  enabled_game_ids: string[];
  published_version_id: string | null;
};
type Item = {
  id: string;
  name: string;
  ingredients: string[];
  alcoholic: boolean;
  base_spirit: string | null;
  section: string | null;
  availability_status: "active" | "sold_out" | "hidden";
  image_url: string | null;
  flavor_tags?: string[] | null;
  mood_tags?: string[] | null;
  description?: string | null;
};

function ManagePage() {
  const { privateToken } = Route.useParams();
  const fetchMerchant = useServerFn(getMerchantForToken);
  const fetchItems = useServerFn(getMenuItemsForManage);
  const toggleAvail = useServerFn(setItemAvailability);
  const publish = useServerFn(publishMenu);
  const setStatus = useServerFn(setMenuStatus);
  const addMenu = useServerFn(createMenu);
  const addItem = useServerFn(createMenuItem);
  const removeItem = useServerFn(deleteMenuItem);
  const activeGames = listActiveGames();

  const [status, setStatusMsg] = useState<"loading" | "ok" | "unauth" | "error">("loading");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMerchant({ data: { token: privateToken } })
      .then((res) => {
        if (cancelled) return;
        setMerchant(res.merchant as Merchant);
        setMenus(res.menus as Menu[]);
        setActiveMenuId((res.menus as Menu[])[0]?.id ?? null);
        setStatusMsg("ok");
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setStatusMsg(e.message === "Unauthorized" || e.message === "Invalid token" ? "unauth" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [privateToken, fetchMerchant]);

  useEffect(() => {
    if (!activeMenuId) return;
    let cancelled = false;
    fetchItems({ data: { token: privateToken, menuId: activeMenuId } })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items as Item[]);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMenuId, privateToken, fetchItems]);

  const runTogglable = async (
    label: string,
    fn: () => Promise<unknown>,
    after?: () => Promise<unknown> | void,
  ) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (after) await after();
      setMsg(label + " ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reloadItems = async () => {
    if (!activeMenuId) return;
    const res = await fetchItems({ data: { token: privateToken, menuId: activeMenuId } });
    setItems(res.items as Item[]);
  };

  const reloadMenus = async () => {
    const res = await fetchMerchant({ data: { token: privateToken } });
    setMenus(res.menus as Menu[]);
  };

  if (status === "loading") {
    return (
      <div className="min-h-svh flex items-center justify-center px-6" style={{ color: "var(--app-text-muted)" }}>
        Verifying access…
      </div>
    );
  }
  if (status === "unauth") {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-3xl mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
          Invalid or revoked link
        </h1>
        <p style={{ color: "var(--app-text-muted)" }}>Ask Vibetail for a new management link.</p>
      </div>
    );
  }
  if (status === "error" || !merchant) {
    return (
      <div className="min-h-svh flex items-center justify-center px-6" style={{ color: "var(--app-text-muted)" }}>
        Something went wrong.
      </div>
    );
  }

  const activeMenu = menus.find((m) => m.id === activeMenuId) ?? null;

  return (
    <div className="min-h-svh w-full md:max-w-4xl md:mx-auto px-6 py-10" style={{ color: "var(--app-text)" }}>
      <header className="mb-8">
        <div
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}
        >
          Vibetail Management
        </div>
        <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
          {merchant.name}
        </h1>
        {merchant.short_intro && (
          <p className="mt-1 text-sm" style={{ color: "var(--app-text-muted)" }}>
            {merchant.short_intro}
          </p>
        )}
      </header>

      <section className="mb-6">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--app-text-muted)" }}>
          Menus
        </div>
        <div className="flex flex-wrap gap-2">
          {menus.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMenuId(m.id)}
              className="px-3 py-1.5 rounded-full text-sm"
              style={{
                background: m.id === activeMenuId ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontFamily: "var(--font-heading)",
              }}
            >
              {m.name}{" "}
              <span style={{ color: "var(--app-text-muted)", marginLeft: 6, fontSize: 11 }}>
                {m.status}
              </span>
            </button>
          ))}
          {menus.length === 0 && (
            <div className="text-sm" style={{ color: "var(--app-text-muted)" }}>
              No menus yet — create your first one below.
            </div>
          )}
        </div>

        <NewMenuForm
          busy={busy}
          activeGames={activeGames}
          onCreate={async (payload) => {
            await runTogglable("Menu created", async () => {
              const res = await addMenu({ data: { token: privateToken, ...payload } });
              await reloadMenus();
              setActiveMenuId(res.menuId);
            });
          }}
        />
      </section>

      {activeMenu && (
        <>
          <section className="mb-6 flex items-center gap-3 flex-wrap">
            <a
              href={`/m/${merchant.slug}/${activeMenu.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline"
              style={{ color: "var(--app-text-secondary)" }}
            >
              View public page →
            </a>
            <button
              disabled={busy}
              onClick={() =>
                runTogglable("Published", () => publish({ data: { token: privateToken, menuId: activeMenu.id } }), reloadMenus)
              }
              className="px-4 py-2 rounded-full text-sm"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
                border: "1px solid rgba(255,255,255,0.14)",
                fontFamily: "var(--font-heading)",
                opacity: busy ? 0.5 : 1,
              }}
            >
              Publish new version
            </button>
            {activeMenu.status !== "paused" ? (
              <button
                disabled={busy}
                onClick={() =>
                  runTogglable(
                    "Paused",
                    () => setStatus({ data: { token: privateToken, menuId: activeMenu.id, status: "paused" } }),
                    reloadMenus,
                  )
                }
                className="px-4 py-2 rounded-full text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.14)", fontFamily: "var(--font-heading)" }}
              >
                Pause menu
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() =>
                  runTogglable(
                    "Resumed",
                    () => setStatus({ data: { token: privateToken, menuId: activeMenu.id, status: "published" } }),
                    reloadMenus,
                  )
                }
                className="px-4 py-2 rounded-full text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.14)", fontFamily: "var(--font-heading)" }}
              >
                Resume menu
              </button>
            )}
            {msg && <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{msg}</span>}
          </section>

          <section>
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--app-text-muted)" }}>
              Items ({items.length}) — sold-out changes take effect immediately
            </div>
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
                      {it.name}{" "}
                      {it.section && (
                        <span style={{ color: "var(--app-text-muted)", fontSize: 11, marginLeft: 6 }}>
                          [{it.section}]
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--app-text-muted)" }}>
                      {it.ingredients.join(", ")}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {(["active", "sold_out", "hidden"] as const).map((v) => (
                      <button
                        key={v}
                        disabled={busy || it.availability_status === v}
                        onClick={() =>
                          runTogglable(
                            `${it.name}: ${v}`,
                            () =>
                              toggleAvail({
                                data: { token: privateToken, menuItemId: it.id, availabilityStatus: v },
                              }),
                            reloadItems,
                          )
                        }
                        className="px-2.5 py-1 rounded text-[11px]"
                        style={{
                          background:
                            it.availability_status === v ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontFamily: "var(--font-heading)",
                          opacity: busy ? 0.5 : 1,
                        }}
                      >
                        {v}
                      </button>
                    ))}
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`Delete "${it.name}"?`)) return;
                        runTogglable(
                          `${it.name}: deleted`,
                          () => removeItem({ data: { token: privateToken, menuItemId: it.id } }),
                          reloadItems,
                        );
                      }}
                      className="px-2.5 py-1 rounded text-[11px]"
                      style={{
                        border: "1px solid rgba(255,80,80,0.35)",
                        color: "rgba(255,140,140,0.9)",
                        fontFamily: "var(--font-heading)",
                        opacity: busy ? 0.5 : 1,
                      }}
                    >
                      delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <AddItemForm
              busy={busy}
              onCreate={async (payload) => {
                await runTogglable("Item added", async () => {
                  await addItem({ data: { token: privateToken, menuId: activeMenu.id, ...payload } });
                  await reloadItems();
                });
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}

// ----- New menu form -----

type NewMenuPayload = {
  name: string;
  slug: string;
  shortIntro: string | null;
  enabledGameIds: string[];
};

function NewMenuForm({
  busy,
  activeGames,
  onCreate,
}: {
  busy: boolean;
  activeGames: { id: string; name: string }[];
  onCreate: (payload: NewMenuPayload) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortIntro, setShortIntro] = useState("");
  const [gameIds, setGameIds] = useState<string[]>(
    activeGames[0] ? [activeGames[0].id] : [],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 px-3 py-1.5 rounded-full text-sm"
        style={{
          border: "1px dashed rgba(255,255,255,0.25)",
          fontFamily: "var(--font-heading)",
        }}
      >
        + New menu
      </button>
    );
  }

  return (
    <form
      className="mt-4 p-4 rounded-lg space-y-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || !slug.trim() || gameIds.length === 0) return;
        await onCreate({
          name: name.trim(),
          slug: slug.trim(),
          shortIntro: shortIntro.trim() || null,
          enabledGameIds: gameIds,
        });
        setName("");
        setSlug("");
        setShortIntro("");
        setOpen(false);
      }}
    >
      <FieldRow label="Name">
        <TextInput value={name} onChange={setName} placeholder="Main Menu" />
      </FieldRow>
      <FieldRow label="Slug (URL)">
        <TextInput value={slug} onChange={setSlug} placeholder="main" />
      </FieldRow>
      <FieldRow label="Short intro (optional)">
        <TextInput value={shortIntro} onChange={setShortIntro} placeholder="Culinary cocktails." />
      </FieldRow>
      <FieldRow label="Games">
        <div className="flex flex-wrap gap-2">
          {activeGames.map((g) => {
            const on = gameIds.includes(g.id);
            return (
              <button
                type="button"
                key={g.id}
                onClick={() =>
                  setGameIds(on ? gameIds.filter((x) => x !== g.id) : [...gameIds, g.id])
                }
                className="px-2.5 py-1 rounded text-[11px]"
                style={{
                  background: on ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </FieldRow>
      <div className="flex gap-2">
        <button
          disabled={busy}
          type="submit"
          className="px-4 py-2 rounded-full text-sm"
          style={{
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.2)",
            fontFamily: "var(--font-heading)",
            opacity: busy ? 0.5 : 1,
          }}
        >
          Create menu
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-full text-sm"
          style={{ border: "1px solid rgba(255,255,255,0.14)", fontFamily: "var(--font-heading)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ----- Add item form -----

type NewItemPayload = {
  name: string;
  section: string | null;
  ingredients: string[];
  baseSpirit: string | null;
  alcoholic: boolean;
  imageUrl: string | null;
  flavorTags: string[];
  moodTags: string[];
};

function AddItemForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (payload: NewItemPayload) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [baseSpirit, setBaseSpirit] = useState("");
  const [alcoholic, setAlcoholic] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [flavorTags, setFlavorTags] = useState("");
  const [moodTags, setMoodTags] = useState("");

  const splitCsv = (s: string): string[] =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 px-3 py-1.5 rounded-full text-sm"
        style={{
          border: "1px dashed rgba(255,255,255,0.25)",
          fontFamily: "var(--font-heading)",
        }}
      >
        + Add drink
      </button>
    );
  }

  return (
    <form
      className="mt-4 p-4 rounded-lg space-y-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onCreate({
          name: name.trim(),
          section: section.trim() || null,
          ingredients: splitCsv(ingredients),
          baseSpirit: baseSpirit.trim() || null,
          alcoholic,
          imageUrl: imageUrl.trim() || null,
          flavorTags: splitCsv(flavorTags),
          moodTags: splitCsv(moodTags),
        });
        setName("");
        setSection("");
        setIngredients("");
        setBaseSpirit("");
        setImageUrl("");
        setFlavorTags("");
        setMoodTags("");
      }}
    >
      <FieldRow label="Name">
        <TextInput value={name} onChange={setName} placeholder="Space Dog" />
      </FieldRow>
      <FieldRow label="Section (optional)">
        <TextInput value={section} onChange={setSection} placeholder="Signatures" />
      </FieldRow>
      <FieldRow label="Ingredients (comma separated)">
        <TextInput
          value={ingredients}
          onChange={setIngredients}
          placeholder="mezcal, lime, agave, chili"
        />
      </FieldRow>
      <FieldRow label="Base spirit (optional)">
        <TextInput value={baseSpirit} onChange={setBaseSpirit} placeholder="mezcal" />
      </FieldRow>
      <FieldRow label="Flavor tags (comma separated)">
        <TextInput value={flavorTags} onChange={setFlavorTags} placeholder="smoky, spicy" />
      </FieldRow>
      <FieldRow label="Mood tags (comma separated)">
        <TextInput value={moodTags} onChange={setMoodTags} placeholder="bold, playful" />
      </FieldRow>
      <FieldRow label="Image URL (optional)">
        <TextInput value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
      </FieldRow>
      <FieldRow label="Alcoholic?">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alcoholic}
            onChange={(e) => setAlcoholic(e.target.checked)}
          />
          <span style={{ color: "var(--app-text-muted)" }}>Contains alcohol</span>
        </label>
      </FieldRow>
      <div className="flex gap-2">
        <button
          disabled={busy}
          type="submit"
          className="px-4 py-2 rounded-full text-sm"
          style={{
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.2)",
            fontFamily: "var(--font-heading)",
            opacity: busy ? 0.5 : 1,
          }}
        >
          Add drink
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-full text-sm"
          style={{ border: "1px solid rgba(255,255,255,0.14)", fontFamily: "var(--font-heading)" }}
        >
          Close
        </button>
      </div>
    </form>
  );
}

// ----- shared field primitives -----

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-widest mb-1"
        style={{ color: "var(--app-text-muted)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md text-sm"
      style={{
        background: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "var(--app-text)",
        fontFamily: "var(--font-body)",
      }}
    />
  );
}
