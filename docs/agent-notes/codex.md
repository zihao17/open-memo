# Agent Note - codex

## Branch / Worktree

- Worktree label: `feat/core-m0`
- Git state during this round: detached HEAD from bootstrap base commit `9ec6758`
- Current commit after this round: `d47509f`
- Commit message: `feat(core): 完成 HEARTBEAT parser/render/store/heartbeat:once 最小链路`
- Local worktree path: `E:\AI\open\open-memo.worktrees\feat\core-m0`
- Date context used during work: `2026-03-22` and `2026-03-23`
- Runtime shell used in this session: PowerShell

## Agent Identity

- Agent name: `codex`
- Responsibility model for this round: implement code in `packages/core`, keep changes deterministic, avoid expanding into unrelated modules
- Collaboration posture used in this round:
  - prioritize finishing the storage and rules backbone first
  - do not expand into UI/API/integration business code
  - leave follow-up notes when something should be fixed later instead of silently stretching scope

## Scope

- Primary responsibility:
  - `packages/core`
- Allowed dependencies used:
  - `packages/shared`
- Allowed supporting changes used:
  - `tests/fixtures`
  - `docs/contracts.md`
  - `docs/core-followups.md`
  - `docs/agent-notes/codex.md`
- Explicitly not modified in business scope:
  - `apps/web`
  - `apps/api`
  - `packages/integrations`
- Goal boundary respected:
  - deterministic implementation only
  - no LLM dependency in core rules
  - no heavy dependency added for YAML parsing or scheduling

## Project Background

- This worktree was created for Open Memo M0 Phase-1.
- The target was to build the minimum core backbone around `HEARTBEAT.md`.
- `HEARTBEAT.md` is the source of truth for persisted task data in this project.
- The expected pipeline from contracts is:
  - parse Markdown
  - materialize `Task[]`
  - modify task objects
  - canonical render back to Markdown
  - atomic write to disk
- The immediate downstream consumers expected later are:
  - local API
  - web UI
  - notifications / integrations
- This round intentionally focused on:
  - rules
  - data model stability
  - deterministic heartbeat runtime state derivation
  - storage correctness

## Source Context Read Before Implementation

- Root repository structure
- `docs/contracts.md`
- `docs/architecture.md`
- `data/HEARTBEAT.md`
- `packages/shared/src/types.ts`
- `packages/core/src/index.ts`
- root `package.json`
- package tsconfig files
- existing test folder structure

## Round Goal

The user asked for M0 Phase-1 core completion with these required deliverables:

1. `HEARTBEAT.md -> Task[]` parsing
2. `Task[] -> HEARTBEAT.md` normalized rendering
3. round-trip stability
4. `TaskStore` with:
   - `loadTasks()`
   - `saveTasks(tasks)`
   - `createTask(task)`
   - `updateTask(id, patch)`
   - `deleteTask(id)`
5. atomic write-back via temp file + rename
6. `heartbeat:once` CLI
7. basic recurrence calculations:
   - `none`
   - `daily`
   - `weekly`
8. minimal tests for:
   - parser/render round-trip
   - atomic write in `updateTask`
   - heartbeat due/overdue judgement

## High-Level Outcome

- The required M0 core path was implemented and accepted by the user as passing.
- The user explicitly accepted this round as sufficient for use as the base of later API/UI integration.
- Two P1 follow-up issues were explicitly recorded after acceptance:
  - P1-1: preserve free-form block body text / schema-external content strategy
  - P1-2: harden Windows atomic write semantics

## Completed in this Round

### 1. Parser

