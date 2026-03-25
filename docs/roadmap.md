# Open Memo 项目路线图

## 当前状态（P3 完成后）

项目已完成"能跑"的阶段：
- ✅ 数据存储：HEARTBEAT.md 真源 + TaskStore CRUD
- ✅ Web 界面：双栏布局 + 任务分组（Today/Overdue/Snoozed/Done）
- ✅ 心跳评估：能判断 due/overdue/snoozed/waiting_ack
- ✅ 通知链路：heartbeat → NotifierRouter（但全是 stub，不弹通知）
- ✅ 数据安全：bodyText 保留 + Windows 写回增强
- ✅ 测试覆盖：14 个测试

**缺失的核心能力**：
- ❌ 用户收不到真实通知（stub 是假的）
- ❌ recurring 任务不会自动推进
- ❌ 没有自动定时扫描（只有手动触发）
- ❌ 左侧聊天面板是假的

---

## Phase 路线

### Phase-4：让提醒真正发生（核心承诺兑现）

**一句话**：用户设了提醒，到点能收到通知。

| 任务 | 负责人 | 说明 |
|------|--------|------|
| Windows Toast 通知 | minimax | SystemNotifier 从 stub 改为真实 Windows 原生通知 |
| Heartbeat 定时触发 | codex | 生产用 Windows 计划任务，开发调试用 heartbeat:loop |
| Recurring 自动推进 | codex | 任务完成/确认后才推进 dueAt，过期不自动滚走 |
| 前端适配 | gemini | 无大的 UI 变化，确认不影响现有功能 |
| review | minimax | 审查通知实现的接口兼容性 |

**依赖关系**：Windows 通知是核心，heartbeat 定时触发依赖通知链路，recurring 是独立的。

**验收标准**：
- 创建一个 1 分钟后的任务 → 1 分钟后 Windows 弹出通知
- 创建一个 daily recurring 任务 → 完成后自动推进到明天
- 本地可通过 `pnpm heartbeat:loop` 调试（dev only）

---

### Phase-5：让 AI 聊天可用（左侧面板）

**一句话**：左侧聊天面板从占位变成真实对话。

| 任务 | 负责人 | 说明 |
|------|--------|------|
| ProviderAdapter 真实实现 | minimax | OpenAI-compatible 和 Anthropic 从 stub 改为真实 API 调用 |
| 聊天面板接 AI | gemini | 左侧面板接真实模型，能对话 |
| 工具调用 | codex + minimax | AI 能通过工具调用操作任务（创建、查询、snooze） |
| config.json | codex | 支持配置文件（API key、模型选择等） |

**依赖关系**：ProviderAdapter 先真实实现，然后 web 接入。

**验收标准**：
- 左侧聊天能发消息、收到 AI 回复
- AI 能创建任务、查询今日任务
- 配置文件控制 API key 和模型

---

### Phase-6：产品化打磨

**一句话**：从"开发者工具"变成"用户可用的产品"。

| 任务 | 说明 |
|------|------|
| Windows 开机自启 | 注册为系统服务或开机启动项 |
| memory/YYYY-MM-DD.md 日志 | 自动创建每日日志文件 |
| MEMORY.md 记忆注入 | heartbeat 时将 MEMORY.md 关键信息注入 AI 上下文 |
| 通知去重优化 | 避免同一任务重复弹通知 |
| 通知静默时段 | USER.md 中定义的黑白名单生效（如深夜不弹通知） |
| UI 美化 | 参考 UI.md 完善视觉细节 |

---

## 路线图总览

```
P1 ✅ 基础引擎
P2 ✅ 模块接线
P3 ✅ 稳定化
  │
P4  📢 让提醒真正发生（Windows 通知 + heartbeat 循环 + recurring）
  │
P5  🤖 让 AI 聊天可用（ProviderAdapter + 聊天面板 + 工具调用）
  │
P6  🎯 产品化打磨（自启 + 日志 + 通知优化 + UI）
```

**核心原则不变**：
- Markdown 是真源
- 不引入 Electron / 数据库
- 轻量、本地、Windows-first

---

## P4 详细拆分（下一步执行）

### P4-1：Windows Toast 通知（minimax 负责）

当前 `packages/integrations/src/notifier/system.ts` 是 stub（只有 console.log）。

改造为真实 Windows 原生通知。开工前需锁定：
- 实现库选型（`node-notifier` / `win-toast-notifier` / PowerShell，择一）
- `NotificationResult` 的 success/failure 如何返回
- `urgency` 到 Windows 通知优先级的映射规则
- deep link 支持（Phase-4 先不支持，可留空）

职责边界：
- minimax：实现 SystemNotifier 真实通知 + NotifierRouter 结果结构维护
- codex：负责 heartbeat 输出、调度逻辑，不碰 integrations 代码

### P4-2：Heartbeat 定时触发（codex 负责）

**生产方案**：Windows 计划任务定时调用 `heartbeat:once`。
- 进程启动 → 读取 HEARTBEAT.md → 计算 → 发通知 → 退出
- 短命进程，非 daemon 常驻，符合项目"轻量"原则
- 由操作系统负责调度（Windows Task Scheduler 或类似机制）

**开发调试方案**：`heartbeat:loop`（仅 dev only）
- 新增 `packages/core/src/cli/heartbeat-loop.ts`
- `setTimeout` 常驻循环 + SIGINT 优雅退出
- 文档明确标注"仅用于开发调试，生产环境请使用计划任务"
- 配套 script：`"heartbeat:loop": "pnpm build && node packages/core/dist/cli/heartbeat-loop.js"`

### P4-3：Recurring 自动推进（codex 负责）

当前 `runHeartbeat()` 返回 `taskMutations` 但永远是空数组。

推进条件（旧指挥官修正）：
- recurring task **只有在完成或确认后**才推进 dueAt 到下一次
- 过期但未完成/确认的任务**不能**自动滚走，应继续显示为 overdue
- 具体语义：
  - `status=done` → 推进 dueAt，重置 status 为 active
  - `confirmRequired=true` 且用户已确认 → 推进 dueAt
  - 仅 overdue 而未完成/确认 → 不推进，继续 overdue

实现：
- heartbeat 在检测到 recurring task 被标记 done 或 acked 后，生成 taskMutation
- 应用层（heartbeat-loop 或 heartbeat:once 的后续步骤）通过 TaskStore.updateTask 应用 mutation

### P4-4：前端无感适配（gemini 负责）

确认以上改动不影响现有 Web 功能。如有差异做最小适配。

### P4-5：Integrations review（minimax 负责）

审查 SystemNotifier 从 stub 改为真实实现后，对 NotifierRouter / ProviderAdapter 的影响。

### Worktree 复用

继续用 p2-core、p2-web worktree。
