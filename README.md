# KomPACS demo

Static, fully mocked demo of KomPACS (Rakathon 2026). Synthetic data only. Live at https://demo.kompacs.cz.

```sh
pnpm install
pnpm dev     # http://localhost:5173
pnpm lint    # oxlint, tsc, API types drift check
pnpm build
```

- API contract: `contract/openapi.json` → `src/api.d.ts` (`pnpm api`). The mock answers it in the browser.
- Terms: `CONTEXT.md`.

`pnpm test` runs the mock tests (`node --test`).

Deploy: every push to `main` runs lint, tests and build, then publishes `dist` to GitHub Pages (`.github/workflows/deploy.yml`, CNAME `demo.kompacs.cz`).

- Decisions: `docs/decisions/`. Design boards (product concept, 2026-10-20): `docs/design/`.

## Contract changes

- 2026-10-19: `Patient.name`, `Patient.rc` (optional).
- 2026-10-20: `Verdict` evidence fields and tagged `steps`, `Case.checked_at`, request state `approved` + `call_attempts`, routes `send`, `draft`, `call-again`; `approve` now ends in `approved`; dispute `category` and `new_evidence` (all optional).

Built with help from Claude Code.
