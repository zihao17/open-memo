# Open Memo - Agent Context

## Current status
M0 Phase-2 is complete. Phase-3 stabilization planned.

### Phase-2 completed (2026-03-23)
- apps/api now uses TaskStore to read/write data/HEARTBEAT.md (no more in-memory mock)
- POST /heartbeat/once route added, calls runHeartbeatOnce() then NotifierRouter.routeBatch()
- apps/web verified compatible with new API, zero code changes needed
- minimax reviewed integrations code, passed with one optional improvement

### Current git state
- Branch: `feat/m0-phase2-integration` (HEAD at merge of feat/p2-core and feat/p2-web)
- Worktrees: feat/p2-core and feat/p2-web still exist but not needed for Phase-3
- GitHub: up to date

## Known issues / follow-ups (Phase-3 targets)
### core
- Free-form task body text is not preserved during canonical render (P1-1)
- Windows atomic write behavior still needs hardening (P1-2)
- Recurring task rollover is not yet wired into heartbeat mutations

### web/api
- Current task grouping is computed in frontend and must be aligned with core semantics
- API uses core TaskStore but task grouping logic is still duplicated

### integrations
- Current adapters/notifiers are stubs only
- Result shapes should remain stable during real integration

## Phase-3 plan
See `docs/phase3-plan.md` for full details.

### Phase-3 priorities
1. Fix free-form body text loss (P1-1) - codex
2. Add test coverage - codex
3. Unify web/core grouping semantics via API - codex + gemini
4. Harden Windows atomic write (P1-2) - codex
5. Integrations stability review - minimax + mimo

### Phase-3 does NOT include
- Real provider/notifier integration
- New UI features
- Electron / database / heavy frameworks
- Real chat automation

## Rules for all agents
- Reuse packages/shared types
- Do not redefine Task or TaskPatch
- Do not add heavy dependencies unless necessary
- Do not expand scope beyond the current phase
- Keep changes small and integration-friendly
- bodyText must be preserved as-is (no trim, no normalization)
- Never delete HEARTBEAT.md target file on write failure (data safety first)
