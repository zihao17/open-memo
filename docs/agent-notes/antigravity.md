# Agent Note - antigravity

## Branch / Worktree
`feat/web-m0` (本地工作区: `e:\ai\open\open-memo.worktrees\feat\web-m0`)

## Scope
M0 Phase-1 的前端控制台外壳原型及极简 Mock API。
具体覆盖：`apps/web` (React+Vite) 与 `apps/api` (Express+tsx)，以及跨包依赖 `@open-memo/shared`。

## Completed in this round
- 搭建 `apps/web` 静态外壳，实现左右全屏双栏（ChatPanel 与 TaskPanel），UI 样式全量重写为符合 `UI.md` 规范规范的的 Vanilla CSS。
- 搭建 `apps/api` mock 服务器，以独立子包模式挂载为本地微服务后端。
- 实现 `GET /tasks`、`POST /tasks`、`DELETE /tasks` 以及严格遵守 `TaskPatch` 契约语义的 `PATCH /tasks/:id` 接口。
- 完成前后台联调：支持增加、行内编辑、勾选完成和 Snooze（延期操作）的全套数据流通机制。
- 修复了因为 ESM 模块系统与传统工具不兼容导致的 `pnpm typecheck` 中断与启动报错，并替换上了现代工具 `tsx`。

## Files changed
- **类型修复**：`packages/shared/src/index.ts`（补充 NodeNext 的 `.js` 扩展）。
- **后端 (api)**：`apps/api/package.json`（增设 `tsx` 及依附）、`tsconfig.json`、`src/index.ts`（包含完整 Express 路由）。
- **前端 (web)**：`apps/web/` 下的 `package.json`、`vite.config.ts`、基础 TS 配置三件套，与 `src/` 中的 `main.tsx`, `App.tsx`, `index.css`（样式注入）。

## Key implementation choices
- 这个原生实现刻意规避了 Redux、Zustand 和 Router 甚至全量庞大 UI 库组件的引入，最大程度做到“不做胖、不增加新负重工程化”。
- Task 任务区的动态分组（Today、Overdue、Snoozed）依赖了单向的数据计算推演。未产生哪怕一个多余的状态同步副本。
- 为了应对 Node ESM（`type: module`）下带来的解析阻变，API 的构建直接切向了采用 `esbuild` 中继机制的 `tsx` 作为运行时方案，抛弃了复杂的 `options` 修正配置。

## Known limitations
- `apps/api` 目前是一个内存模型。每次终端中止，mock 生成的数据就灰飞烟灭。
- 左侧对话面板纯假占位，一切键盘事件仅涉及表层的输入框置空。
- 目前前端 `App.tsx` 里的任务划分逻辑可能会与日后真正的 Core 端计算逻辑走偏。

## Run / verify
1. **安装环节**：根目录执行 `pnpm install` 确保包间链接。
2. **命令起停**：
   - 终端一：`pnpm --filter @open-memo/api dev`
   - 终端二：`pnpm --filter @open-memo/web dev`
3. **验证链路**：开启 Vite 输出后的 localhost 端口 -> 发送新 Task（确认 Today 分组生成） -> 对其打钩（确认转移倒伏至 Done 分组）。

## Integration notes
- 下一任集成者在打通核心包时，后端无需再改写 Router 逻辑，只需把现在的 `patch`、`delete` 里面的数组操作映射连接到真实核心逻辑上的 `Store/Manager` 调用上就行。
- 分组管理日后可调整为双端数据同源约定。后端返回分组好的对象结果。

## Suggested next step
- 与真实 `core` 包进行对接。将 `apps/api/src/index.ts` 中的内存数组存储逻辑替换并依赖 `@open-memo/core`，同时连接 `heartbeat` / 调度器引擎。

## Resume prompt
“Hi Antigravity，请先读取 `docs/agent-notes/antigravity.md` 熟悉我们上一个会话的完成点。本轮的目标重点是下一阶段：利用真实的 `core` 数据接管掉 API 中虚假的内存 Mock 逻辑。请准备好从这里开始！”
