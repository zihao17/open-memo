# Open-Memo

> 一个 24 小时在线的 AI 备忘录

Open-Memo 是一个精简的 AI 备忘录，能够主动提醒日常安排，交流任务进度，并提供调整建议。

## 功能

- **24小时主动提醒**（支持 Web 端系统消息，未来将接入微信）
- **自然语言理解**
- **任务进度交流**
- **智能调整建议**

## Bootstrap

当前仓库已整理为一个最小可运行的 pnpm monorepo 基线，优先提供：

- `docs/contracts.md`：统一数据契约与边界
- `data/HEARTBEAT.md`：Markdown 样例任务数据
- `packages/shared`：共享 TypeScript 类型壳

## Development

```bash
pnpm install
pnpm typecheck
pnpm build
```
