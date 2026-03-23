# Agent Note - minimax

## 基本信息

- **模型**: MiniMax-M2.7
- **会话开始时间**: 2026-03-23
- **Agent ID**: minimax
- **分支/Worktree**: `feat/integrations-m0` (从 `master` 拉出的 worktree)
- **会话状态**: 已完成，代码已提交

---

## 项目背景

### Open Memo 是什么
Open Memo 是一个任务提醒系统，使用 Markdown 文件作为数据源，通过心跳(heartbeat)机制驱动任务调度和通知。

### Monorepo 结构
```
open-memo/
├── apps/
│   ├── api/         # @open-memo/api - API 服务
│   └── web/         # @open-memo/web - Web 界面
├── packages/
│   ├── core/        # @open-memo/core - 核心引擎（解析、存储、调度）
│   ├── integrations/ # @open-memo/integrations - 集成层（本 Agent 负责）
│   └── shared/       # @open-memo/shared - 共享类型定义
├── data/            # Markdown 任务源文件
├── docs/            # 文档
└── scripts/         # 构建脚本
```

### 本轮职责边界
- 负责 `packages/integrations`
- 必须复用 `packages/shared` 类型
- 不得修改 core 的任务规则
- 不得实现 web/ui
- 不得接入完整业务流程

### M0 Phase-1 目标
把未来会接入的模型、通知、ChatBridge 抽象先搭好，并做最小 smoke/stub，供后续核心引擎调用。

---

## 本轮完成内容

### 1. ProviderAdapter 抽象

**接口来源**: 严格复用 `@open-memo/shared` 中的 `ProviderAdapter` 接口，不自行定义。

```typescript
// @open-memo/shared 中的接口（复用）
export interface ProviderAdapter {
  generateStructured<TResult, TSchema = unknown>(
    request: ProviderStructuredRequest<TSchema>
  ): Promise<TResult>;
  chatWithTools(
    request: ProviderChatRequest,
    toolResults?: ProviderToolResult[]
  ): Promise<ProviderChatResponse>;
}
```

**实现的 Adapter**:

| 文件 | 类名 | 用途 |
|------|------|------|
| `provider/openai-compatible.ts` | `OpenAICompatibleAdapter` | 支持 OpenAI 兼容格式的 API（如 LocalAI、Azure OpenAI 等） |
| `provider/anthropic.ts` | `AnthropicAdapter` | 支持 Anthropic Claude API 格式 |

**两个 Adapter 的异同**:
- 都实现了 `ProviderAdapter` 接口
- `OpenAICompatibleAdapter` 有 `baseUrl` + `apiKey` 配置
- `AnthropicAdapter` 有 `apiKey` + `maxTokens` 配置
- 当前均为 stub，打印日志后返回硬编码响应

**配置接口**:
```typescript
// openai-compatible.ts
export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

// anthropic.ts
export interface AnthropicConfig {
  apiKey: string;
  defaultModel?: string;
  maxTokens?: number;
}
```

---

### 2. NotifierRouter 抽象

**核心功能**: 根据 `NotifyPayload.channel` 将通知路由到对应的 notifier。

```typescript
// @open-memo/shared 中的类型（复用）
export type NotificationChannel = "system" | "browser" | "ai_chat";

export interface NotifyPayload {
  taskId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  urgency: NotificationUrgency;
  deepLink: string | null;
  dedupeKey: string;
}
```

**NotifierRouter 实现**:

```typescript
export class NotifierRouter {
  constructor(config: NotifierRouterConfig = {})

  async route(payload: NotifyPayload): Promise<NotificationResult>
  async routeBatch(payloads: NotifyPayload[]): Promise<NotificationResult[]>
  getNotifier(channel: NotificationChannel)
  getSummary(): { channels: NotificationChannel[]; enabled: Record<NotificationChannel, boolean> }
}
```

**channel 分发逻辑**:
```typescript
switch (payload.channel) {
  case "system":   → SystemNotifier.send(payload)
  case "browser":   → BrowserNotifier.send(payload)
  case "ai_chat":  → AiChatNotifier.send(payload)
  default:         → 返回 { success: false, error: "Unknown channel: ..." }
}
```

**路由结果**:
```typescript
export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}
```