- Implemented `parseHeartbeatMarkdown(markdown: string): Task[]`
- Parsing strategy:
  - find `<!-- open-memo:task:start --> ... <!-- open-memo:task:end -->` blocks
  - read fenced ` ```yaml ` content inside each block
  - parse a constrained YAML-like shape supporting:
    - scalar strings
    - `null`
    - booleans
    - array syntax for `channels` and `tags`
- Added validation of:
  - required fields
  - valid enum values
  - ISO timestamps
  - time zone validity

### 2. Renderer

- Implemented `renderHeartbeatMarkdown(tasks: readonly Task[]): string`
- Rendering behavior:
  - fixed task field order
  - canonical full-file rewrite
  - one blank line between task blocks
  - stable fenced YAML task blocks
  - deterministic output for supported fields

### 3. Validation Layer

- Implemented `validateTask(task, context)`
- Validation includes:
  - `id`, `title` string checks
  - `detail` must exist as string
  - `status`, `priority`, `recurrence`, `source` enum checks
  - `dueAt`, `snoozeUntil`, `createdAt`, `updatedAt` timestamp checks
  - IANA timezone validation through `Intl.DateTimeFormat`
  - `channels` and `tags` array validation

### 4. TaskStore

- Implemented `TaskStore` in `packages/core/src/task-store.ts`
- Added:
  - `loadTasks()`
  - `saveTasks(tasks)`
  - `createTask(task)`
  - `updateTask(id, patch)`
  - `deleteTask(id)`
- Store behavior:
  - always goes through parse/modify/render/write
  - rejects duplicate ids on save/create
  - `updateTask` is patch-based, not full replacement
  - `updatedAt` defaults to injected `now()`
  - missing file on `loadTasks()` returns empty list

### 5. Atomic Write

- Implemented `atomicWriteFile(filePath, content)`
- Flow:
  - create parent directory if needed
  - write temp file in same directory
  - flush file handle using `sync()`
  - close temp file
  - rename temp file over target
  - cleanup temp file on rename failure

### 6. Heartbeat Evaluation

- Implemented `runHeartbeat(tasks, options)`
- Implemented `runHeartbeatOnce(options)`
- Implemented derived runtime state logic:
  - `upcoming`
  - `due`
  - `overdue`
  - `snoozed`
  - `waiting_ack`
  - plus internal `inactive` snapshot state for non-active tasks
- Implemented `HeartbeatDecision` generation with:
  - `now`
  - `dueTaskIds`
  - `overdueTaskIds`
  - `notifications`
  - `taskMutations`
  - `nextWakeAt`

### 7. CLI

- Implemented `packages/core/src/cli/heartbeat-once.ts`
- CLI behavior:
  - defaults to `data/HEARTBEAT.md`
  - supports `--file=...`
  - supports `--now=...`
  - prints structured JSON to stdout

### 8. Recurrence Helper

- Implemented helper functions:
  - `getNextRecurringDueAt(dueAt, recurrence)`
  - `getNextTaskDueAt(task)`
- Supported recurrence types:
  - `none`
  - `daily`
  - `weekly`
- Calculation style:
  - add 1 or 7 days from the original `dueAt`
  - preserve original local timestamp text and offset suffix

### 9. Tests

- Added `tests/core.test.mjs`
- Added fixture `tests/fixtures/heartbeat-roundtrip.md`
- Covered:
  - parse/render/parse round-trip stability
  - `updateTask` writes file and leaves no temp files behind
  - heartbeat deterministic `due` / `overdue` / `snoozed` judgement

### 10. Docs and Memory

- Added `docs/core-followups.md`
- Added this document: `docs/agent-notes/codex.md`
- Added one contract clarification in `docs/contracts.md`:
  - M0 `due` uses fixed 60-second window

## Detailed File Change List

### New files

- `docs/core-followups.md`
- `docs/agent-notes/codex.md`
- `packages/core/src/constants.ts`
- `packages/core/src/heartbeat-markdown.ts`
- `packages/core/src/task-store.ts`
- `packages/core/src/heartbeat.ts`
- `packages/core/src/recurrence.ts`
- `packages/core/src/types.ts`
- `packages/core/src/cli/heartbeat-once.ts`
- `tests/core.test.mjs`
- `tests/fixtures/heartbeat-roundtrip.md`

### Modified files

- `docs/contracts.md`
- `package.json`
- `packages/core/src/index.ts`
- `packages/core/tsconfig.json`
- `pnpm-lock.yaml`

### What each changed file is for

- `docs/contracts.md`
  - one narrow clarification for the M0 due window
- `docs/core-followups.md`
  - persistent list of accepted post-round follow-ups
- `docs/agent-notes/codex.md`
  - persistent memory for this agent in this worktree
- `package.json`
  - added `test`
  - added `heartbeat:once`
  - added `@types/node`
  - shifted `typecheck` to use build as the effective compiled check
- `packages/core/tsconfig.json`
  - enabled Node types
- `packages/core/src/index.ts`
  - exported the real core surface instead of placeholder-only boundary
- `packages/core/src/constants.ts`
  - shared parser/renderer/store constants
- `packages/core/src/heartbeat-markdown.ts`
  - parser, renderer, validation
- `packages/core/src/task-store.ts`
  - task persistence and atomic write helper
- `packages/core/src/heartbeat.ts`
  - heartbeat runtime-state evaluation and once runner
- `packages/core/src/recurrence.ts`
  - recurrence calculation helper
- `packages/core/src/types.ts`
  - core-local helper result types
- `packages/core/src/cli/heartbeat-once.ts`
  - CLI entry
- `tests/core.test.mjs`
  - node:test suite
- `tests/fixtures/heartbeat-roundtrip.md`
  - parser/render fixture data

## Core Implementation Decisions

### Decision 1: No heavy YAML dependency

Why:

- Scope only needed a constrained parser for the known task block format
- User explicitly requested no heavy dependency
- Determinism and small surface were more valuable than full YAML coverage

Result:

- Implemented a handwritten YAML-like parser for the exact needed subset
- This keeps the parser small but intentionally narrow

Tradeoff:

- Not a general YAML parser
- More fragile if task syntax expands beyond current conventions

### Decision 2: Canonical full-file render

Why:

- Contracts say all writes should flow through parse -> object -> render -> atomic write
- Full canonical render reduces diff ambiguity and removes partial-string-edit risks

Result:

- `saveTasks()` always rewrites the entire canonical file

Tradeoff:

- Schema-external content in task blocks is currently lost
- Human-edited notes outside formal schema are not preserved yet

### Decision 3: Patch-based updateTask

Why:

- Aligns with `TaskPatch` contract direction
- Reduces accidental object replacement bugs
- Easier for API/UI to use later

Result:

- Only whitelisted mutable fields from patch are applied
- All unspecified supported fields remain from the current task object

Tradeoff:

- Schema-external content still does not survive because render is canonical

### Decision 4: Runtime state is derived, not persisted

Why:

- Contracts distinguish persistent state vs runtime state
- `status` should remain a durable field, not a computed scheduler output

Result:

- `runHeartbeat()` returns runtime states in memory only
- `runHeartbeatOnce()` does not write anything back today

Tradeoff:

- Future scheduler/mutation flow still needs explicit implementation

### Decision 5: Fixed due window for M0

Why:

- User asked for minimum deterministic chain first
- Contracts did not fully pin down due-vs-overdue threshold
- Needed one explicit rule for testing and integration

Result:

- `now - dueAt < 60s` is `due`
- anything older and unresolved is `overdue`

Tradeoff:

- This is a provisional M0 rule, not a fully productized scheduling policy

### Decision 6: Recurrence helper separate from heartbeat mutation

Why:

- User required recurrence calculation baseline
- User also asked not to expand scope too far
- Safer to ship a helper than to invent rollover semantics prematurely

Result:

- `daily` and `weekly` helper exists
- heartbeat does not yet roll recurring tasks forward

Tradeoff:

- recurring tasks can be judged overdue repeatedly until a future mutation layer is added

### Decision 7: Build-first typecheck

Why:

- Workspace did not have project references wired for source-path package imports
- Initial attempt to use TS path mapping for `@open-memo/shared` hit `rootDir` issues
- Quickest stable path for this round was:
  - build `packages/shared`
  - let `packages/core` import shared types from built output

Result:

- `packages/core` imports shared types from `../../shared/dist/index.js`
- root `typecheck` script now effectively runs `pnpm build`

Tradeoff:

- This is workable for the round but not the cleanest package-reference setup
- A future cleanup could add proper TS project references and package exports wiring

## Problems Encountered and How They Were Resolved

### Problem 1: Need to fit exact module boundary

Observed:

- User explicitly limited work to `packages/core`, allowed `packages/shared`, and disallowed business modifications elsewhere

Resolution:

- Only changed core, minimal contract clarification, tests, and agent/follow-up docs

### Problem 2: No existing core implementation

Observed:

- `packages/core/src/index.ts` only contained placeholder bootstrap boundary values

Resolution:

- Replaced placeholder-only export surface with real core implementation exports while preserving a simple boundary status object

### Problem 3: TS path mapping caused rootDir errors

Observed:

- Attempting to import `@open-memo/shared` via source path mappings caused TypeScript to pull files outside `packages/core/src` and fail with `rootDir` errors

Resolution:

- Removed path mapping approach
- Built `packages/shared` first
- Imported types from built output in `packages/shared/dist`
- Updated root scripts accordingly

### Problem 4: Test command path issue

Observed:

- `node --test tests` failed in this environment because Node attempted to treat `tests` as a module path instead of test discovery root

Resolution:

- Changed test script to `node --test tests/core.test.mjs`

### Problem 5: PowerShell command chaining

Observed:

- `&&` was rejected by this PowerShell environment during commit

Resolution:

- Switched command chaining to PowerShell-compatible `;`

### Problem 6: Scope tension around free-form Markdown notes

Observed:

- The canonical renderer did not preserve block body notes
- This was surfaced during acceptance questions

Resolution:

- Did not silently over-scope a fix in this round
- Explicitly documented the behavior
- Recorded follow-up P1-1 in `docs/core-followups.md`

### Problem 7: Windows atomic write robustness

Observed:

- Current temp + rename flow is not enough to call "Windows-first hardened"

Resolution:

- Kept the minimal implementation for M0
- Explicitly recorded follow-up P1-2

## What Was Verified

### Build and type/build verification

- `pnpm install`
- `pnpm build`
- `pnpm typecheck`

### Test verification

- `pnpm test`

Result:

- Passed after test script adjustment

### CLI verification

Command used:

- `pnpm heartbeat:once -- --now=2026-03-22T12:30:00.000Z`

What was observed:

- CLI read `data/HEARTBEAT.md`
- produced structured JSON output
- identified tasks as `upcoming`, `overdue`, `waiting_ack`, etc.
- emitted `dueTaskIds` / `overdueTaskIds` / notifications / `nextWakeAt`

## Runtime Semantics Clarified During Acceptance

These were asked directly by the user and answered explicitly.

### Free-form block body handling

- Current renderer/save/update does lose task-block body notes outside YAML
- `detail` is not affected because it is part of the formal YAML schema
- Recommendation made in-session:
  - treat this as a known limitation
  - fix it in a follow-up rather than pretending current behavior is sufficient

### Runtime state persistence

- `upcoming`, `due`, `overdue`, `snoozed`, `waiting_ack` exist only in heartbeat return values
- They are not written back into `HEARTBEAT.md`

### Recurrence semantics

- `daily` / `weekly` helper currently advances from original `dueAt`
- It does not advance from `now`
- For overdue recurring tasks, helper output may still be before `now`
- `snoozeUntil` takes priority over due/overdue classification while it is still in the future

### TaskStore update semantics

- `updateTask(id, patch)` is patch-based for supported schema fields
- Unknown schema-external content is not preserved by canonical render

### Atomic write semantics

- Temp file naming uses `<basename>.<pid>.<uuid>.tmp`
- Temp file is created in same directory as target
- Rename is same-directory replacement attempt
- No hardened retry/replace fallback exists yet for Windows edge cases

### Test coverage status

Covered:

- round-trip
- updateTask write path
- heartbeat due/overdue/snoozed

Not yet covered:

- `waiting_ack`
- `createTask`
- `deleteTask`
- recurrence helper
- parser error paths
- Windows rename edge cases
- preservation of free-form task notes

## Files Changed With Rationale

### `packages/core/src/constants.ts`

- centralizes file header text, block markers, field order, mutable-field whitelist, due-window constant
- reason:
  - avoid scattering string constants across parser/store/heartbeat

### `packages/core/src/heartbeat-markdown.ts`

- core parser and renderer implementation
- reason:
  - make Markdown contract stable first
  - keep all file-format rules in one place

### `packages/core/src/task-store.ts`

- storage layer and atomic write helper
- reason:
  - UI/API/integration should not manipulate raw Markdown directly later

### `packages/core/src/heartbeat.ts`

- heartbeat calculation engine
- reason:
  - keep runtime derivation deterministic and testable

### `packages/core/src/recurrence.ts`

- minimal recurrence computation
- reason:
  - user explicitly requested base recurrence support but not full scheduler expansion

### `packages/core/src/types.ts`

- core-local result and helper types
- reason:
  - avoid overloading shared types prematurely with internal shapes

### `packages/core/src/cli/heartbeat-once.ts`

- thin CLI wrapper
- reason:
  - give direct runnable entry for future API/scheduler integration

### `tests/core.test.mjs`

- minimum executable regression protection
- reason:
  - prove baseline behavior before wider integration work starts

### `tests/fixtures/heartbeat-roundtrip.md`

- stable fixture for parser/render tests
- reason:
  - keep round-trip testing explicit and readable

### `docs/contracts.md`

- only small clarification added
- reason:
  - user allowed small clarification where contract was ambiguous

### `docs/core-followups.md`

- persistent backlog for accepted P1 follow-ups
- reason:
  - avoid relying on chat history alone

## Known Limitations

### P1-1 Schema-external task block content is not preserved

- free-form body text inside task blocks is lost on canonical render
- unknown task-object fields are not written back
- impact:
  - weakens `HEARTBEAT.md` as a human-editable storage layer

### P1-2 Windows atomic write is not hardened

- current implementation assumes same-directory rename can replace target
- missing:
  - target-file-lock handling
  - retry strategy
  - replace fallback strategy
  - richer error policy for Windows edge cases

### Recurring rollover is not yet implemented

- `taskMutations` is empty
- heartbeat does not yet generate next due values automatically

### Recurrence helper may lag behind now

- heavily overdue recurring task can produce a "next" due that is still overdue

### Parser is intentionally narrow

- only supports current constrained Markdown/YAML block format
- not designed as general YAML ingestion

### Test coverage is intentionally minimum

- enough for current acceptance baseline
- not enough for long-term confidence without expansion

## Technical Debt

- proper TS project reference/package wiring is still worth doing later
- renderer preservation model for task body notes is unresolved
- heartbeat scheduler semantics remain incomplete beyond M0 once-run path
- notification dedupe behavior is basic and based on current task fields only
- no explicit fixture suite for malformed Markdown yet

## Follow-Up List Recorded Separately

See `docs/core-followups.md`.

The agreed follow-up items are:

1. Preserve task block free-form body text
2. Clarify recurring rollover semantics
3. Add coverage for `waiting_ack`, `create/delete`, recurrence helper, and parser/store error paths
4. Harden Windows atomic write behavior

## Commands Used in This Round

Repository discovery and reading:

- `Get-ChildItem -Force`
- `rg -n "HEARTBEAT|TaskStore|heartbeat:once|recurrence|contracts" -S .`
- `rg --files`
- `Get-Content ...`
- `git status --short`

Implementation and verification:

- `pnpm install`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm heartbeat:once -- --now=2026-03-22T12:30:00.000Z`

