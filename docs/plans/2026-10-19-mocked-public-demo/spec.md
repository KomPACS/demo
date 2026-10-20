# Spec: Mocked public KOMPACS demo at demo.kompacs.cz

- **Issue:** #1
- **Status place:** `ledger.md`

## Goal

A visitor without a presenter clicks through every KOMPACS scenario on synthetic data, in the browser only.

## Scope

- **In:** the Rakathon frontend, copied fresh, polished after a design run with the user.
- **In:** an in-browser mock of the `/api` contract (`contract/openapi.json`).
- **In:** 14 synthetic patients: 10 hero scenarios + 4 fillers.
- **In:** an intro screen, a DEMO ribbon, a 6-stop guided tour, "Obnovit demo", deep links.
- **In:** the AI "Souhrn úvah" step trace, an MCP agent panel, the new-check pipeline animation.
- **In:** the Přehled tab: a mock section + labelled Rakathon 2026 aggregates.
- **In:** GitHub Pages deploy via Actions, CNAME `demo.kompacs.cz`.
- **Out:** a backend, IRIS, a real LLM, real data, analytics, i18n.
- **Out:** the tech docs site (`KomPACS/docs`, `docs.kompacs.cz`): a separate project. The demo only links to it.
- **Out:** a shared state between visitors.

## Decisions

### Static SPA with an in-browser mock behind the API contract (lasting)

A custom `fetch` given to `openapi-fetch` answers every `/api/*` route from memory. Components keep calling `api.*`, so a real backend can come back without UI changes. State is per visitor. A refresh resets it.

### Only synthetic data (lasting)

Nothing comes from the Rakathon dataset. Only the aggregates in the pitch are allowed, labelled "Rakathon 2026". Patients have Czech names and an RČ with a valid format and mod-11 checksum. A "Fiktivní data" badge is always visible.

### Hero scenarios (run-only)

1. Priors named only in report text. Requests by e-mail and by phone.
2. An outside exam, found in the patient's insurer statement.
3. MDT: a request is not delivered. The coordinator urges it.
4. A duplicate alert: the same exam within 6 weeks.
5. A long history: only some priors are relevant. One prior is removed. One verdict is re-judged.
6. The FHIR channel (Bulovka): the request is a FHIR Task.
7. A child: MR, pediatric oncology.
8. No priors: a new diagnosis.
9. Everything OK: all priors are in PACS.
10. A live "Spustit kontrolu" on a patient who is not in the queue yet.

Tour: 10 → 1 → 2 → 3 → 4 → 9. The others are for free exploration.

### Nothing moves by itself (lasting)

The screen changes only after a visitor click. After an action, at most one dismissible hint shows the next step. Simulation controls are dashed chips that start with "Ukázka:".

### Insurer data is the patient's consented statement (lasting)

The source label is "Výpis pojištěnce (souhlas pacienta)". A PDF upload step leads to "rozpoznáno N vyšetření". Patients use all 7 Czech insurers. The insurer FHIR Task shows "připraveno, čeká na napojení". The demo never states that insurers must share data.

### AI reasoning as a step trace (lasting)

The label is "Souhrn úvah". Each verdict shows: query → evidence sentence → Modrá kniha quote with page → verdict and reason. It is collapsed by default. The MCP agent takes preset questions only. It streams the answer and shows expandable tool calls.

### Realistic latency (run-only)

Reads take about 300 ms. "Spustit kontrolu" takes 4–6 s and shows the pipeline steps.

### No analytics (lasting)

No tracking and no cookies. The intro says "bez sledování". A tool for medical staff must never ask for cookie consent.

### Tech detail lives in the docs (lasting)

The app shows no HL7/FHIR internals. A "Jak to funguje" link per pipeline step opens `docs.kompacs.cz`.

## Acceptance

- Given a first visit, the intro screen shows the disclaimer, a kompacs.cz link and both buttons.
- Given "Provést ukázkou", the tour walks the 6 stops in order. Each stop opens in its start state.
- Given any of the 14 patients, the case, timeline, AI log and requests render with no console errors.
- Given "Spustit kontrolu" on the live patient, the pipeline steps show for 4–6 s. Then the new case opens.
- Given an action (approve, deliver, decide), the UI updates without a reload. A refresh restores the start state.
- Given a 390 px viewport, no screen scrolls horizontally.
- Given the deployed site, `https://demo.kompacs.cz` serves the app over HTTPS from GitHub Pages.
- Given the built bundle, no network call goes anywhere except Google Fonts.

## Open questions

- Visual direction: settled in the design run after P1.