**关键设计决策**:
- `routeBatch` 逐条独立执行，一条失败不影响其他
- 使用 `never` 穷举检查确保 `NotificationChannel` 枚举完整
- 每个 notifier 独立配置 `enabled` 状态

---

### 3. 三类 Notifier Stub

#### SystemNotifier
- 用途: OS 原生通知
- 配置: `SystemNotifierConfig { enabled: boolean; defaultUrgency?: NotificationUrgency }`
- 当前实现: 只打印日志，无真实 OS 通知调用

#### BrowserNotifier
- 用途: Web Push / in-app 浏览器通知
- 配置: `BrowserNotifierConfig { enabled: boolean; platformConfig?: Record<string, unknown> }`
- 当前实现: 只打印日志，无 Web Push / Notification API 调用

#### AiChatNotifier
- 用途: AI 对话上下文注入
- 配置: `AiChatNotifierConfig { enabled: boolean; includeInAiContext?: boolean }`
- 当前实现: 只打印日志，无真实 AI 上下文注入

---

### 4. ChatBridgeRegistry

**类型定义** (新增于 `chatbridge/types.ts`):
```typescript
export type ChatPlatform = "feishu" | "slack" | "discord" | "telegram" | "custom";

export interface ChatMessage {
  id: string;
  platform: ChatPlatform;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatBridgeAdapter {
  readonly platform: ChatPlatform;
  readonly enabled: boolean;
  sendMessage(channelId: string, content: string, options?: { threadId?: string; metadata?: Record<string, unknown> }): Promise<void>;
  getConfigSchema(): Record<string, unknown>;
}

export interface ChatBridgeConfig {
  platform: ChatPlatform;
  enabled: boolean;
  config: Record<string, unknown>;
}
```

**Registry 实现**:
```typescript
export class ChatBridgeRegistry {
  register(adapter: ChatBridgeAdapter): void
  unregister(platform: ChatPlatform): void
  get(platform: ChatPlatform): ChatBridgeAdapter | undefined
  getRegisteredPlatforms(): ChatPlatform[]
  has(platform: ChatPlatform): boolean
  getSummary(): Array<{ platform: ChatPlatform; enabled: boolean }>
  createStubAdapter(platform: ChatPlatform): ChatBridgeAdapter
}
```

**边界约束**:
- 仅负责 adapter 注册/获取/枚举
- 不做站点识别
- 不做浏览器自动化
- 不做页面注入

**createStubAdapter** 返回:
```typescript
{
  platform,        // 传入的 platform
  enabled: true,
  async sendMessage(channelId, content) {
    console.log(`[${platform}Stub] Sending to ${channelId}: ${content}`);
  },
  getConfigSchema() { return {}; }
}
```

---

### 5. Smoke Test

**文件**: `packages/integrations/src/demo/smoke.ts`

**运行方式**:
```bash
pnpm smoke
```

**执行链路**:
```
构造 NotifyPayload → 注入 NotifierRouter → 路由到对应 notifier → 输出 NotificationResult
```

**具体步骤**:
1. 手动构造一个 `channel: "system"` 的 `NotifyPayload`
2. 创建 `NotifierRouter`（三个 notifier 均 `enabled: true`）
3. 调用 `router.route(mockPayload)` → 触发 `SystemNotifier.send()`
4. 打印 `NotificationResult: { channel: "system", success: true }`
5. 再以相同 payload 路由到 `browser` 和 `ai_chat` 通道（验证 channel 分发）

**实际输出**:
```
============================================================
Open Memo Integrations - Smoke Test
============================================================

1. Created NotifyPayload:
{
  "taskId": "task-001",
  "title": "Review PR #42",
  "body": "PR #42 is waiting for your review. Priority: P1",
  "channel": "system",
  "urgency": "high",
  "deepLink": "https://github.com/org/repo/pull/42",
  "dedupeKey": "pr-42-review-reminder"
}

2. NotifierRouter initialized:
{
  "channels": ["system", "browser", "ai_chat"],
  "enabled": { "system": true, "browser": true, "ai_chat": true }
}

3. Routing notification through NotifierRouter...

[SystemNotifier] Sending notification:
  Title: Review PR #42
  Body: PR #42 is waiting for your review. Priority: P1
  Urgency: high
  Channel: system
  DedupeKey: pr-42-review-reminder

4. Routing result:
{ "channel": "system", "success": true }

------------------------------------------------------------
Testing all three channels:
------------------------------------------------------------

Routing to "system" channel:
[SystemNotifier] Sending notification: ...
Result: {"channel":"system","success":true}

Routing to "browser" channel:
[BrowserNotifier] Sending notification: ...
Result: {"channel":"browser","success":true}

Routing to "ai_chat" channel:
[AiChatNotifier] Sending notification: ...
Result: {"channel":"ai_chat","success":true}

============================================================
Smoke test completed successfully!
============================================================
```