Commit:

- `git add ...`
- `git commit -m "feat(core): 完成 HEARTBEAT parser/render/store/heartbeat:once 最小链路"`

## Acceptance Q&A Summary

### Q1. Will canonical render lose task block notes?

Answer given:

- yes, current canonical render loses free-form task-block notes
- no impact on `detail`
- recommended as known limitation and follow-up fix

### Q2. Are runtime states written back?

Answer given:

- no
- runtime states only exist in heartbeat results

### Q3. What is current recurrence semantics?

Answer given:

- based on original `dueAt`, not `now`
- overdue recurring helper output can still be before `now`
- `snoozeUntil` suppresses due/overdue while active

### Q4. Is `updateTask` patch-based?

Answer given:

- yes for supported schema fields
- no preservation for schema-external content

### Q5. What exactly is the atomic write approach?

Answer given:

- temp file + same-directory rename
- same-directory replacement attempt
- not yet a hardened Windows implementation

### Q6. What tests exist vs what is missing?

Answer given:

- round-trip / update write / heartbeat due-overdue-snoozed are covered
- more coverage is still needed

## Submission / Commit Record

- Accepted by user as "通过" for M0 Phase-1 core baseline
- Follow-up limitations explicitly recorded with user acknowledgement
- Commit created:
  - hash: `d47509f`
  - message: `feat(core): 完成 HEARTBEAT parser/render/store/heartbeat:once 最小链路`

