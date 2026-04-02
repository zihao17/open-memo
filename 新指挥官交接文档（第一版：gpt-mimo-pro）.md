# Open Memo 项目交接文档

open-memo 旧指挥官：chatgpt网页
open-memo 新指挥官：小米mimo-v2-pro（1M上下文）
3月23日16时正式交接

## 1. 项目概览

### 1.1 项目名称

**Open Memo**

### 1.2 项目目标

构建一个**极轻量、纯本地优先、可 24 小时运行**的个人备忘与提醒代理，核心聚焦：

* 全天候提醒
* 简单任务跟进
* 设置后尽量“忘掉它”，到点主动提醒用户
* 不追求复杂多 Agent 协作平台
* 不追求庞大技能生态
* 不引入重型常驻网关

### 1.3 当前产品定位

Open Memo 当前被定义为：

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
* 不做“大而全长期在线 AI 平台”
* 不绕过 Markdown 真源直接维护第二套状态系统

---

## 2. 产品设计与架构约束

## 2.1 数据文件职责

项目当前的核心数据文件设计如下：

* `MEMORY.md`
  长期事实、高置信结论、重要可持久化信息

* `memory/YYYY-MM-DD.md`
  当日日志，append-only

* `USER.md`
  用户偏好、设置、黑白名单等

* `SOUL.md`
  代理人格、语气、优先级风格规则

* `AGENTS.md`
  可选，未来多角色扩展

* `HEARTBEAT.md`
  当前待办/提醒清单，是任务层真源

## 2.2 HEARTBEAT.md 的存储思想

当前设计坚持以下原则：

* 单文件任务存储层
* 结构化任务块
* Markdown 可读、可编辑
* 所有入口统一走：

**解析 Markdown → Task 对象 → 修改对象 → 规范重渲染 → 原子写回**

不允许：

* 直接字符串替换
* UI 绕过 core 改 Markdown
* AI 绕过 TaskStore 直接写文件

## 2.3 网页双栏设计

本地网页为主要交互入口，采用双栏布局：

### 左侧

AI 聊天面板：

* 自然语言交互
* 任务问答
* 未来的工具调用入口
* 当前 Phase-1 中只是 UI 容器和占位，不是真实 AI 系统

### 右侧

任务管理面板：

* Today / Upcoming / Overdue / Snoozed 等视图
* 新增、删除、修改、完成、snooze
* 搜索、排序、详情查看
* 显式任务管理入口

## 2.4 通知优先级

当前明确的优先级策略：

1. **系统原生通知**
2. **浏览器通知**
3. **网页历史记录**
4. **AI 聊天窗口注入**（附加能力，不是主链路）

## 2.5 调度策略

当前设计为：

* 固定心跳
* 动态最近任务唤醒
* 非 daemon 长驻
* 以短命 heartbeat process 为主

## 2.6 LLM 接入策略

* 采用 `ProviderAdapter` 抽象
* V1 目标支持：

  * OpenAI-compatible
  * Anthropic
* 当前 integrations 已搭出 stub 抽象
* 真实模型调用尚未接入

## 2.7 V1 当前明确不做项

基于当前对话已经明确的“不做项”：

* 不引入 Electron
* 不引入数据库
* 不发展为复杂长期在线平台
* 不上复杂浏览器扩展
* 不做复杂多 Agent 运行时系统
* 不接复杂 chat automation 作为主链路
* 不在当前阶段接真实 provider / 真实自动化 / 完整 recurring 自动推进闭环

---

## 3. 当前仓库与模块结构

当前仓库采用 monorepo 结构，已知核心目录如下：

```text
/
  README.md
  Ul.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .editorconfig
  .nvmrc
  config.example.json

  apps/
    api/
    web/

  packages/
    shared/
    core/
    integrations/

  data/
    HEARTBEAT.md
    MEMORY.md
    USER.md
    SOUL.md
    memory/

  docs/
    contracts.md
    architecture.md
    ...（后续 handoff / agent notes 可能已存在）

  scripts/
  tests/
    fixtures/
```

## 3.1 已知模块职责

### `packages/shared`

* 共享类型定义
* Task / TaskPatch / HeartbeatDecision / NotifyPayload / ProviderAdapter 等真源类型

### `packages/core`

* HEARTBEAT Markdown parser / renderer
* TaskStore
* heartbeat once pipeline
* recurrence helper
* 原子写回

### `packages/integrations`

* ProviderAdapter stubs
* NotifierRouter
* System / Browser / AiChat notifier stubs
* ChatBridgeRegistry
* smoke demo

### `apps/api`

