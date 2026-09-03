import { useState } from "react";
import type { VenueDirectoryEntry, VenueMenu } from "@vibetail/contracts";
import { HttpVenueClient } from "../../clients/http-venue-client.js";
import Draw from "../draw/art.js";
import type { MatchScope } from "./MatchSheet.js";
import { ChevronIcon } from "./icons.js";

const client = new HttpVenueClient();

type MenuState = { status: "loading" } | { status: "error" } | { status: "ready"; menu: VenueMenu };

/**
 * A bar, in-app: intro, its live menus, and the one action that matters —
 * match here. Menus open inline so the guest never leaves the shell.
 */
export function VenueSheet({ entry, onMatch }: { entry: VenueDirectoryEntry; onMatch(scope: MatchScope): void }) {
  const { venue, menus } = entry;
  const [openMenu, setOpenMenu] = useState<{ slug: string; state: MenuState }>();

  function toggleMenu(menuSlug: string) {
    if (openMenu?.slug === menuSlug) { setOpenMenu(undefined); return; }
    setOpenMenu({ slug: menuSlug, state: { status: "loading" } });
    client.getPublishedMenu(venue.slug, menuSlug)
      .then((menu) => {
        client.recordMenuView({ merchantSlug: venue.slug, menuId: menu.id });
        setOpenMenu((current) => current?.slug === menuSlug ? { slug: menuSlug, state: { status: "ready", menu } } : current);
      })
      .catch(() => setOpenMenu((current) => current?.slug === menuSlug ? { slug: menuSlug, state: { status: "error" } } : current));
  }

  return <div className="ma-venue-sheet">
    {venue.coverImageUrl && <img alt="" className="ma-venue-cover" src={venue.coverImageUrl} />}
    <div className="ma-venue-title">
      {venue.logoUrl && <img alt="" className="ma-venue-logo" src={venue.logoUrl} />}
      <h2 className="display">{venue.name}</h2>
    </div>
    {venue.shortIntro && <p className="ma-venue-intro">{venue.shortIntro}</p>}

    {menus.length > 0 && <button
      className="btn btn-solid ma-venue-match"
      type="button"
      onClick={() => onMatch({ kind: "venue", venueName: venue.name, merchantSlug: venue.slug, menuSlug: menus[0]!.slug })}
    >
      Match my vibe here
    </button>}

    <section className="ma-venue-menus">
      {menus.length === 0 && <p className="ma-quiet">No live menu right now.</p>}
      {menus.map((menu) => <div className="ma-menu-block" key={menu.id}>
        <button aria-expanded={openMenu?.slug === menu.slug} className="ma-menu-row" type="button" onClick={() => toggleMenu(menu.slug)}>
          <span>
            <strong>{menu.name}</strong>
            {menu.shortIntro && <small>{menu.shortIntro}</small>}
          </span>
          <span className="ma-menu-chevron" data-open={openMenu?.slug === menu.slug || undefined}><ChevronIcon size={16} /></span>
        </button>
        {openMenu?.slug === menu.slug && <MenuItems state={openMenu.state} />}
      </div>)}
    </section>
  </div>;
}

function MenuItems({ state }: { state: MenuState }) {
  if (state.status === "loading") return <p className="ma-quiet">Pouring the menu…</p>;
  if (state.status === "error") return <p className="ma-alert" role="alert">That menu didn’t load. Try again in a moment.</p>;
  const sections = new Map<string, VenueMenu["items"]>();
  for (const item of state.menu.items) {
    const section = item.section ?? "";
    sections.set(section, [...(sections.get(section) ?? []), item]);
  }
  return <ul className="ma-menu-items">
    {[...sections.entries()].map(([section, items]) => <li key={section || "·"}>
      {section && <p className="ma-kicker">{section}</p>}
      <ul>
        {items.map((item) => <li className="ma-menu-item" data-sold-out={item.availabilityStatus === "sold_out" || undefined} key={item.id}>
          {item.imageUrl
            ? <img alt="" className="ma-item-photo" loading="lazy" src={item.imageUrl} />
            : <span className="ma-item-sketch"><Draw name="glass" strokeWidth={2.4} /></span>}
          <span className="ma-item-body">
            <span className="ma-item-line">
              <strong>{item.name}</strong>
              {item.price && <em>{item.price}</em>}
            </span>
            {item.description && <small>{item.description}</small>}
            {item.availabilityStatus === "sold_out" && <small className="ma-item-out">Sold out tonight</small>}
          </span>
        </li>)}
      </ul>
    </li>)}
  </ul>;
}