## Integration Notes

### For future API integration

- Prefer calling `TaskStore` methods instead of editing `HEARTBEAT.md` directly
- `runHeartbeatOnce()` is already a useful bridge for API-triggered inspection endpoints
- If API needs persisted scheduler mutations, that still needs an explicit apply/write layer

### For future UI integration

- UI should treat runtime state as derived, not persisted
- UI edits should map onto patch-style task updates
- UI must not assume block body notes survive current store writes

### For future scheduler / integrations work

- current heartbeat output shape is a good handoff boundary
- notification payloads are present, but dedupe and recurring mutation logic are still basic
- recurring completion / rollover rules must be specified before automating write-back

### For anyone touching parser/render

- be careful not to break round-trip field stability
- if preserving free-form block notes, do it without regressing canonical schema ordering
- do not convert this into partial string replacement logic

## Notes for the Next Agent

- Read `docs/contracts.md` first for the public data contract boundary.
- Read `docs/core-followups.md` next for agreed unfinished work.
- Do not assume current canonical render preserves human-authored task block notes.
- Do not assume Windows file replacement behavior is production-hardened.
- Do not expand into `apps/web`, `apps/api`, or `packages/integrations` unless the task explicitly changes scope.
- If you change recurring behavior, document the exact semantics because it is not fully settled yet.
- If you wire scheduler mutations, keep the persistent-vs-runtime distinction intact.
- If you improve TypeScript package wiring, make sure build and test commands remain simple from the repo root.

