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
| T8 | Wire the mock into the API client | inline | PENDING | 0 | - |
| T9 | Show name and RČ, Fiktivní data badge, insurer label | inline | COMPLETED | 0 | - |
| T10 | Seed invariants test, scenarios 1–2 | dev | PENDING | 0 | - |
| T11 | Scenarios 3–5 | dev | PENDING | 0 | - |
| T12 | Scenarios 6–8 | dev | PENDING | 0 | - |
| T13 | Scenarios 9–10 and filler 11 | dev | PENDING | 0 | - |
| T14 | Fillers 12–14 | dev | PENDING | 0 | - |
| T15 | Tour stops and global seed checks | inline | PENDING | 0 | - |

## Cost
- **Estimate:** `13 dispatches, ~8.3M input tokens`
- **Measured:** `-`

## Human Decisions
- Decision: copy latest trigger's candidates - Q1 new check on non-live patient
- Decision: tour stop 1 = queue + instructive title - Q2
- Decision: real Modrá kniha quotes from linkos.cz PDF, not committed - Q3
- Decision: PACS viewer images are synthetic, keep - Q4
- Decision: insurer label changed in P1 (T9) - Q5

## Warnings & Blockers
- None.
