# Open Memo - Claude Code Project Memory

## Project
Open Memo is a Windows-first, local-first, ultra-light personal memo and reminder agent.

## Core principles
- Markdown is the source of truth.
- All important data stays local.
- HEARTBEAT.md is the editable task storage layer.
- Deterministic scheduling first, LLM second.
- Keep the runtime lightweight and short-lived.
- Do not introduce heavy frameworks or unnecessary infra.

## Current architecture
- packages/core: parser, task store, heartbeat, recurrence
- apps/web + apps/api: local web console and mock/local API
- packages/integrations: provider adapters, notifier router, chatbridge registry

## Guardrails
- Do not redesign the project into a large agent platform.
- Do not add Electron.
- Do not add a database.
- Do not bypass Markdown storage.
- Do not create duplicate domain models outside shared.
- Keep Windows-first behavior in mind.

## Current development phase
M0 Phase-2 completed.
Next step is M0 Phase-3 stabilization.

## Phase-3 priorities
1. Fix free-form body text loss (P1-1) - bodyText preserved as-is
2. Add test coverage (12+ tests)
3. Unify web/core grouping semantics via API
4. Harden Windows atomic write (P1-2) - retry only, never delete target file
5. Integrations stability review

## Known follow-ups (carried to Phase-3)
- Preserve free-form task body text in HEARTBEAT.md round-trip
- Strengthen Windows atomic write behavior
- Unify task runtime grouping semantics between web and core

## Phase-3 does NOT include
- Real provider/notifier integration
- New UI features
- Recurring task auto-advance