## Suggested Next Step

Recommended next concrete step if work continues on this worktree:

- implement P1-1 first:
  - preserve task-block free-form body text across parse -> modify -> render -> save
  - do it without changing the public `Task` contract unless the product decision explicitly allows that
  - then add regression tests proving the notes survive `saveTasks()` and `updateTask()`

Secondary step after that:

- define recurring rollover semantics clearly before adding `taskMutations`

## Resume Prompt

Use this prompt to resume work cleanly:

`继续在 feat/core-m0 worktree 的 packages/core 上工作。先阅读 docs/agent-notes/codex.md、docs/core-followups.md、docs/contracts.md。当前已完成 HEARTBEAT parser/render/store/heartbeat:once 最小链路，当前最大已知问题是任务块自由正文说明不会被保留。请先实现 P1-1：在不破坏现有 Task 公共契约的前提下，让 parse -> modify -> render -> save 后仍能保留任务块内 YAML 之外的自由正文说明，并补对应测试。`

## Phase-2 Integration Round - 2026-03-23

### Worktree

- Worktree label: `feat/p2-core`
- Local path: `E:\AI\open\open-memo.worktrees\feat\p2-core`
- Agent: `codex`
- Scope for this round: wire `apps/api` to real core storage and heartbeat output without changing API URLs or success response shapes

