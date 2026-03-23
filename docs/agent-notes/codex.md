# Agent Note - codex

## Branch / Worktree

- Worktree: `feat/core-m0`
- Git state: detached HEAD from base commit `9ec6758`
- Local path: `E:\AI\open\open-memo.worktrees\feat\core-m0`

## Scope

- Primary scope: `packages/core`
- Allowed dependency surface used in this round: `packages/shared`
- Supporting files touched for this round: `tests/fixtures`, `docs/contracts.md`, `docs/core-followups.md`
- Explicitly not modified: `apps/web`, `apps/api`, `packages/integrations` business code

## Completed in this round

- Implemented `HEARTBEAT.md -> Task[]` parser for task blocks with fenced YAML.
- Implemented canonical `Task[] -> HEARTBEAT.md` renderer with fixed field order.
- Implemented task validation for schema fields and enums.
- Implemented `TaskStore` with `loadTasks()`, `saveTasks()`, `createTask()`, `updateTask()`, `deleteTask()`.
- Implemented atomic write helper using temp file + rename in the same directory.
- Implemented heartbeat evaluation with derived runtime states for `upcoming`, `due`, `overdue`, `snoozed`, `waiting_ack`, plus `HeartbeatDecision` output.
- Implemented `heartbeat:once` CLI that reads `data/HEARTBEAT.md` and prints structured JSON output.
- Implemented recurrence helper for `none`, `daily`, `weekly`.
- Added minimal tests for round-trip, update write path, and heartbeat due/overdue/snoozed judgement.
- Added `docs/core-followups.md` to persist follow-up items agreed after acceptance.

## Files changed

- `packages/core/src/constants.ts`
- `packages/core/src/heartbeat-markdown.ts`
- `packages/core/src/task-store.ts`
- `packages/core/src/heartbeat.ts`
- `packages/core/src/recurrence.ts`
- `packages/core/src/types.ts`
- `packages/core/src/cli/heartbeat-once.ts`
- `packages/core/src/index.ts`
- `packages/core/tsconfig.json`
- `tests/core.test.mjs`
- `tests/fixtures/heartbeat-roundtrip.md`
- `docs/contracts.md`
- `docs/core-followups.md`
- `package.json`
- `pnpm-lock.yaml`

## Key implementation choices

- Parser/renderer stays deterministic and dependency-light. No YAML parser dependency was added; the implementation only supports the constrained task block shape used by `HEARTBEAT.md`.
- Canonical render writes only the task schema fields in a fixed order to reduce diff noise and keep store behavior predictable.
- `TaskStore.updateTask(id, patch)` is patch-based, not whole-object replacement. Only whitelisted mutable fields are applied; `updatedAt` defaults to `now()`.
- Atomic write uses same-directory temp file + `rename()` so the happy path is simple and local-file-system friendly.
- Heartbeat runtime state is derived only in memory. Persistent `status` is not mutated by heartbeat evaluation.
- M0 `due` uses a fixed 60-second window; older unresolved tasks become `overdue`.
- Recurrence helper advances from the provided `dueAt`, not from `now`.

## Known limitations

- Canonical render does not preserve schema-external content inside task blocks. Free-form task block body text is dropped on save/render.
- Unknown fields outside the supported `Task` schema are not preserved.
- Windows atomic write is not yet hardened for file-lock/retry/replace edge cases. Current implementation assumes same-directory `rename()` replacement succeeds.
- Heartbeat does not yet apply recurring rollover mutations. `taskMutations` is currently empty.
- Recurrence helper can return a next due that is still before `now` if the task is heavily overdue.
- Test coverage is intentionally minimal and does not yet cover every error path or store/heartbeat edge case.

## Run / verify

- Install deps: `pnpm install`
- Build: `pnpm build`
- Type/build check: `pnpm typecheck`
- Tests: `pnpm test`
- CLI sample: `pnpm heartbeat:once -- --now=2026-03-22T12:30:00.000Z`

## Integration notes

- Import from `packages/core/src/index.ts` exports after build; main runtime entry points are parser/render/store/heartbeat helpers.
- `runHeartbeat()` and `runHeartbeatOnce()` return runtime state in memory only. Integrators should not expect `HEARTBEAT.md` to change unless they explicitly call store methods.
- `TaskStore.saveTasks()` will rewrite the full file into canonical format. Anything outside supported task schema in task blocks will not survive that rewrite.
- `heartbeat:once` output is already structured enough for `apps/api` or a future scheduler wrapper to consume directly.
- If an integration needs human-authored block notes to survive writes, do not rely on current renderer/store behavior without fixing follow-up P1-1 first.

## Suggested next step

- Start with follow-up P1-1: preserve task block free-form body text during parse/render/save, because that affects the value of `HEARTBEAT.md` as human-editable storage.

## Resume prompt

- Continue in worktree `feat/core-m0` on `packages/core`. Read `docs/agent-notes/codex.md` and `docs/core-followups.md` first, then implement P1-1 so task block free-form body text survives `parse -> modify -> render -> save` without changing the existing `Task` contract.
