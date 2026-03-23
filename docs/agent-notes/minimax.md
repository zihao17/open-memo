# Agent Note - minimax

## Branch / Worktree
`feat/integrations-m0` (worktree off `master`)

## Scope
`packages/integrations` - LLM provider adapters, NotifierRouter, ChatBridgeRegistry

## Completed in this round

**M0 Phase-1 交付完成：**

1. **ProviderAdapter stubs** - `OpenAICompatibleAdapter` 和 `AnthropicAdapter`，实现了 `@open-memo/shared` 中的 `ProviderAdapter` 接口，均为 stub 状态（无真实 API 调用）

2. **NotifierRouter + 3 notifier stubs**
   - `NotifierRouter`：根据 `NotifyPayload.channel` 分发到对应 notifier
   - `SystemNotifier` / `BrowserNotifier` / `AiChatNotifier`：均为 stub，只有日志打印
   - `routeBatch` 逐条独立执行，一条失败不影响其他

3. **ChatBridgeRegistry**
   - 仅负责 adapter 注册/获取/枚举
   - `createStubAdapter(platform)` 返回最小打印日志的 stub
   - 无站点识别、无浏览器自动化

4. **smoke test** - `packages/integrations/src/demo/smoke.ts`
   - 构造 `NotifyPayload` → 注入 `NotifierRouter` → 输出 `NotificationResult`
   - 验证了 channel 分发到三个不同 notifier

5. **类型复用** - 严格复用 `@open-memo/shared` 中的 `ProviderAdapter`、`NotifyPayload`、`NotificationChannel` 等核心类型，无重复定义

## Files changed

**新建：**
```
packages/integrations/src/
├── provider/openai-compatible.ts
├── provider/anthropic.ts
├── provider/mod.ts
├── notifier/system.ts
├── notifier/browser.ts
├── notifier/ai-chat.ts
├── notifier/router.ts
├── notifier/mod.ts
├── chatbridge/types.ts
├── chatbridge/registry.ts
├── chatbridge/mod.ts
└── demo/smoke.ts
```

**修改：**
```
packages/integrations/src/index.ts        # 扩展导出
packages/integrations/package.json        # 添加 shared 依赖
packages/integrations/tsconfig.json       # 添加 DOM lib
package.json                             # 添加 tsx + smoke 脚本
```

## Key implementation choices

- **ProviderAdapter** 直接实现 `@open-memo/shared` 中的接口，不自行定义新接口
- **NotifierRouter** 用 `switch` + `never` 穷举确保 channel 枚举完整
- **ChatBridgeRegistry** 保持纯注册表职责，不做业务逻辑
- **smoke 测试** 用 `tsx` 直接跑 TS 源码，不依赖编译后的模块路径

## Known limitations

- ProviderAdapter stubs 返回硬编码 stub 响应，无真实 schema 验证
- BrowserNotifier 当前无任何 Web Push / Notification API 实现
- ChatBridgeRegistry 的 stub adapter 只有 `console.log`，无真实通信
- smoke 未覆盖 ProviderAdapter 调用路径（留待 M1 接 core 时验证）

## Run / verify

```bash
# 构建
pnpm build

# 运行 smoke 测试
pnpm smoke

# 类型检查
pnpm typecheck
```

smoke 预期输出：`NotifyPayload` 构造 → 三次 channel 路由 → `NotificationResult` 打印

## Integration notes

1. **NotifierRouter** 的 `NotificationResult` 形状需在 core/integrations 联调时保持对齐
2. **ProviderAdapter** 下一轮接 core 时需补真实 `schema/response` 验证链路
3. ChatBridge 暂不接入复杂站点实现，保持 registry 稳定即可

## Suggested next step

等 core 侧有调度 `HeartbeatDecision.notifications` 的需求时，再将 `NotifierRouter` 接入 core 的心跳循环。当前 abstract boundary 足够，无需扩范围。

## Resume prompt

"恢复 integrations-m0 worktree，继续 M0 Phase-1 的下一轮集成。当前状态：NotifierRouter/ProviderAdapter stubs 已就绪，smoke 测试通过。下一轮目标是将 NotifierRouter 接入 core 的心跳调度，验证 HeartbeatDecision -> NotifyPayload -> NotificationResult 链路。"