**未覆盖范围**:
- ProviderAdapter 的调用路径（smoke 中未实例化或调用任何 ProviderAdapter）
- ChatBridgeRegistry 的实际使用（smoke 中未涉及）

---

## 文件变更清单

### 新建文件 (13个)

```
packages/integrations/src/
├── provider/
│   ├── openai-compatible.ts   # OpenAICompatibleAdapter stub 实现
│   ├── anthropic.ts           # AnthropicAdapter stub 实现
│   └── mod.ts                # provider 模块导出聚合
├── notifier/
│   ├── system.ts             # SystemNotifier stub
│   ├── browser.ts            # BrowserNotifier stub
│   ├── ai-chat.ts            # AiChatNotifier stub
│   ├── router.ts             # NotifierRouter 核心路由实现
│   └── mod.ts                # notifier 模块导出聚合
├── chatbridge/
│   ├── types.ts              # ChatBridge 类型定义（ChatPlatform, ChatBridgeAdapter 等）
│   ├── registry.ts           # ChatBridgeRegistry 注册中心实现
│   └── mod.ts                # chatbridge 模块导出聚合
└── demo/
    └── smoke.ts              # 最小 smoke 测试入口

docs/agent-notes/
└── minimax.md                # 本 Agent 记忆文件
```

### 修改文件 (4个)

| 文件 | 变更内容 |
|------|---------|
| `packages/integrations/src/index.ts` | 扩展导出，添加 ProviderAdapter/Notifier/ChatBridge 相关导出 |
| `packages/integrations/package.json` | 添加 `"@open-memo/shared": "workspace:*"` 依赖 |
| `packages/integrations/tsconfig.json` | 添加 `"lib": ["ES2022", "DOM"]` 以支持 console |
| `package.json` | 添加 `"tsx": "^4.19.0"` 依赖和 `"smoke"` 脚本 |

---

## 遇到的问题与解决

### 1. TypeScript 编译错误 - console 不存在
**问题**: 初始 tsconfig 只有 `lib: ["ES2022"]`，`console` 是 DOM API，不在 ES2022 中。
**解决**: 添加 DOM 到 lib: `["ES2022", "DOM"]`

### 2. 模块解析错误 - @open-memo/shared 找不到
**问题**: 使用 `paths` 映射指向 `../shared/src/index` 导致 shared 的 tsconfig 冲突。
**解决**: 使用 pnpm workspace 依赖 `"@open-memo/shared": "workspace:*"` 代替 paths 映射。

### 3. ESM 模块导入错误
**问题**: smoke.ts 中 import 使用相对路径 `../notifier/router`，运行时 Node.js ESM 解析失败。
**解决**: 改为从包入口 `../index` 导入，并使用 `tsx` 直接运行 TS 源码。

### 4. Git commit message 简写问题
**问题**: 用户要求用中文 commit message，但 bash heredoc 语法导致解析失败。
**解决**: 先写入临时文件，再用 `--file` 参数传入 commit message。

---

## 核心实现决策记录

### 为什么复用 @open-memo/shared 中的 ProviderAdapter？
避免重复定义接口，保持 core 和 integrations 对同一接口的引用一致。
shared 中的 ProviderAdapter 定义：
```typescript
export interface ProviderAdapter {
  generateStructured<TResult, TSchema = unknown>(request: ProviderStructuredRequest<TSchema>): Promise<TResult>;
  chatWithTools(request: ProviderChatRequest, toolResults?: ProviderToolResult[]): Promise<ProviderChatResponse>;
}
```

### 为什么 ChatBridgeRegistry 不做站点识别？
职责边界清晰原则。Registry 只负责"注册-获取"，站点识别是后续具体 adapter 实现的责任。

