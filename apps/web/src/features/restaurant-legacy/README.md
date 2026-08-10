# Temporary restaurant vertical slice

This directory is a deliberately isolated, temporary adaptation of the old repository's restaurant flow. It preserves only the useful interaction shape and muted visual language. It does not copy the old application shell, state stores, authentication, image generation, save/share, poster, newsletter, games, admin, analytics, or Lovable dependencies.

Boundary rules:

- Components consume only `RestaurantClient` and `@vibetail/contracts` types.
- `adapters/http-restaurant-client.ts` is the only HTTP adapter.
- `adapters/legacy-result.ts` is the explicit canonical-result-to-temporary-view-model mapper.
- No browser code imports Supabase, model providers, service credentials, or server composition roots.

Deletion marker: remove this entire directory when the replacement design system and permanent restaurant experience land. Keep the route and contracts; replace the mapper and components without changing the server domain boundary.
