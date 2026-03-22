# Open Memo Contracts

本文档定义 Open Memo V1 bootstrap 阶段的统一契约。后续 agent 需要以此为单一来源，避免在 parser、UI、API、integrations 之间各自发明数据格式。

## 1. 核心设计原则

- Markdown is source of truth。持久任务状态以 `data/HEARTBEAT.md` 为准。
- 所有修改统一走 `parse -> Task object -> modify -> normalized render -> atomic write`。
- 调度和时间判断必须 deterministic scheduling；LLM 只用于 structured decisions 或 copy，不负责核心时序逻辑。
- Windows-first、local-first、short-lived heartbeat process。默认运行在本地 Windows 机器上，以短周期唤醒进程完成扫描与回写。
- 任何入口都不能直接对原始 Markdown 做局部字符串替换。

## 2. Task 数据模型

`Task` 是 V1 的核心持久对象，字段如下。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 稳定主键，供 UI/API/notification/dedupe 使用。 |
| `title` | `string` | 任务短标题，用于列表、通知标题。 |
| `detail` | `string` | 任务详细描述，可为空字符串但字段必须存在。 |
| `status` | `active \| paused \| done \| cancelled` | 持久状态。 |
| `priority` | `p0 \| p1 \| p2 \| p3` | 调度优先级，`p0` 最高。 |
| `dueAt` | `string \| null` | ISO 8601 时间戳；一次性任务和 recurring 任务都使用该字段表示下一次到期点。 |
| `timezone` | `string` | IANA 时区，例如 `Asia/Shanghai`。 |
| `recurrence` | `none \| daily \| weekly` | 简化版重复规则。 |
| `snoozeUntil` | `string \| null` | snooze 截止时间；为空表示未 snooze。 |
| `confirmRequired` | `boolean` | 是否需要显式确认完成。 |
| `channels` | `Array<system \| browser \| ai_chat>` | 允许的通知渠道集合。 |
| `tags` | `string[]` | 轻量标签，供筛选与提示词上下文使用。 |
| `createdAt` | `string` | 创建时间，ISO 8601。 |
| `updatedAt` | `string` | 最近一次持久修改时间，ISO 8601。 |
| `source` | `ui \| ai \| manual` | 最近一次主要来源。 |

约束：

- `status` 只表示持久状态，不承载运行态。
- `dueAt`、`snoozeUntil` 使用绝对时间，不使用相对表达。
- `channels` 是允许集合，不代表一定全部发送。
- `updatedAt` 由统一写回流程维护，不允许由 UI 任意伪造旧值。

## 3. TaskPatch 模型

`TaskPatch` 用于 UI / AI / API 请求修改任务。它是 patch only 模型，不允许入口直接提交整段 Markdown 或要求替换原始文本。

推荐结构：

```ts
type TaskPatch = {
  taskId: string;
  changes: Partial<EditableTaskFields>;
  source: "ui" | "ai" | "manual";
  requestedAt: string;
  reason?: string;
};
```

约束：

- 仅允许修改白名单字段，例如 `title`、`detail`、`status`、`priority`、`dueAt`、`recurrence`、`snoozeUntil`、`confirmRequired`、`channels`、`tags`。
- patch 目标是 `Task object`，不是原始 Markdown 文本。
- parser/store 层负责应用 patch、更新 `updatedAt`、规范化排序与渲染。

## 4. HeartbeatDecision 模型

`HeartbeatDecision` 是单次 heartbeat tick 的纯输出结果，供 scheduler、notifier 和 store 复用。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `now` | `string` | 当前 heartbeat 时间。 |
| `dueTaskIds` | `string[]` | 本轮应触发的任务 ID。 |
| `overdueTaskIds` | `string[]` | 已过期且仍未解决的任务 ID。 |
| `notifications` | `NotifyPayload[]` | 本轮建议发送的通知。 |
| `taskMutations` | `TaskMutation[]` | 本轮建议写回的任务 patch，例如 recurring 推进、ack 状态修正。 |
| `nextWakeAt` | `string` | 下一次建议唤醒时间。 |

