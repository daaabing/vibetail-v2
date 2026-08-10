# Fixtures

Deterministic, non-production restaurant and agent-run fixtures live here. Never commit production exports, credentials, or personal data.

`restaurant/menus.json` includes two active demo bars, published/draft menus, active/sold-out/hidden items, and two deliberately public local management tokens. Fixture repositories are mutable in memory so browser QA can verify management changes immediately; restarting the dev server resets the fixture.
