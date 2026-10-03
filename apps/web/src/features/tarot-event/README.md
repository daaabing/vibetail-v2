# Tarot event feature

This is an isolated, replaceable event experience. It does not participate in
the venue matching flow and must not import Supabase, model SDKs, or server-only
credentials.

## Card data and visual provenance

- The UI uses the conventional 78-card Rider–Waite–Smith structure: 22 Major
  Arcana plus four 14-card suits.
- The intended structured meanings source is the StarTarot RWS Historical Tarot
  Dataset v1.1.0, released under CC BY 4.0:
  <https://startarot.online/open-data>
- Card faces are local, reviewed Rider–Waite–Smith public-domain assets. Their
  provenance is recorded in `public/deck/rider-waite/metadata.json`; do not add
  remote card-image URLs to the runtime.

Interaction references included in the design decision were Labyrinthos's
mobile-first tap-to-reveal pattern and the open-source `tarot-mcp` project's
explicit draw confirmation, stable retry, and reveal-before-reading lifecycle.