* 本地 API
* 当前已实现 web Phase-1 所需最小接口
* 后续应接入 core，而不是长期使用内存 mock

### `apps/web`

* 本地网页控制台
* 左聊天、右任务双栏壳
* 当前已具备基础任务管理流

### `data/*`

* 真实 Markdown 数据源
* 当前至少包含样例任务与配置数据

---

## 4. Phase-1 已完成工作总结

## 4.1 Agent 1 / codex / core

### 负责范围

核心引擎 / 存储 / 调度

### 已完成内容

已交付最小 core 链路，包括：

* `HEARTBEAT.md` parser
* `HEARTBEAT.md` renderer
* `TaskStore` CRUD
* 原子写回
* `heartbeat:once` CLI
* recurrence helper
* 基础测试

### 已知核心接口

已明确交付的核心能力包括：

* `parseHeartbeatMarkdown()`
* `renderHeartbeatMarkdown()`
* `validateTask()`
* `TaskStore`

  * `loadTasks()`
  * `saveTasks()`
  * `createTask()`
  * `updateTask()`
  * `deleteTask()`
* `runHeartbeat()`
* `runHeartbeatOnce()`
* `resolveTaskRuntimeState()`
* `getNextRecurringDueAt()`
* `getNextTaskDueAt()`

### 验收结论

**通过，但带 follow-ups**

### 已知 follow-ups

#### P1-1：自由正文不保留

当前 canonical render 只保留 schema 内字段，不保留 YAML 之外的任务正文备注。
已明确影响：

* 任务块自由说明文本会丢失
* 人工补充备注会在 save/update 后消失

不会影响：

* `detail` 字段（因为它在 YAML 内）

#### P1-2：Windows 原子写回不够强健

当前原子写回流程：

* 写 temp
* fsync temp
* close
* rename(temp, target)

已知问题：

* 未对 Windows 上目标文件占用场景做强化
* 未做 replace fallback
* 未做重试/回退
* 失败会直接抛错

#### 其他 follow-up

* recurring task rollover 还未完整接入 heartbeat mutation
* 当前 recurring helper 只是基础函数，不代表完整 recurring 闭环已完成
* 测试覆盖仍有缺口：

  * waiting_ack
  * create/delete
  * parser 异常路径
  * recurrence helper 更完整 case
  * Windows rename 失败语义
  * 自由正文丢失 case

### 当前可依赖能力

新指挥官可以把 core 当作以下能力的底座：

* 解析 HEARTBEAT.md 成 Task[]
* 通过 TaskStore 做稳定 CRUD
* 通过 heartbeat:once 做 due/overdue/snoozed 判断
* 通过 recurrence helper 做基础时间推算

### 当前不要误判的地方

不要假设 core 已经具备：

* 自由正文保留式写回
* 完整 recurring 自动推进
* Windows fully hardened atomic write

---

## 4.2 Agent 2 / gemini / web-api

### 负责范围

本地 API + Web UI

### 已完成内容

已完成 Web M0 Phase-1：

* 本地网页双栏布局
* 左侧聊天面板壳
* 右侧任务管理面板
* 本地 mock API
* Today / Overdue / Snoozed/Upcoming 视图
* 新增、编辑、完成、snooze、删除任务交互
* `GET /today-brief` 简报接口
* 基础样式实现，参考 `Ul.md`

### 已完成的 API 形状

当前已知 API 路由包括：

* `GET /tasks`
* `POST /tasks`
* `PATCH /tasks/:id`
* `DELETE /tasks/:id`
* `GET /today-brief`

### 关键实现说明

#### shared 修改

web 分支曾修改 `packages/shared/src/index.ts`，但该修改已说明只是：

* NodeNext / ESM 导出路径修复
* `export * from "./types"` → `export * from "./types.js"`

不涉及公共契约变更。

#### PATCH 语义

web/api 已明确：

* `PATCH /tasks/:id` 按 `TaskPatch` 思路做部分更新
* 不是整对象覆盖
* 没有自造 shared 之外的新领域模型

#### 分组逻辑

当前前端分组是**纯视图计算**，不是持久状态：

* Overdue
* Today
* Snoozed/Upcoming

当前边界：

* 未把 overdue/today/upcoming 写成 Task 持久状态字段

#### 左侧聊天面板

当前只是：

* UI 容器
* 占位对话
* 输入框
* 工具调用展示占位

不是：

* 真实模型调用系统
* 真实工具执行系统
* 完整聊天代理

### 验收结论

**通过**

### 已知 follow-ups

* 前端分组语义后续需与 core 统一
* API 后续应直接接 core，不长期维护独立内存 mock 语义
* 左侧聊天后续再接真实工具 / 模型，不要误以为现在已具备

