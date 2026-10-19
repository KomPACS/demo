# KOMPACS demo

Static, fully mocked demo of KOMPACS (Rakathon 2026). Synthetic data only. Live at https://demo.kompacs.cz.

```sh
pnpm install
pnpm dev     # http://localhost:5173
pnpm lint    # oxlint, tsc, API types drift check
pnpm build
```

- API contract: `contract/openapi.json` → `src/api.d.ts` (`pnpm api`). The mock answers it in the browser.
- Terms: `CONTEXT.md`. Rules: `.claude/skills/app-dev`, `.claude/skills/ux-design`.

`pnpm test` runs the mock tests (`node --test`).

## Contract changes

- 2026-10-19: `Patient.name`, `Patient.rc` (optional).
