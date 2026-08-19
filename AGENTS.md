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
