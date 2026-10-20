# SDD Execution Ledger

## Metadata
- **Branch:** P1 `feat/mock-demo` (#2, #4). P2: one branch per PR (P2a, P2b, P2c), see plan.
- **Plan:** `docs/plans/2026-10-19-mocked-public-demo/plan.md`
- **Started:** `2026-10-19T16:20:06Z`
- **Status:** `IN_PROGRESS`

## Task Status Log

| Task ID | Description | Mode | Status | Fix Rounds | Notes |
|---|---|---|---|---|---|
| T1 | Build config: no proxy, pnpm pin, test script | inline | COMPLETED | 0 | - |
| T2 | Contract: optional name and rc on Patient | inline | COMPLETED | 0 | - |
| T3 | Seed helpers: RČ and relative dates | dev | COMPLETED | 0 | - |
| T4 | Scenario type and store reads | full | COMPLETED | 0 | - |
| T5 | LLM trace and verdict builder | dev | COMPLETED | 0 | tests written after code, not TDD |
| T6 | Store mutations | full | COMPLETED | 0 | - |
| T7 | Mock fetch router | dev | COMPLETED | 0 | - |
| T8 | Wire the mock into the API client | inline | COMPLETED | 0 | - |
| T9 | Show name and RČ, Fiktivní data badge, insurer label | inline | COMPLETED | 0 | - |
| T10 | Seed invariants test, scenarios 1–2 | dev | COMPLETED | 0 | - |
| T11 | Scenarios 3–5 | dev | COMPLETED | 0 | - |
| T12 | Scenarios 6–8 | dev | COMPLETED | 0 | - |
| T13 | Scenarios 9–10 and filler 11 | dev | COMPLETED | 0 | - |
| T14 | Fillers 12–14 | dev | COMPLETED | 0 | - |
| T15 | Tour stops and global seed checks | inline | COMPLETED | 0 | + unique names, one contact per hospital (VFN e-mail, Bulovka FHIR) |
| T16 | Intro screen | inline | COMPLETED | 0 | - |
| T17 | Read-only phone, bottom bar | dev | COMPLETED | 0 | hook test replaced by a pure `readOnlyStore` test: a hook test needs a React renderer dependency |
| T18 | Integration page | inline | COMPLETED | 0 | - |
| T19 | Contract: evidence, steps, review, dispute | inline | COMPLETED | 0 | - |
| T20 | Mock store for T19 | full | COMPLETED | 0 | - |
| T21 | Scenario data: evidence, drafts | dev | PENDING | 0 | - |
| T22 | Case B2: tiles + evidence panel | dev | PENDING | 0 | - |
| T23 | Request review + approved batch | dev | PENDING | 0 | - |
| T24 | Dispute thread | dev | PENDING | 0 | - |

## Cost
- **Estimate:** `13 dispatches, ~8.3M input tokens`
- **Measured:** `-`

## Human Decisions
- Decision: copy latest trigger's candidates - Q1 new check on non-live patient
- Decision: tour stop 1 = queue + instructive title - Q2
- Decision: real Modrá kniha quotes from linkos.cz PDF, not committed - Q3
- Decision: PACS viewer images are synthetic, keep - Q4
- Decision: insurer label changed in P1 (T9) - Q5

## Reviews
- G1: PASS.
- G2: FAIL (plan refs in comments), fixed inline 18afeaf. Non-blocking: the default verdict-version literal repeats 3x in `src/mock/store.ts`.
- G4: FAIL (open add-prior form stayed writable after a resize below 768 px; planned hook test not written). Form wrapped in `WriteGroup`; test deviation accepted (T17 note).
- G3: FAIL (Plzeň and Hradec under two org ids, Motol under two ids and names, literal UTC times in scenario 9, two Pardubice spellings). Fixed on `fix/g3-seed-data`, plus a seed test for one id per hospital and one contact per id. P1 done.

## Warnings & Blockers
- Browser findings for the design phase: on a phone the sidebar stacks above the content; the duplicate alert says "Pacient měl" for a woman.
- Scenario 7 (child, C71) cites the adult high-grade glioma follow-up row (s. 242). Ask the team medic before the demo goes public.

## Handover (2026-10-20)
P1 is done: T1–T15 COMPLETED, 70 tests green, lint and build clean, all pushed on `feat/mock-demo`.

Resume steps:
1. `npx -y pnpm@10 install`, then `npx -y pnpm@10 exec playwright install chromium` (for `scripts/shots.mjs`).
2. `curl -fsSL https://www.linkos.cz/files/modra-kniha/26.pdf -o tmp/modra-kniha-26.pdf`, then extract the text to `tmp/modra-kniha-26.txt` (pdftotext or pdfminer). Printed page = PDF page index + 1.
3. Done: G3 re-run and fixed.
4. Done 2026-10-20: design run. Picks are in `spec.md` decisions; boards in `design/`.
5. Done 2026-10-20: plan P2 (T16–T24). Next: P2a on a branch from `main`. P3: GitHub Pages deploy, CNAME `demo.kompacs.cz`.

Open items for the user:
- Forpsi DNS: `docs CNAME kompacs.github.io.`; `demo` still points to the deleted Azure app (takeover risk).
- After DNS resolves: enable HTTPS enforcement on KomPACS/docs Pages.
- `pacs-mcp`: publish as a public repo, or reword the docs MCP how-to to "available on request".