要求：

- `HeartbeatDecision` 应尽量可重放、可测试。
- 计算逻辑只依赖配置、当前时间和解析后的 `Task[]`。

## 5. NotifyPayload 模型

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `taskId` | `string` | 关联任务 ID。 |
| `title` | `string` | 通知标题。 |
| `body` | `string` | 通知正文。 |
| `channel` | `system \| browser \| ai_chat` | 发送渠道。 |
| `urgency` | `low \| normal \| high \| critical` | 紧急程度。 |
| `deepLink` | `string \| null` | UI 深链，可为空。 |
| `dedupeKey` | `string` | 去重键，防止重复提醒。 |

## 6. ProviderAdapter 接口约定

`ProviderAdapter` 只定义职责，不在 bootstrap 阶段实现真实 provider。

职责：

- `generateStructured(...)`
  - 输入 prompt + schema + profile。
  - 输出经过 schema 约束的结构化结果。
  - 用于任务分类、通知文案草稿、候选 patch 建议等。
- `chatWithTools(...)`
  - 输入对话消息和可选工具定义。
  - 输出模型消息和工具调用意图。
  - 用于后续 AI 对话桥接，不负责持久写盘。

边界：

- Provider 不能绕过 `TaskPatch` 直接写 `HEARTBEAT.md`。
- Provider 不能承担 scheduler 判定逻辑。

## 7. `HEARTBEAT.md` 存储格式约定

V1 使用单文件存储任务：`data/HEARTBEAT.md`。

要求：

- 单文件，结构化任务块，Markdown 可读可编辑。
- 推荐格式为 `HTML 注释边界 + YAML fenced block`。
- 人工说明文本允许存在，但必须位于块边界内部或外部的稳定位置，不影响 parser。
- 所有入口统一经过 parser/render，不允许局部字符串替换。

推荐块结构：

````md
<!-- open-memo:task:start -->
```yaml
id: task-example
title: Example task
detail: Example detail
status: active
priority: p1
dueAt: 2026-03-22T09:00:00+08:00
timezone: Asia/Shanghai
recurrence: none
snoozeUntil: null
confirmRequired: false
channels:
  - system
tags:
  - sample
createdAt: 2026-03-22T08:30:00+08:00
updatedAt: 2026-03-22T08:30:00+08:00
source: manual
```
可选的人类说明文本
<!-- open-memo:task:end -->
````

渲染规则建议：

- 字段顺序固定，减少 diff 噪音。
- 每个任务块之间留单个空行。
- 未定义字段不扩散写入；bootstrap 阶段先保持最小 schema。

## 8. 状态与运行态说明

持久状态：

- `active`
- `paused`
- `done`
- `cancelled`

运行态：

- `upcoming`
- `due`
- `overdue`
- `snoozed`
- `waiting_ack`

说明：

- 运行态是 heartbeat 基于 `status`、`dueAt`、`snoozeUntil`、`confirmRequired` 和当前时间计算出的派生值。
- 运行态不直接写回持久 `status` 字段。
- 例如，一个 `status=active` 且 `confirmRequired=true`、已过 `dueAt` 但未确认的任务，运行态可被计算为 `waiting_ack`。

## 9. 未来各 agent 边界

- `packages/core`
  - 负责 parser、store、heartbeat、scheduler。
  - 负责把 Markdown 转为 `Task[]`，以及把 patch 规范回写。
- `apps/web` / `apps/api`
  - 负责 UI、本地接口、任务操作入口。
  - 只能消费 shared contract，并提交 `TaskPatch`。
- `packages/integrations`
  - 负责 LLM、notifier、chatbridge adapter。
  - 负责外部能力接入，不拥有持久层规则。

边界原则：

- `core` 不依赖具体 UI 或 provider。
- `integrations` 不侵入 markdown parser/store。
- `web/api` 不直接编辑 `HEARTBEAT.md`。