### 为什么 BrowserNotifier 的 ServiceWorkerRegistration 被移除？
最初设计想包含 ServiceWorkerRegistration 类型，但 tsconfig 当时未加 DOM lib，且该类型是浏览器特有的，不适合放在通用配置中。改为 `platformConfig?: Record<string, unknown>` 更灵活。

### 为什么 smoke 测试不覆盖 ProviderAdapter？
smoke 的目的是验证 NotifierRouter 的路由能力，不是 ProviderAdapter。ProviderAdapter 的真实调用需要 core 提供调度上下文（HeartbeatDecision），属于下一轮的工作。

---

## 运行命令

```bash
# 安装依赖（首次或 lock 变更后）
pnpm install

# 构建所有包（顺序：shared → core → integrations → api → web）
pnpm build

# 运行 smoke 测试
pnpm smoke

# 类型检查
pnpm typecheck
```

---

## 验收问答（用户确认通过）

### 1. shared 复用情况
- ProviderAdapter、NotifyPayload、NotificationChannel 等核心类型：直接复用
- integrations 内私有类型：OpenAICompatibleConfig、AnthropicConfig、各 notifier 配置接口、ChatPlatform 等
- 无重复定义 shared 中已有的核心模型

### 2. NotifierRouter 行为语义
- `route(payload)`：根据 channel 分发到对应 notifier
- channel 无对应 notifier：default 返回 `{ success: false, error: "Unknown channel" }`
- `routeBatch(payloads)`：逐条独立执行，一条失败不影响其他

### 3. ChatBridgeRegistry 当前边界
- 仅负责 adapter 注册/获取/枚举
- 无站点识别、无浏览器自动化、无页面注入
- `createStubAdapter(platform)`：返回只有 console.log 的最小 stub

### 4. smoke 入口证明范围
- 真实构造了 NotifyPayload 并走过 NotifierRouter
- 输出结构：`{ channel: NotificationChannel, success: boolean, error?: string }`

---

## 后续关注点（用户记录）

1. **NotificationResult 形状**：后续 core/integrations 联调时需保持统一
2. **ProviderAdapter stub**：下一轮接 core 时补真实 schema/response 验证

---

## 已知限制 / 技术债

1. ProviderAdapter stubs 返回硬编码 stub 响应，无真实 schema 验证
2. BrowserNotifier 当前无任何 Web Push / Notification API 实现
3. ChatBridgeRegistry 的 stub adapter 只有 `console.log`，无真实通信能力
4. smoke 未覆盖 ProviderAdapter 调用路径（留待 M1 接 core 时验证）
5. 所有 notifier 的 sendBatch 实现是简单的 for 循环，未做并发优化

---

## 提交记录

- **Commit**: `657e8e9`
- **Message**: `feat(integrations): 实现 M0 集成层抽象 - ProviderAdapter、NotifierRouter、ChatBridge stubs`
- **Files**: 18 files changed, 1042 insertions(+), 4 deletions(-)
- **Date**: 2026-03-23 11:18:14 +0800

---

## 建议下一步

等 core 侧有调度 `HeartbeatDecision.notifications` 的需求时，再将 `NotifierRouter` 接入 core 的心跳循环。

具体而言：
1. core 的 HeartbeatDecision 产生 NotifyPayload[]
2. 将 NotifyPayload[] 传入 NotifierRouter.routeBatch()
3. 验证 NotificationResult[] 的返回形状与 core 期望一致

当前 abstract boundary 足够，不需要扩范围。

---

## 恢复工作的 Prompt

> "恢复 integrations-m0 worktree，继续 M0 Phase-1 的下一轮集成。当前状态：NotifierRouter/ProviderAdapter stubs 已就绪，smoke 测试通过，代码已提交到 657e8e9。下一轮目标是将 NotifierRouter 接入 core 的心跳调度，验证 HeartbeatDecision -> NotifyPayload -> NotificationResult 链路。注意：ChatBridgeRegistry 暂不扩范围，ProviderAdapter 的真实 schema 验证也留待后续。"

---

## 注意事项（给接手的 Agent）

1. **不要擅自扩大范围**：用户明确要求保持抽象稳定，不做复杂实现
2. **不要接入真实 API**：所有 stub 都是 mock，不接真实 key
3. **不要改 core**：职责边界是 integrations，不要动 packages/core
4. **不要做 web/ui**：integrations 是底层抽象，不做界面
5. **如果不确定就问**：用户在会话中，明确要求了才动
