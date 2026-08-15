# XPRIZE testing instructions

Status: pending credentialed Vertex canary and Railway preview deployment.

## Public URL

- URL: `TBD_RAILWAY_XPRIZE_URL`
- Availability commitment: keep free and unrestricted through September 15, 2026.
- Login: not required for the guest Tasting Agent flow.

## Primary judge path

1. Open `/match` while signed out.
2. Enter a mood and at least one flavor preference.
3. Submit to the Tasting Agent.
4. Confirm the result names one real venue, published menu, and currently active item.
5. Follow the venue link and run another match scoped to that menu.
6. Optionally switch the venue experience to Chinese and run a materially different request.

Expected behavior:

- loading state says the Tasting Agent is reading live menus;
- a successful result includes a venue, menu, real item facts, explanation, and trace ID in the API response;
- unavailable/provider failures show a retryable error and never fabricate an item;
- editing preferences or matching again remains available.

## Verification endpoints

```text
GET  /health
GET  /ready
GET  /v1/venues
GET  /v1/venues/double-chicken-please/menus/main
POST /v1/matches/global
POST /v1/venues/double-chicken-please/menus/main/match
```

Final expected response examples and the actual public URL must be added only after the deployment smoke test.
