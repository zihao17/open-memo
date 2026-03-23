# Agent Note - antigravity

## Branch / Worktree
`feat/web-m0` (本地工作区: `e:\ai\open\open-memo.worktrees\feat\web-m0`)
`feat/p2-web` (本地工作区: `e:\ai\open\open-memo.worktrees\feat\p2-web`)

## Scope
M0 Phase-1 的前端控制台外壳原型及极简 Mock API。
M0 Phase-2 的 Web 与 Core API 兼容性验证。
M0 Phase-3 (Task 3B) 的 Web 前端分组架构升级。

## Completed in this round (Phase-3 Web Adaptation)
- 移除了 `App.tsx` 中的本地 `Date().now()` 与前端 `filter` 实现。
- 完全接入来自后端 `/tasks/classified` 的分组数据下发（`today`, `overdue`, `snoozed`, `done`），新增 `fetchClassifiedTasks()` 接口以接手所有的渲染。
- 确保所有的修改型操作 (`handleCreateTask`, `patchTask`, `deleteTask`) 都可以驱动全量刷新最新的远端分组映射。
- **发现的大坑/优化点记录**：在遵守原定需求方案进行 4 个分组 (today, overdue, snoozed, done) 映射时，新创建的缺省任务会被 Core `classifyTasks` 划分到 `upcoming` 分组中（因为没有 dueDate），由于目前需求未将 `upcoming` 合并入并展现给 UI 端，新增加的任务会短暂“隐身”。建议下一阶段合并 `upcoming` 或是设立独立的渲染区。

## Completed in previous round (Phase-2 Web Validation)
- 对比了改动后的 `@open-memo/api` (p2-core) 和 `@open-memo/web` 的接口契约。
- 确认 `App.tsx` 发出的 PATCH `body` (包含 `taskId`, `changes`, `source`) 完全兼容 Core API 中基于 `TaskPatch` 的验证逻辑。
- 确认 POST 任务时 Web 缺省的字段均由 Core API 分配默认值，二者无缝对接。
- 启动了本地 Web 与 API 服务进行 E2E 验证（Browser Subagent），确认新增、完成、延后 (Snooze)、删除以及持久化均正常，**无须修改任何 Web 代码**。

## Completed in previous round (Phase-1)
- 搭建 `apps/web` 静态外壳，实现左右全屏双栏（ChatPanel 与 TaskPanel），UI 样式全量重写为符合 `UI.md` 规范规范的的 Vanilla CSS。
- 搭建 `apps/api` mock 服务器，以独立子包模式挂载为本地微服务后端。
- 实现 `GET /tasks`、`POST /tasks`、`DELETE /tasks` 以及严格遵守 `TaskPatch` 契约语义的 `PATCH /tasks/:id` 接口。
- 完成前后台联调：支持增加、行内编辑、勾选完成和 Snooze（延期操作）的全套数据流通机制。
- 修复了因为 ESM 模块系统与传统工具不兼容导致的 `pnpm typecheck` 中断与启动报错，并替换上了现代工具 `tsx`。

## Files changed
- Phase-2 Web Validation 经过评估测试，无需修改任何代码。
- Phase-1 修改记录：
  - **类型修复**：`packages/shared/src/index.ts`（补充 NodeNext 的 `.js` 扩展）。
  - **后端 (api)**：`apps/api/package.json`（增设 `tsx` 及依附）、`tsconfig.json`、`src/index.ts`（包含完整 Express 路由）。
  - **前端 (web)**：`apps/web/` 下的 `package.json`、`vite.config.ts`、基础 TS 配置三件套，与 `src/` 中的 `main.tsx`, `App.tsx`, `index.css`（样式注入）。

## Key implementation choices
- 这个原生实现刻意规避了 Redux、Zustand 和 Router 甚至全量庞大 UI 库组件的引入，最大程度做到“不做胖、不增加新负重工程化”。
- Task 任务区的动态分组（Today、Overdue、Snoozed）依赖了单向的数据计算推演。未产生哪怕一个多余的状态同步副本。
- 为了应对 Node ESM（`type: module`）下带来的解析阻变，API 的构建直接切向了采用 `esbuild` 中继机制的 `tsx` 作为运行时方案，抛弃了复杂的 `options` 修正配置。

## Known limitations
- 左侧对话面板纯假占位，一切键盘事件仅涉及表层的输入框置空。
- 目前前端 `App.tsx` 里的任务划分逻辑可能会与日后真正的 Core 端计算逻辑走偏。

## Run / verify
1. **安装环节**：根目录执行 `pnpm install` 确保包间链接。
2. **命令起停**：
   - 终端一（或者借用 p2-core）：`pnpm --filter @open-memo/api dev`
   - 终端二：`pnpm --filter @open-memo/web dev`
3. **验证链路**：开启 Vite 输出后的 localhost 端口 -> 发送新 Task（确认 Today 分组生成） -> 对其打钩（确认转移倒伏至 Done 分组）。

## Integration notes
- 下一任集成者在打通核心包时，后端无需再改写 Router 逻辑，只需把现在的 `patch`、`delete` 里面的数组操作映射连接到真实核心逻辑上的 `Store/Manager` 调用上就行。（该事项已在 Phase-2 codex 由并由本工作区验证无缝打通！）
- 分组管理日后可调整为双端数据同源约定。后端返回分组好的对象结果。

## Suggested next step
- 修正目前阶段 `upcoming` 状态任务在前端不显示的状况（渲染合并或新增列表）。
- 与真实 `integrations` 包进行对话能力对接。将 Mock 的聊天功能与真实的外部模型以及工具调用逻辑对应。
