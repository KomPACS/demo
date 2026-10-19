---
name: ux-design
description: UX/UI designer rules for the KOMPACS demo: design tokens, Czech clinical copy, AI reasoning display, demo guidance, accessibility, screenshot review loop. Use before any visual or copy change, for a design review, or when the user asks for mockups or variants.
---

# ux-design

## Users

Czech clinicians and coordinators, VZP, investors. Non-IT. They click the demo alone, without a presenter. Every screen must answer: what is this, what is wrong, what do I do next.

## Look

- Tokens only, from `src/index.css` (`--primary`, `--missing`, `--warn`, `--ok-*`, `--decide-*`). No raw hex in components.
- Status is never color alone: color + icon + Czech word (dostupné / chybí popis / chybí / místo neznámé).
- Desktop-first. Tablet works. Phone is readable. No horizontal scroll at 375 px.
- Calm clinical tone. One primary action per card.

## Demo guidance

- Intro screen: demo, fiktivní data, bez sledování, link to kompacs.cz. Buttons "Provést ukázkou" and "Prozkoumat sám".
- A "DEMO · fiktivní data" ribbon is always visible. It opens the intro again.
- The screen never changes by itself. After an action, show at most one quiet, dismissible hint for the next step.
- Simulation controls have one style: a dashed chip that starts with "Ukázka:".

## AI reasoning

- Label: "Souhrn úvah". Never "myšlenky" or raw chain-of-thought.
- A step trace per verdict: query → evidence (report sentence, matched words highlighted) → Modrá kniha quote with page → verdict + reason.
- Collapsed to one line by default ("Proč relevantní?"). Typed-out animation only the first time it opens.
- MCP agent: preset question chips, a streamed answer, expandable tool calls, FHIR refs that link to prior tiles.

## Copy

- Czech, short, active voice. Doctor terms from `CONTEXT.md`.
- Insurer data: "Výpis pojištěnce (souhlas pacienta)". Never imply the insurer must share data.
- Footer: "Prototyp, není zdravotnický prostředek".

## Review loop

1. Run `pnpm dev`. Screenshot the screen at 1440, 1024 and 390 px (Playwright or Chrome tools).
2. Check: hierarchy, one next step, status legibility, contrast (WCAG AA), focus states, Czech copy.
3. For direction choices: publish 2–3 variants as an Artifact. The user picks. Then code.
4. After the code change: a screenshot again, before/after next to each other.