### 当前可依赖能力

新指挥官可以把 web/api 当前实现视作：

* 一个可以运行的本地控制台壳
* 一个已验证的最小 UI/交互入口
* 一个应当尽量保持 API 形状稳定的界面层

---

## 4.3 Agent 3 / minimax / integrations

### 负责范围

模型 / 通知 / ChatBridge 抽象

### 已完成内容

已完成 integrations Phase-1 基础抽象：

* `ProviderAdapter` stub 层
* `OpenAICompatibleAdapter` stub
* `AnthropicAdapter` stub
* `NotifierRouter`
* `SystemNotifier` stub
* `BrowserNotifier` stub
* `AiChatNotifier` stub
* `ChatBridgeRegistry`
* smoke demo

### 已确认的抽象边界

#### shared 复用

integrations 已明确直接复用 `@open-memo/shared` 中的：

* `ProviderAdapter`
* `ProviderChatRequest`
* `ProviderChatResponse`
* `ProviderStructuredRequest`
* `ProviderToolCall`
* `ProviderToolDefinition`
* `ProviderToolResult`
* `NotifyPayload`
* `NotificationChannel`
* `NotificationUrgency`

没有重复定义 core/shared 的核心领域模型。

#### NotifierRouter

当前语义明确：

* 按 `payload.channel` 路由
* 支持 batch 路由
* batch 为逐条执行，一条失败不影响其他条

#### ChatBridgeRegistry

当前边界明确：

* 只负责 adapter 注册 / 获取 / 枚举
* 没有引入站点识别
* 没有引入浏览器自动化
* 没有引入页面注入

#### smoke

当前 smoke 已证明：

* 构造 `NotifyPayload`
* 进入 `NotifierRouter`
* 返回 `NotificationResult`

### 验收结论

**通过**

### 已知 follow-ups

* `NotificationResult` 等结果结构后续需稳定统一
* 真实 provider 未接入
* 真实 notifier 未接入
* 真实 chat automation 未接入
* 当前全部仍是 stub / mock / placeholder

### 当前可依赖能力

新指挥官可以依赖 integrations 作为：

* 真实接线前的抽象底座
* heartbeat → notifier 的下一步集成目标
* provider/chatbridge 的未来扩展边界

---

## 5. 当前已完成的集成情况

## 5.1 集成线状态

本项目当前已进入 **Phase-2 集成前/集成基线阶段**。

对话中已明确存在一条集成线：

* `feat/m0-phase2-integration`

该分支/集成线被用于汇合 Phase-1 成果并继续推进下一步集成。

## 5.2 已验证的集成结果

用户已手动验证以下事项均正常：

* 页面可以打开
* 任务列表可以显示
* 新增任务可以成功
* 编辑任务可以成功
* 删除任务可以成功
* 完成任务可以成功
* snooze 可以成功
* API 没有明显报错
* 浏览器前端没有明显 import / ESM / 路径错误

### snooze 的已知验证结果

snooze 测试预期已明确：

* 任务从当前列表移到 Snoozed / Upcoming
* 刷新后仍在
* `HEARTBEAT.md` 中 `snoozeUntil` 会写入未来时间

### API 测试预期

已明确观察：

* 后端终端没有明显异常栈
* 请求应返回 200/201
* 没有 500

### 前端模块测试预期

已明确检查：

* 没有 `Failed to fetch module`
* 没有 `Cannot find module`
* 没有 `Unexpected token export`
* 没有明显红色错误

## 5.3 关于当前 git 状态

对话中已明确：

* 集成分支 `feat/m0-phase2-integration` 已存在并被用于后续工作
* 曾发生过 worktree / 分支 merge 问题，需要排查 detached HEAD 或分支名不存在的情况
* 后续用户表示“执行完了”，说明该问题已实际处理，但未在对话中逐条确认最终 git graph 状态

因此：

* **当前仓库的最终分支图谱、merge 结果、远程推送状态：待仓库确认**
* 新指挥官接手时，应先通过 `git branch -a`、`git worktree list`、`git log --graph --oneline --decorate --all -n 50` 自查

---

## 6. 当前已知问题与技术债

## 6.1 P1 级问题

### P1：HEARTBEAT 自由正文不保留

当前 core 在任务 round-trip / save / update 时会丢失任务块 YAML 之外的自由正文备注。
这削弱了 `HEARTBEAT.md` 作为“可读可编辑存储层”的价值。

### P1：Windows 原子写回稳健性不足

当前实现未对 Windows 文件占用、rename 覆盖失败等情况做足够强化。
这是 Windows-first 项目需要补强的地方。

## 6.2 重要 follow-ups

