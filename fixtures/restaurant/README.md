# Restaurant fixtures

`menus.json` is a small deterministic demo/test fixture. It borrows the public seed identity `double-chicken-please/main` and a few menu names for realistic compatibility testing; it is not a production export and contains no personal data.

It covers two active demo restaurants plus inactive, unpublished, missing, empty, no-active, sold-out, hidden, cross-menu, and provider-failure paths. `matchingFailureMenuIds` configures the deterministic provider's explicit retryable failure case.

Local-only management tokens:

- `fixture-double-chicken-demo`
- `fixture-nightjar-demo-token`

They are public test strings, not credentials. Fixture writes stay in server memory and reset on restart.
