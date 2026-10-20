# SDD Execution Ledger

## Metadata
- **Branch:** `feat/mock-demo`
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
- G3: dispatched at 87838de. Result not recorded. Re-run it first on resume.

## Warnings & Blockers
- Browser findings for the design phase: on a phone the sidebar stacks above the content; the duplicate alert says "Pacient měl" for a woman.
- Scenario 7 (child, C71) cites the adult high-grade glioma follow-up row (s. 242). Ask the team medic before the demo goes public.

## Handover (2026-10-20)
P1 is done: T1–T15 COMPLETED, 70 tests green, lint and build clean, all pushed on `feat/mock-demo`.

Resume steps:
1. `npx -y pnpm@10 install`, then `npx -y pnpm@10 exec playwright install chromium` (for `scripts/shots.mjs`).
2. `curl -fsSL https://www.linkos.cz/files/modra-kniha/26.pdf -o tmp/modra-kniha-26.pdf`, then extract the text to `tmp/modra-kniha-26.txt` (pdftotext or pdfminer). Printed page = PDF page index + 1.
3. Re-run the G3 review (`lean-sdd:code-reviewer`, base c2f738d, head 87838de). Fix, then set the ledger status for P1.
4. Design run with the user. Canvas: https://claude.ai/artifact/Y5FyPeQAS5vj7xA1ZwvwzX (private, owner only). Source copy: `design/` next to this ledger.
   - Done: row 0 "Dnes" (3 screenshots), Intro A (dialog + tour coach, interactive), Intro B (welcome screen with a story picker), Souhrn úvah A (step trace in the prior card, interactive).
   - To do: Souhrn úvah B (side panel) and C (evidence first), AI agent A (right panel) and B (question box in the case), Telefon A (bottom bar) and B (header menu). Then the user picks per row.
5. Write plan P2 (polish + intro/tour + reasoning trace + MCP panel + pipeline animation) from the picks. Then P3: GitHub Pages deploy, CNAME `demo.kompacs.cz`.

Open items for the user:
- Forpsi DNS: `docs CNAME kompacs.github.io.`; `demo` still points to the deleted Azure app (takeover risk).
- After DNS resolves: enable HTTPS enforcement on KomPACS/docs Pages.
- `pacs-mcp`: publish as a public repo, or reword the docs MCP how-to to "available on request".
