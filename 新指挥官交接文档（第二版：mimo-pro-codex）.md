# Open Memo 项目交接文档（第二版：mimo-pro -> codex）

> **旧交接文档**：`新指挥官交接文档（第一版：gpt-mimo-pro）.md`（chatgpt 旧指挥官 -> 小米 mimo-v2-pro，2026-03-23）
> **本交接文档**：小米 mimo-v2-pro -> codex（第 3 任指挥官）
> **交接时间**：2026-03-24

---

## 1. 项目概览

### 1.1 项目名称

**Open Memo**

### 1.2 项目目标

构建一个**极轻量、纯本地优先、可 24 小时运行**的个人备忘与提醒代理，核心聚焦：

* 全天候提醒
* 简单任务跟进
* 设置后尽量"忘掉它"，到点主动提醒用户
* 不追求复杂多 Agent 协作平台
* 不追求庞大技能生态
* 不引入重型常驻网关

### 1.3 当前产品定位

* Windows first 的本地提醒工具
* 以 Markdown 为真源的数据系统
* 以短命心跳进程驱动的提醒执行器
* 以本地网页作为交互入口
* 以 deterministic scheduling 为主、LLM 为辅

### 1.4 技术方向

* **平台优先级**：Windows first
* **实现语言**：Node.js / TypeScript
* **前端形式**：本地网页 UI
* **数据存储**：纯 Markdown
* **运行机制**：固定心跳 + 动态最近任务唤醒
* **模型接入策略**：ProviderAdapter 抽象，V1 优先 OpenAI-compatible + Anthropic

### 1.5 总体设计原则

* Markdown is source of truth
* Local-first
* Deterministic scheduling first, LLM second
* Lightweight runtime / short-lived heartbeat process
* 不引入 Electron
* 不引入数据库
* 不做"大而全长期在线 AI 平台"
* 不绕过 Markdown 真源直接维护第二套状态系统

---

## 2. 产品设计与架构约束

### 2.1 数据文件职责

| 文件 | 职责 |
|------|------|
| `MEMORY.md` | 长期事实、高置信结论、重要可持久化信息 |
| `memory/YYYY-MM-DD.md` | 当日日志，append-only |
| `USER.md` | 用户偏好、设置、黑白名单等 |
| `SOUL.md` | 代理人格、语气、优先级风格规则 |
| `AGENTS.md` | 可选，未来多角色扩展 |
| `HEARTBEAT.md` | 当前待办/提醒清单，是任务层真源 |

### 2.2 HEARTBEAT.md 存储思想

单文件任务存储层。所有入口统一走：

**解析 Markdown -> Task 对象 -> 修改对象 -> 规范重渲染 -> 原子写回**

不允许：直接字符串替换、UI 绕过 core 改 Markdown、AI 绕过 TaskStore 直接写文件。

### 2.3 网页双栏设计

* 左侧：AI 聊天面板（当前为占位，Phase-5 接真实 AI）
* 右侧：任务管理面板（Today / Overdue / Snoozed / Done 视图）

### 2.4 通知优先级

1. 系统原生通知
2. 浏览器通知
3. 网页历史记录
4. AI 聊天窗口注入（附加能力，不是主链路）

### 2.5 调度策略

* 固定心跳 + 动态最近任务唤醒
* 生产环境用 Windows 计划任务定时调用 heartbeat:once（进程跑完就退出）
* heartbeat:loop 仅作为开发调试工具

---

## 3. 仓库与模块结构

### 3.1 各模块职责

| 模块 | 职责 | 状态 |
|------|------|------|
| `packages/shared` | 共享类型：Task、TaskPatch、HeartbeatDecision、NotifyPayload、ProviderAdapter | 完成 |
| `packages/core` | parser/renderer、TaskStore、heartbeat、recurrence、task-classifier | 完成 |
| `packages/integrations` | ProviderAdapter stubs、NotifierRouter、stub notifiers、ChatBridgeRegistry | stub（P4 要改） |
| `apps/api` | 本地 API，已接入 core TaskStore | 完成 |
| `apps/web` | 本地网页双栏控制台，已消费 /tasks/classified | 完成 |

### 3.2 关键契约

**Task 字段（16 个）**：id、title、detail、status(active/paused/done/cancelled)、priority(p0-p3)、dueAt、timezone、recurrence(none/daily/weekly)、snoozeUntil、confirmRequired、channels、tags、createdAt、updatedAt、source(ui/ai/manual)、bodyText（P3 新增可选）

**运行态（不持久化）**：upcoming、due（now-dueAt < 60s）、overdue（now-dueAt >= 60s）、snoozed（snoozeUntil > now）、waiting_ack（过期 + confirmRequired）

**HEARTBEAT.md 格式**：`<!-- open-memo:task:start -->` + YAML fence + 可选 bodyText + `<!-- open-memo:task:end -->`

