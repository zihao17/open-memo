# Open Memo - Agent Context

## Current status
M0 Phase-1 is complete.

### Completed modules
- core: parser, renderer, TaskStore, heartbeat once, recurrence helper
- integrations: ProviderAdapter stubs, NotifierRouter stubs, ChatBridgeRegistry
- web/api: local dual-panel UI and mock API

## Accepted status
- core: accepted with follow-ups
- integrations: accepted
- web/api: accepted

## Known issues / follow-ups
### core
- Free-form task body text is not preserved during canonical render
- Windows atomic write behavior still needs hardening
- Recurring task rollover is not yet wired into heartbeat mutations

### web/api
- Current task grouping is computed in frontend and must later be aligned with core semantics
- API still uses in-memory mock logic and should later call core TaskStore directly

### integrations
- Current adapters/notifiers are stubs only
- Result shapes should remain stable during real integration

## Phase-2 integration plan
1. Replace apps/api mock task storage with packages/core TaskStore
2. Make apps/web consume the real local API backed by core
3. Route heartbeat decision notifications into packages/integrations NotifierRouter
4. Keep provider adapters and chatbridge as stub unless specifically needed

## Rules for all agents
- Reuse packages/shared types
- Do not redefine Task or TaskPatch
- Do not add heavy dependencies unless necessary
- Do not expand scope beyond the current phase
- Keep changes small and integration-friendly