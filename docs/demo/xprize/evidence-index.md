# XPRIZE product evidence index

Raw billing, customer, credential, and dashboard evidence stays outside git. This file indexes redacted evidence after it exists.

| Evidence | Status | Private artifact/reference |
| --- | --- | --- |
| Exact submission commit and passing `pnpm run ci` | Pending | TBD |
| Active Railway deployment and public URL | Pending approval | TBD |
| Global English Tasting Agent trace | Pending Vertex deployment | TBD |
| Venue-specific English trace | Pending Vertex deployment | TBD |
| Venue-specific Chinese/different-preference trace | Pending Vertex deployment | TBD |
| Sanitized Railway provider/model/token/latency logs | Pending Vertex deployment | TBD |
| Vertex/Gemini usage dashboard | Pending Google Cloud access | TBD |
| Google Cloud billing/cost evidence | Pending evidence owner | TBD |
| Real-user/customer evidence with consent | Pending evidence owner | TBD |
| Revenue, related-party revenue, expenses, marketing spend, P&L | Pending evidence owner | TBD |
| Public sub-three-minute video | Pending final deployment | TBD |

Every production trace entry must include UTC/PDT timestamp, public URL, commit SHA, Railway deployment ID, trace ID, provider/model, duration, token counts when available, selected item ID, current menu membership, and the matching Vertex usage time window.