### 前端分组语义仍需与 core 统一

当前 web 的 Today / Overdue / Snoozed/Upcoming 为前端计算视图。
后续应统一到 core/helper/shared 语义，避免两套判断逻辑分叉。

### recurring 自动推进尚未闭环

当前 recurrence helper 已有，但：

* heartbeat 还未完整推进 recurring task
* overdue recurring 如何滚动还未形成最终稳定语义

### notifier/provider/chatbridge 仍是 stub

目前 integrations 只是抽象层与 smoke，不代表真实能力已具备。

### 真实系统通知增强未做

现阶段先跑 stub；更完整系统通知能力未作为已完成项。

### 真实 AI 聊天窗口注入未做

ChatBridge 只有 registry，不是已完成能力。

### 真实模型接入未做

ProviderAdapter 只是 stub，不代表 OpenAI-compatible 或 Anthropic 已真实打通。

---

## 7. 新指挥官最需要知道的指挥原则

## 7.1 当前阶段的核心任务不是“继续铺功能”

当前最重要的是：

**先把已有模块真正接起来，形成真实数据流与最小闭环。**

不要继续做：

* 新 UI 花样
* 新 provider
* 新自动化
* 新平台化能力

## 7.2 不要让 3 个 agent 在不同旧基线上继续扩功能

如果继续让 3 个 agent 在不同旧分支上横向开发，会导致：

* shared/core 语义漂移
* web 和 core 继续分叉
* integrations 猜测错误接口形状
* merge 成本越来越高

应尽量以统一集成基线为起点继续推进。

## 7.3 core 是底座

后续所有真实读写应尽量贴 core：

* API 不要长期维护独立 task store 语义
* Web 不要维护独立运行态逻辑太久
* Integrations 应直接消费 core 输出的通知负载

## 7.4 shared 必须继续是单一真源

不要允许：

* web 自己定义一套 Task
* integrations 自己定义一套 NotifyPayload
* core 自己膨胀出 shared 外的第二套类型体系

## 7.5 严禁把项目带偏

不要把 Open Memo 带偏成：

* 大而全长期在线 AI 平台
* Electron 桌面平台
* 数据库驱动系统
* 复杂多 Agent runtime

当前产品价值在于：

* 本地可用
* Markdown 可读可控
* 轻量
* 提醒可靠
* 维护成本低

## 7.6 当前优先级

优先保证：

1. 真数据流通
2. Markdown 不被破坏
3. API 与 UI 稳定
4. 通知链路可跑
5. Web / API / Core / Integrations 接口统一

---

## 8. 下一步建议

## 8.1 第一优先：`apps/api` 真接 `packages/core`

### 目标

用 `TaskStore` 替代当前 mock / in-memory 语义，保持 API 形状尽量稳定，使 `apps/web` 尽量无感继续工作。

### 具体要求

* `GET /tasks` 真读 `HEARTBEAT.md`
* `POST /tasks` 真写 Markdown
* `PATCH /tasks/:id` 通过 core 修改任务
* `DELETE /tasks/:id` 通过 core 删除任务
* API 不要直接操作 Markdown 字符串
* API 尽量复用 core 的 update/store 语义

### 验收标准

* Web 基本无感继续工作
* 刷新页面后任务仍在
* `HEARTBEAT.md` 真被修改
* 新增/编辑/删除/完成/snooze 仍可用

## 8.2 第二优先：`heartbeat:once` 真接 `NotifierRouter`

### 目标

将 core heartbeat 产生的通知负载送进 integrations 的 `NotifierRouter`，跑通 stub 通知链路。

### 具体要求

* 让 `runHeartbeatOnce()` 的输出能转成 `NotifyPayload[]`
* 接入 `routeBatch()`
* 先只跑 stub notifier
* 不接真实 provider
* 不接真实 chat automation

### 验收标准

* 执行 heartbeat once 后可以看到 router 按 channel 路由
* stub notifier 能收到 payload
* 返回统一结果结构

## 8.3 第三优先：web 只做最小适配

### 目标

尽量少改 UI，只在必要时适配 API 真实接 core 后产生的小差异。

### 要求

* 不扩新的 UI 能力
* 不引入复杂状态管理
* 不新增新的前端领域模型
* 以稳定使用真实 API 为主

## 8.4 当前阶段暂时不要做的事

以下事项先记账，但不应成为当前第一优先：

* 自由正文保留修复
* Windows 原子写回补强
* recurring 完整自动推进闭环
* 真实模型接入
* 真实系统通知增强
* 真实 ChatBridge 自动化
* LLM 每心跳真实参与的完整联动
* 复杂记忆压缩和长期自主行为增强

