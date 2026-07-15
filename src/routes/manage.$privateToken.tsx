import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMerchantForToken,
  getMenuItemsForManage,
  setItemAvailability,
  publishMenu,
  setMenuStatus,
} from "@/lib/menu/manage.functions";

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
};

function ManagePage() {
  const { privateToken } = Route.useParams();
  const fetchMerchant = useServerFn(getMerchantForToken);
  const fetchItems = useServerFn(getMenuItemsForManage);
  const toggleAvail = useServerFn(setItemAvailability);
  const publish = useServerFn(publishMenu);
  const setStatus = useServerFn(setMenuStatus);

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
        </div>
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
                  <div className="flex gap-2 shrink-0">
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
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