### 3.3 API 路由

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | /tasks | 返回所有任务 |
| POST | /tasks | 创建任务（body 只需 title） |
| PATCH | /tasks/:id | 部分更新（TaskPatch 格式） |
| DELETE | /tasks/:id | 删除任务 |
| GET | /tasks/classified | 返回分组（today/overdue/snoozed/done） |
| POST | /heartbeat/once | 触发心跳 + 通知 |
| GET | /today-brief | 返回简报文案（静态） |

---

## 4. 已完成工作总结（P1 + P2 + P3）

### 4.1 core（codex 完成）

* parser/renderer：解析/渲染 HEARTBEAT.md，含 bodyText 保留
* TaskStore：CRUD + 原子写回（含 EPERM/EBUSY 退避重试）
* heartbeat：runHeartbeat/runHeartbeatOnce，运行态判断
* recurrence：getNextRecurringDueAt/getNextTaskDueAt
* classifier：classifyTasks -> today/overdue/snoozed/done/upcoming
* CLI：heartbeat:once
* 测试：14 个

### 4.2 web/api（gemini 完成）

* API：TaskStore 接入、heartbeat 路由、classified 路由（upcoming 合并进 today）
* Web：双栏 UI、消费 /tasks/classified、CRUD 交互

### 4.3 integrations（minimax 完成）

* ProviderAdapter stubs、NotifierRouter、3 个 stub notifier、ChatBridgeRegistry
* smoke demo 通过，Phase-3 review 通过

---

## 5. 当前集成状态

### 5.1 Git 状态

主分支：`feat/m0-phase2-integration`，HEAD: `f506c1b`（P4 决策记录）

P4 worktree 已创建：
* `feat/p4-core`（b75671d，给 codex）
* `feat/p4-web`（b75671d，给 gemini）
* `feat/p4-integrations`（b75671d，给 minimax）

P3 遗留 worktree（未清理）：`feat/p2-core`（80addd3）、`feat/p2-web`（dfab4c3）

### 5.2 已验证结果

* 页面正常，CRUD 全通
* 刷新后任务仍在（持久化到 HEARTBEAT.md）
* /tasks/classified 分组正确
* /heartbeat/once 返回 heartbeat 决策 + 通知结果

### 5.3 已知问题

| 级别 | 问题 |
|------|------|
| P4 待做 | 通知仍是 stub |
| P4 待做 | recurring 不会自动推进 |
| P4 待做 | 没有自动定时扫描 |
| P5 待做 | 左侧聊天面板是假的 |
| 低 | /today-brief 是静态文案 |

---

## 6. 指挥官指挥原则

### 6.1 用户偏好

* 用户说**"读读"**时，只读不动手
* 用户说**"简短回答"**时，该次简短
* 做决定要**向用户说明，申请同意**
* 倾向**方案 A**（一人多事减少冲突）
* **worktree 新建优于复用旧的**
* **持续记录重要信息到 MEMORY.md**

### 6.2 Agent 分工

| Agent | 职责边界 |
|-------|----------|
| **codex** | core 引擎、TaskStore、heartbeat、调度、测试 |
| **gemini** | web UI、API 路由适配（不改 core 逻辑） |
| **minimax + mimo** | integrations（ProviderAdapter、NotifierRouter、notifiers） |

跨边界原则：core owner 是 codex，integrations owner 是 minimax，shared 是共同真源。

### 6.3 关键教训

**HEARTBEAT.md 数据事故**：codex 验收触发 P1-1 自由正文丢失，5 个任务备注被吃掉。教训：验收时备份数据文件。

**不要假设恢复了就是真的恢复了**：codex 声称已恢复但实际残留问题。必须亲自 git diff。

**Worktree 未提交时 git graph 看不到**：需用 `git worktree list` + `git status` 检查。

**旧指挥官建议通常是对的**：特别是语义细节和边界划分。

### 6.4 Phase 关键决策

* P2 方案 A：codex 一人做 api->core + heartbeat->notifier
* P3 修正：bodyText 原样、waiting_ack 先定契约、分组锁 API 出口、绝不删原文件、目标收敛为稳定化
* P4 修正：heartbeat:loop 仅 dev only、recurring 过期不滚走、SystemNotifier 由 minimax 做、锁定通知库

### 6.5 容易出错的点

| 问题 | 解决 |
|------|------|
| bash 中文编码 | `git commit -F file.tmp` |
| Windows 路径 | 用正斜杠或 workdir 参数 |
| worktree 非空删不掉 | `git worktree prune` |
| LSP 报找不到 @open-memo/core | 先 pnpm build |

### 6.6 构建命令

```bash
pnpm install          # 安装依赖
pnpm build            # 编译（shared -> core -> integrations -> api -> web）
pnpm test             # 测试（先 build 再 test）
pnpm heartbeat:once   # 单次心跳扫描
pnpm smoke            # integrations smoke 测试
```

---

## 7. 路线图

```
P1 基础引擎（完成）
P2 模块接线（完成）
P3 稳定化（完成）
P4 让提醒真正发生（下一步）
P5 让 AI 聊天可用
P6 产品化打磨
```

---

## 8. P4 详细计划

### P4-1：Windows Toast 通知（minimax 负责）

