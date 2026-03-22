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
M0 Phase-1 completed.
Next step is M0 Phase-2 integration.

## Phase-2 priorities
1. Connect apps/api to packages/core
2. Replace mock task operations with TaskStore-backed operations
3. Connect heartbeat output to NotifierRouter
4. Keep provider/chatbridge as stub for now

## Known follow-ups
- Preserve free-form task body text in HEARTBEAT.md round-trip
- Strengthen Windows atomic write behavior
- Unify task runtime grouping semantics between web and core