---

## 9. 建议的新指挥官工作方式

## 9.1 接手后的第一步

先确认仓库真实状态，而不是假设对话状态一定等于仓库状态。

建议先执行：

```bash
git worktree list
git branch -a
git status
git log --graph --oneline --decorate --all -n 50
```

## 9.2 接手后的第二步

先读关键文件，建立统一认知：

1. `docs/contracts.md`
2. `docs/architecture.md`
3. `data/HEARTBEAT.md`
4. `packages/shared/src/types.ts`
5. `packages/core/*`
6. `apps/api/*`
7. `apps/web/*`
8. `packages/integrations/*`

如果仓库中已存在以下文件，也应优先阅读：

* `CLAUDE.md`
* `docs/agent-context.md`
* `docs/handoff-*.md`
* `docs/agent-notes/*.md`

## 9.3 接手后的第三步

不要直接继续大开发，先判断项目当前处于哪个真实基线：

* 是否已经 merge 到统一集成分支
* 是否已经 push 远程
* `apps/api` 是否仍然是 mock
* heartbeat 是否已经接 notifier
* shared/core/web/integrations 是否仍一致

## 9.4 指挥 3 个 agent 的建议方式

推荐分工仍然保持清晰边界：

### core agent

负责：

* core service / facade
* TaskStore API 对接
* heartbeat 通知负载准备

### web/api agent

负责：

* apps/api 对接 core
* apps/web 最小适配
* 不扩 UI

### integrations agent

负责：

* `NotifyPayload[] -> NotifierRouter`
* 结果结构统一
* 不扩 provider/chat automation

## 9.5 验收方式

不要只看“代码写了多少”，要看：

* 是否仍坚持 shared 真源
* 是否仍通过 core 统一操作 Markdown
* 是否减少了 mock 与真实逻辑的分叉
* 是否形成了更真实的数据闭环

## 9.6 避免上下文漂移的方法

建议新指挥官强制执行：

* 每轮结束写 handoff
* 每个 agent 写自己的 agent note
* 不依赖网页聊天上下文当唯一记忆
* 重要状态必须落到 repo 文档里

---

## 10. 建议先查看的关键文件清单

以下文件/目录是新指挥官接手时建议优先查看的内容：

### 项目契约与架构

* `docs/contracts.md`
* `docs/architecture.md`

### 数据真源

* `data/HEARTBEAT.md`
* `data/MEMORY.md`
* `data/USER.md`
* `data/SOUL.md`

### 共享类型

* `packages/shared/src/types.ts`
* `packages/shared/src/index.ts`

### 核心逻辑

* `packages/core/src/heartbeat-markdown.ts`
* `packages/core/src/task-store.ts`
* `packages/core/src/heartbeat.ts`
* `packages/core/src/recurrence.ts`
* `packages/core/src/cli/heartbeat-once.ts`

### 前后端

* `apps/api/src/index.ts`
* `apps/web/src/App.tsx`
* `apps/web/src/main.tsx`
* `apps/web/src/index.css`

### integrations

* `packages/integrations/src/provider/*`
* `packages/integrations/src/notifier/*`
* `packages/integrations/src/chatbridge/*`
* `packages/integrations/src/demo/smoke.ts`

### 测试与样例

* `tests/core.test.mjs`
* `tests/fixtures/heartbeat-roundtrip.md`

### 如仓库已存在，则优先补读

* `CLAUDE.md`
* `docs/agent-context.md`
* `docs/handoff-*.md`
* `docs/agent-notes/*.md`

---

## 11. 当前阶段的建议优先顺序

### Priority 1

让 `apps/api` 真接 `packages/core`

### Priority 2

让 `heartbeat:once` 真接 `NotifierRouter`

### Priority 3

让 `apps/web` 以最小改动继续工作

### Priority 4

统一 web 与 core 的运行态分组语义

### Priority 5

再考虑补自由正文保留与 Windows 写回强化

---

## 12. 接手建议摘要

Open Memo 当前不是从零开始，而是已经完成了一个清晰的 Phase-1 基础盘：

* core 已有 parser / store / heartbeat once
* web/api 已有可运行控制台
* integrations 已有抽象骨架
* 基础手动验证已通过

当前最重要的不是继续铺新能力，而是：

1. 把 mock 替换成真实 core 数据流
2. 把 heartbeat 接入 notifier router
3. 保持 shared 真源和边界清晰
4. 不让项目偏离“轻量、本地、Markdown 真源”的核心路线

新指挥官接手后，应先确认仓库真实状态，再以统一集成基线继续推进，不要在旧分支和旧假设上继续横向扩张。
