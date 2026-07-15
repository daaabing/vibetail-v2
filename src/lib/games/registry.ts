// Vibetail Game Registry.
// Every game the platform can play is registered here. Menus reference games
// by `id` (stable) via menus.enabled_game_ids. New games register once and
// output the shared MatchProfile — the Menu layer never touches game internals.

export type GameStatus = "active" | "coming_soon" | "hidden";

export interface GameDefinition {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  thumbnailUrl?: string;
  status: GameStatus;
  version: string;
  /** Route path (without merchant/menu context) for standalone play. */
  standaloneRoute: string;
}

export const GAMES: GameDefinition[] = [
  {
    id: "vibetail-mood",
    slug: "vibetail-mood",
    name: "Mood Cocktail",
    shortDescription: "把此刻的心情，调成难忘体验",
    status: "active",
    version: "1",
    standaloneRoute: "/",
  },
];

const byId = new Map(GAMES.map((g) => [g.id, g]));
const bySlug = new Map(GAMES.map((g) => [g.slug, g]));

export const getGame = (id: string): GameDefinition | undefined => byId.get(id);
export const getGameBySlug = (slug: string): GameDefinition | undefined =>
  bySlug.get(slug);

export const listActiveGames = (): GameDefinition[] =>
  GAMES.filter((g) => g.status === "active");

/** Given a menu's enabled_game_ids, return active games in display order. */
export function resolveMenuGames(
  enabledIds: string[],
  displayOrder: string[] = [],
): GameDefinition[] {
  const ordered = displayOrder.length ? displayOrder : enabledIds;
  const seen = new Set<string>();
  const out: GameDefinition[] = [];
  for (const id of ordered) {
    if (seen.has(id)) continue;
    const g = byId.get(id);
    if (g && g.status === "active" && enabledIds.includes(id)) {
      out.push(g);
      seen.add(id);
    }
  }
  return out;
}