### Context Read Before Changes

- `docs/handoff-2026-03-22.md`
- `docs/contracts.md`
- `docs/architecture.md`
- `packages/shared/src/types.ts`
- `apps/api/src/index.ts`
- `packages/core/src/task-store.ts`
- `packages/core/src/heartbeat.ts`
- `packages/core/src/types.ts`
- `packages/integrations/src/notifier/router.ts`
- `packages/integrations/src/index.ts`
- `data/HEARTBEAT.md`

### Changes Made

- Replaced the in-memory `tasks` array in `apps/api/src/index.ts` with a real `TaskStore` instance pointing to `../../data/HEARTBEAT.md`
- Converted `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, and `DELETE /tasks/:id` to async handlers backed by `TaskStore`
- Preserved current API shape:
  - `GET /tasks` still returns `Task[]`
  - `POST /tasks` still returns the created `Task`
  - `PATCH /tasks/:id` still accepts a `TaskPatch`-shaped body and returns the updated `Task`
  - `DELETE /tasks/:id` still returns `204`
- Added defensive `try/catch` handling with `500` error responses, while keeping `404` for missing task update/delete cases
- Added `POST /heartbeat/once`
  - calls `runHeartbeatOnce({ heartbeatFilePath, now })`
  - sends `result.decision.notifications` through `new NotifierRouter().routeBatch(...)`
  - returns `{ heartbeat: result, notifications: notifyResults }`
- Added missing workspace dependencies to `apps/api/package.json`:
  - `@open-memo/core`
  - `@open-memo/integrations`

### Verification Performed

- Ran `pnpm install`
- Ran `pnpm build`
- Started API with `pnpm --filter @open-memo/api dev` through a temporary PowerShell smoke script
- Verified `GET /tasks`
  - returned 5 tasks from `data/HEARTBEAT.md`
  - ids observed:
    - `task-renew-passport`
    - `task-call-landlord`
    - `task-daily-water`
    - `task-weekly-review`
    - `task-submit-expense`
- Verified `POST /tasks`
  - created a new task through API
  - confirmed a new task block was written into `data/HEARTBEAT.md`
- Verified `PATCH /tasks/:id`
  - updated the created task title and priority
  - confirmed the rendered Markdown file reflected the new values
- Verified `DELETE /tasks/:id`
  - removed the created task
  - confirmed the task block no longer existed in `data/HEARTBEAT.md`
- Verified `POST /heartbeat/once` with `now=2026-03-23T12:00:30+08:00`
  - returned `dueTaskIds = ["task-renew-passport"]`
  - returned `overdueTaskIds = ["task-call-landlord", "task-daily-water", "task-weekly-review", "task-submit-expense"]`
  - routed 9 notifications with `0` failures

### Cleanup Notes

- The smoke test temporarily mutated `data/HEARTBEAT.md` during POST/PATCH/DELETE verification
- The file was restored to its pre-test contents after validation, so this round should leave only code/doc/lockfile changes

## Phase-3 Core Round - 2026-03-23

### Worktree

- Worktree label: `feat/p2-core`
- Local path: `E:\AI\open\open-memo.worktrees\feat\p2-core`
- Agent: `codex`
- Scope for this round:
  - fix P1-1 body text loss
  - extend core tests
  - add task classifier + API route
  - harden Windows atomic write retry path

### Context Read

- Requested file `docs/phase3-plan.md` was not present in this worktree
- Work proceeded from:
  - the user task list in chat
  - `docs/contracts.md`
  - `packages/shared/src/types.ts`
  - `packages/core/src/heartbeat-markdown.ts`
  - `packages/core/src/constants.ts`
  - `packages/core/src/task-store.ts`
  - `packages/core/src/heartbeat.ts`
  - `packages/core/src/recurrence.ts`
  - `packages/core/src/types.ts`
  - `packages/core/src/index.ts`
  - `tests/core.test.mjs`
  - `tests/fixtures/heartbeat-roundtrip.md`
  - `data/HEARTBEAT.md`
  - `apps/api/src/index.ts`

### Changes Made

- Added optional `bodyText?: string` to shared `Task`
- Updated parser/render/validation so task-block free text between YAML fence and `<!-- open-memo:task:end -->` is preserved
- Kept `bodyText` out of `TASK_FIELD_ORDER` and out of YAML serialization
- Clarified `waiting_ack` enter/exit conditions in `docs/contracts.md`
- Expanded core tests from 3 to 14
  - createTask
  - deleteTask
  - waiting_ack
  - expired snooze behavior
  - malformed parser input
  - missing field parser input
  - recurrence daily / weekly / none
  - multiline bodyText round-trip
  - classifier grouping
- Added `packages/core/src/task-classifier.ts`
  - `classifyTasks(tasks, now?)`
  - buckets: `today`, `overdue`, `snoozed`, `done`, `upcoming`
- Exported classifier from `packages/core/src/index.ts`
- Added API route `GET /tasks/classified`
- Hardened `atomicWriteFile()`
  - same temp-file strategy as before
  - retry `rename()` on `EPERM` / `EBUSY`
  - retry delays: `100ms`, `200ms`, `300ms`
  - never deletes the original target file
  - removes temp file on final failure and throws clearer error text

### Verification Per Task

- After P1-1 bodyText fix:
  - `pnpm build` passed
  - `pnpm test` passed after fixing one extra newline bug in renderer
- After contract clarification + test expansion:
  - `pnpm build` passed
  - `pnpm test` passed with `13` tests
- After classifier + API route:
  - `pnpm build` passed
  - `pnpm test` passed with `14` tests
- After atomic write retry hardening:
  - `pnpm build` passed
  - `pnpm test` passed with `14` tests

### Notes For Next Agent

- `bodyText` now survives parse -> modify -> render -> save for existing task blocks
- `bodyText` is storage-only block content, not a YAML field and not patchable through current mutable field lists
- `GET /tasks/classified` groups `due` and `waiting_ack` into `today`
- `paused` and `cancelled` tasks are currently not included in any classifier bucket except `done` for explicit `status=done`
- `docs/phase3-plan.md` should be added if it is expected to remain the canonical plan document

## Phase-3 Classifier Fix Round - 2026-03-23

### Scope

- Fix API-facing classifier output so `upcoming` tasks are also returned inside `today`
- Do not change `packages/core`
- Do not change `apps/web`

### Change Made

- Updated `GET /tasks/classified` in `apps/api/src/index.ts`
  - load tasks
  - call `classifyTasks(tasks)`
  - merge `classified.upcoming` into `classified.today`
  - return the merged payload unchanged otherwise

### Why

- Core keeps `dueAt = null` active tasks in `upcoming`, which is semantically correct
- Existing user-facing expectation is that newly created no-deadline tasks should appear in Today immediately
- API is the narrowest compatibility layer for that adjustment

### Verification

- Ran `pnpm build`
- Ran `pnpm test`
- Verified `GET /tasks/classified`
  - created a no-`dueAt` task
  - confirmed it appeared in `today`
  - confirmed it still also existed in `upcoming`, which is acceptable for the current API compatibility shim
- Verified with `agent-browser`
  - opened the local web app
  - created task `codex classifier fix browser test`
  - confirmed it appeared in the Today section immediately
  - refreshed the page
  - confirmed it still appeared after refresh
- Removed the verification task after the check

### Important Note

- Current `apps/web/src/App.tsx` still fetches `/tasks`, not `/tasks/classified`
- So the browser verification proves create/persist/reload behavior is intact
- The direct proof for this classifier fix itself is the `GET /tasks/classified` response check above
