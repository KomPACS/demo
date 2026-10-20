# Spec: Mocked public KomPACS demo at demo.kompacs.cz

- **Issue:** #1
- **Status place:** `ledger.md`

## Goal

A visitor without a presenter clicks through every KomPACS scenario on synthetic data, in the browser only. Since 2026-10-20 the demo is the product concept, not a pitch prop: design for the real coordinator workflow.

## Scope

- **In:** the Rakathon frontend, copied fresh, polished after a design run with the user.
- **In:** an in-browser mock of the `/api` contract (`contract/openapi.json`).
- **In:** 14 synthetic patients: 10 hero scenarios + 4 fillers.
- **In:** an intro screen, a DEMO ribbon, a 6-stop guided tour, "Obnovit demo", deep links.
- **In:** the AI "Souhrn úvah" side panel (B2), a dispute thread per prior, the new-check pipeline animation.
- **In:** an integration page: an external AI assistant queries `pacs-mcp` (static transcript).
- **In:** a read-only phone view with a bottom tab bar.
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

The label is "Souhrn úvah". It opens in a side panel next to the prior list (design board B2). It is closed on load. On a phone it is a full-screen sheet with a back arrow.

### Trust comes from checkable evidence (lasting)

A source link proves that a sentence exists. It does not prove that the AI read it right. So each verdict shows:
- the sentence with one sentence of context before and after, and the document header (type, department, date), with a link to that place;
- the event status (proběhlo / plánováno / doporučeno / nejasné) and the word that decided it. A planned exam is never a prior;
- the number of independent sources ("1 zdroj · jen zmínka ve zprávě");
- numbered steps, each tagged **Systém** (a repeatable lookup, with the time it read the data) or **AI** (the model's reading);
- no confidence number. The three labels relevant / uncertain / not relevant stay.

### The exam date leads (lasting)

Each prior shows its date first, large, with the gap to the planned exam. Sections stay ordered by action (to decide, relevant). Inside a section, newest first. The baseline exam (`is_baseline`) is pinned on top with a label.

### One home hospital (lasting)

KomPACS runs at one hospital: FN v Motole. All patients are its patients, and its PACS is "our PACS". A prior from another hospital is "dostupné" only after it arrived in our PACS (for example via ePACS). Every request asks for delivery to FN v Motole and is signed by its coordinator.

### Requests are reviewed before they leave (lasting)

- E-mail: the coordinator sees the channel, institution, recipient, contact verification and the full editable text. The text holds patient name + RČ, exam + date, the delivery route (ePACS) and the sender. It goes only to a verified institutional address.
- "Schválit" marks a draft as reviewed. Editing the text also counts. The header button sends only approved drafts, after one confirm list.
- Phone: institution, department, number, contact name, verification, a call script. After the call: Vyžádáno / Nedostupné / Zavolat znovu. A phone request is never in the batch send.

### Disputes are the feedback loop (lasting)

The coordinator disputes a verdict in the panel: an error category, an evidence note (which sentence, which word), a re-judge, then v1 and v2 side by side. The coordinator keeps one. Categories: stav události, datum, modalita / oblast, pracoviště, relevance dle doporučení, duplicita, jiné.
- A re-judge must cite new evidence to change the verdict. Else the UI shows "beze změny · námitka bez opory v textu". Reason: an LLM tends to agree with a leading note (sycophancy).
- Feedback never trains the model live. The dispute, plus implicit signals (overrides, kept v1/v2, "Nedostupné", priors added by hand), are labels for a curated, pseudonymized evaluation set. In the demo this is a visible "Uloží se: …" line only.

### MCP is an integration, not an in-app chat (lasting)

A case-level chat with preset questions repeats what the case screen shows. MCP shows its value outside the app: a hospital's own AI assistant queries `pacs-mcp`, with sources and an audit line. The demo shows this on a separate integration page. Inside the app, the dispute re-judge shows its tool calls.

### Phone is read-only (lasting)

Below 768 px the app is for a quick walkthrough. A banner says: "Na mobilu jen prohlížení. Mobilní aplikaci neplánujeme. Žádosti a rozhodnutí dělejte na počítači." Every write action is disabled. Navigation is a bottom tab bar: Fronta, Přehled, Prohlídka, O ukázce.

### Intro offers a conversation (run-only)

The intro (design board Intro B) says that KomPACS is a proof of concept in development, that the demo runs on made-up data, and that we gladly discuss changes, ideas and integration with existing systems. A button opens `mailto:info@kompacs.cz`.

### Realistic latency (run-only)

Reads take about 300 ms. "Spustit kontrolu" takes 4–6 s and shows the pipeline steps.

### No analytics (lasting)

No tracking and no cookies. The intro says "bez sledování". A tool for medical staff must never ask for cookie consent.

### Tech detail lives in the docs (lasting)

The app shows no HL7/FHIR internals. A "Jak to funguje" link per pipeline step opens `docs.kompacs.cz`.

## Acceptance

- Given a first visit, the intro screen shows the POC notice, the contact button, a kompacs.cz link and both tour buttons.
- Given "Provést ukázkou", the tour walks the 6 stops in order. Each stop opens in its start state.
- Given any of the 14 patients, the case, timeline, AI log and requests render with no console errors.
- Given "Spustit kontrolu" on the live patient, the pipeline steps show for 4–6 s. Then the new case opens.
- Given an action (approve, deliver, decide), the UI updates without a reload. A refresh restores the start state.
- Given a 390 px viewport, no screen scrolls horizontally, the read-only banner shows, and no write action is enabled.
- Given a prior, the panel shows the context sentences, event status, source count and tagged steps.
- Given an e-mail draft, the batch send is disabled until the draft is approved. The confirm list names each recipient.
- Given a dispute without new evidence, v2 equals v1 and the UI says so.
- Given the deployed site, `https://demo.kompacs.cz` serves the app over HTTPS from GitHub Pages.
- Given the built bundle, no network call goes anywhere except Google Fonts.

## Open questions

- Visual direction: settled in the design run on 2026-10-20 (canvas source in `design/`).
- A "Zkontrolovat znovu" action for stale lookups: not decided.
