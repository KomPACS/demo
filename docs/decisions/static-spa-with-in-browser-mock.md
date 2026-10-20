# Static SPA with an in-browser mock behind the API contract

The demo is a static site on GitHub Pages. A custom `fetch` given to `openapi-fetch` answers every `/api/*` route of `contract/openapi.json` from memory, so components keep calling `api.*` and a real backend can return without UI changes. State is per visitor; a refresh resets it.

## Options

- A hosted backend with a real database: costs money and operations, and needs real or seeded data on a server. Rejected for a public demo.
- Hard-coded screens: fast, but the demo would drift from the contract and could not grow into the product.
