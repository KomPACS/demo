---
name: app-dev
description: Senior app developer rules for the KOMPACS demo (React + Vite + TS + shadcn, in-browser mock API, synthetic patients). Use before any code change in this repo: mock API, scenario data, components, build, deploy to GitHub Pages.
---

# app-dev

## Shape

- Static SPA. No server. GitHub Pages at `demo.kompacs.cz`, hash routing.
- The mock lives in `src/mock/`. It answers the `/api/*` contract from `contract/openapi.json` inside the browser: a custom `fetch` passed to `openapi-fetch`. Components call `api.*` as if a real backend existed.
- State: in memory, per visitor. A refresh resets everything. "Obnovit demo" resets without reload. Deep links open a scenario in its start state.
- Latency: about 300 ms per read. "Spustit kontrolu" runs 4–6 s with visible pipeline steps.
- Nothing changes on screen by itself. Simulated events (delivery, PACS arrival) start only from a visitor click on a "Ukázka:" control.

## Contract

- `contract/openapi.json` is the source of the types. After a change: `pnpm api`, then update the mock to match. The mock must type-check against `src/api.d.ts`.
- Add a field only when the UI needs it. Record it in `README.md` under "Contract changes" with the date.

## Data

- All data is synthetic. Never copy anything from the Rakathon dataset (rows, report text, IDs). Aggregates from `rakathon/docs/pitch.md` are allowed, labelled "Rakathon 2026".
- Patients: Czech names + RČ with a valid format and mod-11 checksum. Women: month + 50. Show the "Fiktivní data" badge.
- Insurers: spread across all 7 Czech insurers. The insurer source is the patient's consented statement ("Výpis pojištěnce"), never a live insurer feed.
- One scenario = one file in `src/mock/scenarios/`. The file header says which story it shows. Dates are relative to today.

## Checks before done

- `pnpm lint` (oxlint + `tsc -b` + API drift check).
- `pnpm build`.
- Open every scenario once in the browser. Read the console: no errors.

## Rules

- KISS. No state library, no router library, no backend.
- Czech UI text. English code. Labels for enum codes only in `src/lib/labels.ts`. Terms from `CONTEXT.md`.
- No analytics, no cookies, no external calls except Google Fonts.