SystemNotifier 从 stub 改为真实通知。开工前锁定：库选型、NotificationResult 返回、urgency 映射、deep link（P4 不支持）。

### P4-2：Heartbeat 定时触发（codex 负责）

生产：Windows 计划任务调用 heartbeat:once。开发调试：heartbeat:loop（setTimeout 循环 + SIGINT 退出，仅 dev only）。

### P4-3：Recurring 自动推进（codex 负责）

条件：status=done 且 recurrence!=none 才推进 dueAt 并重置为 active。过期未完成不滚走。runHeartbeat 生成 mutation，heartbeat-loop 或 once 后续步骤应用。

### P4-4：前端无感适配（gemini 负责）

确认不影响 Web，最小适配。

### P4-5：Integrations review（minimax 负责）

审查 SystemNotifier 真实实现的影响。

### Worktree 分配

codex -> feat/p4-core，gemini -> feat/p4-web，minimax -> feat/p4-integrations（均已创建）。

---

## 9. P4 Agent 提词词

### 给 codex

```
codex，你是 P4 核心开发 agent，在 feat/p4-core worktree。

第一步读取上下文：docs/roadmap.md、docs/contracts.md、packages/core/src/heartbeat.ts、heartbeat-markdown.ts、recurrence.ts、task-store.ts、types.ts、index.ts、cli/heartbeat-once.ts、packages/integrations/src/notifier/router.ts、packages/shared/src/types.ts、tests/core.test.mjs。

任务 P4-2：新增 packages/core/src/cli/heartbeat-loop.ts（dev only）。setTimeout 循环 + SIGINT 退出，每次调用 runHeartbeatOnce + NotifierRouter.routeBatch。根 package.json 加 "heartbeat:loop" 脚本。

任务 P4-3：heartbeat.ts 的 runHeartbeat() 中，检测 status=done && recurrence!=none 的 task，生成 taskMutations（status->active, dueAt->getNextTaskDueAt, snoozeUntil->null）。runHeartbeatOnce() 中应用 mutations 到 TaskStore。新增 recurring 相关测试。

逐个任务执行，每完成确认 pnpm build && pnpm test。更新 codex.md。
```

### 给 minimax

```
minimax + mimo，你们是 P4 integrations 开发 agent，在 feat/p4-integrations worktree。

第一步读取：docs/roadmap.md、packages/integrations/src/notifier/system.ts（你的改动目标）、router.ts、browser.ts、ai-chat.ts、index.ts、packages/shared/src/types.ts、packages/core/src/heartbeat.ts。

任务 P4-1：system.ts 从 stub 改为真实 Windows 通知。开工前锁定：库选型（node-notifier/win-toast-notifier/PowerShell 择一）、NotificationResult 返回、urgency 映射、deep link（P4 不支持留 null）。只改 integrations，不碰 core/api/web。

任务 P4-5：审查真实实现对 NotifierRouter/ProviderAdapter 的影响。

更新 minimax.md。
```

### 给 gemini

```
gemini，你是 P4 Web 适配 agent，在 feat/p4-web worktree。

第一步读取：docs/roadmap.md、apps/web/src/App.tsx、packages/shared/src/types.ts。

codex 已完成 heartbeat:loop 和 recurring 自动推进。检查：toggleTaskStatus 后是否调用 fetchClassifiedTasks（确认 recurring 完成后分组刷新正常）；confirmRequired 交互（checkbox 即视为确认）。

如有需要做最小适配，否则不动代码。pnpm build 验证。更新 antigravity.md。
```

---

## 10. 新指挥官工作方式

### 第一步：确认仓库状态

```bash
git worktree list && git branch -a && git status && git log --graph --oneline --decorate -n 15
```

### 第二步：读关键文件

1. 本交接文档
2. docs/roadmap.md、docs/contracts.md
3. data/MEMORY.md、data/HEARTBEAT.md
4. packages/shared/src/types.ts
5. packages/core/src/heartbeat.ts
6. apps/api/src/index.ts、apps/web/src/App.tsx

### 第三步：按路线图推进

不要铺新功能，先把已有模块接成更真实的闭环。每轮写 handoff，每个 agent 写 agent note。

---

## 11. 相关文档索引

| 文档 | 说明 |
|------|------|
| `新指挥官交接文档（第一版：gpt-mimo-pro）.md` | 第 1 版交接 |
| `新指挥官交接文档（第二版：mimo-pro-codex）.md` | 第 2 版交接（本文档） |
| `docs/roadmap.md` | P1-P6 路线图 + P4 详细拆分 |
| `docs/contracts.md` | 数据契约 |
| `docs/architecture.md` | 架构说明 |
| `docs/agent-context.md` | agent 状态 |
| `docs/core-followups.md` | core follow-ups |
| `docs/phase3-plan.md` | P3 规划 |
| `docs/handoff-2026-03-23.md` | P2 完成交接 |
| `docs/handoff-2026-03-24.md` | P3 完成交接 |
| `data/MEMORY.md` | 指挥官永久记忆 |
| `CLAUDE.md` | 项目记忆 |
