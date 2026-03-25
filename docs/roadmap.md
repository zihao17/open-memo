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
| Windows Toast 通知 | codex | SystemNotifier 从 stub 改为真实 Windows 原生通知 |
| Heartbeat 循环进程 | codex | 短命进程定时唤醒扫描，不是 daemon |
| Recurring 自动推进 | codex | heartbeat 完成后自动将 recurring task 推进到下一次 |
| 前端适配 | gemini | 无大的 UI 变化，确认不影响现有功能 |
| review | minimax | 审查 integrations 在真实通知场景下的兼容性 |

**依赖关系**：Windows 通知是核心，heartbeat 循环依赖通知链路，recurring 是独立的。

**验收标准**：
- 创建一个 1 分钟后的任务 → 1 分钟后 Windows 弹出通知
- 创建一个 daily recurring 任务 → 完成后自动推进到明天
- 能通过 `pnpm heartbeat:loop` 启动定时扫描

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

### P4-1：Windows Toast 通知（codex 负责）

当前 `packages/integrations/src/notifier/system.ts` 是 stub（只有 console.log）。

改造为：
- 使用 `node-notifier` 或 Windows 原生 `powershell` 命令弹出 Toast 通知
- payload.title → 通知标题
- payload.body → 通知正文
- payload.urgency → 控制通知优先级

### P4-2：Heartbeat 循环进程（codex 负责）

新增 `packages/core/src/cli/heartbeat-loop.ts`：
- 读取 HEARTBEAT.md
- 调用 runHeartbeat() 计算下次唤醒时间
- 用 setTimeout 等待
- 到点唤醒，重新扫描
- 收到 SIGINT 时优雅退出

配套新增 package.json script：`"heartbeat:loop": "pnpm build && node packages/core/dist/cli/heartbeat-loop.js"`

### P4-3：Recurring 自动推进（codex 负责）

当前 `runHeartbeat()` 返回 `taskMutations` 但永远是空数组。

改造为：
- heartbeat 检测到 recurring task 过期后，生成 mutation：推进 dueAt 到下一次
- heartbeat-loop 在每轮扫描后应用 mutations（通过 TaskStore.updateTask）

### P4-4：前端无感适配（gemini 负责）

确认以上改动不影响现有 Web 功能。如有差异做最小适配。

### P4-5：Integrations review（minimax 负责）

审查 SystemNotifier 从 stub 改为真实实现后，对 NotifierRouter / ProviderAdapter 的影响。

### Worktree 复用

继续用 p2-core、p2-web worktree。
