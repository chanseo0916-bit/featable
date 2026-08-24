# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent orchestration

- Keep the primary agent focused on architecture, user intent, decisions, integration, and final verification.
- Delegate independent, bounded workstreams to subagents in parallel when doing so materially improves speed or keeps noisy exploration out of the primary context.
- Prefer subagents for codebase exploration, targeted research, test execution, visual audits, log analysis, and non-overlapping small implementation tasks.
- When parallel work is used, give each subagent a distinct scope, wait for the relevant results, review them, and synthesize the final implementation in the primary thread.
- Avoid delegation for trivial one-step changes or tightly coupled edits where coordination would cost more than direct execution.

## Design system rules (MANDATORY — read before writing any CSS)

Full spec: `DESIGN.md`. Quick rules — violating these breaks the design system:

- **Use design tokens only.** Never hardcode colors, font sizes, weights, or radii.
  - Colors: `--gray-*`, `--carrot-*`, `--accent`, `--success/--warning/--error`, `--fg-strong/default/muted/subtle`, `--border`, `--surface`
  - Font sizes: `--fs-t1`~`--fs-t12` (12/13/14/16/18/20/22/24/28/32/40/48px) — no other values
  - Font weights: **400 / 500 / 700 only**
  - Radii: `--radius-xs/sm/md/lg/xl/2xl` (4/6/8/12/16/20px)
  - Alpha blending: use `color-mix(in srgb, var(--token) N%, transparent)` — never hex8 (`#rrggbbaa`)
- **No hover effects on cards** (no box-shadow, transform, zoom, or border changes). Buttons may change background color only.
- **No prices or view counts in list cards.**
- **Cards:** use `EntityCard` (`src/components/cards/entity-card.tsx`) with layout="image"|"row"|"text". Brand and support cards have dedicated styles — check existing pages first.
- **CSS file placement:** page/domain styles go in `src/styles/<domain>.css`, NOT globals.css (tokens/shared primitives only). New domain → create a new file there.
- After writing CSS, run `python scripts/enforce-design-tokens.py` to snap any accidental off-token values, then `npm run build`.
