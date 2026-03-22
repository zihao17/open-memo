# Open Memo Architecture

## 模块组成

- `data/`：Markdown 源数据与本地状态文件。
- `packages/shared`：跨包共享类型与契约镜像。
- `packages/core`：后续承载 parser、store、heartbeat、scheduler。
- `packages/integrations`：后续承载 LLM、通知器、聊天桥接 adapter。
- `apps/api`：本地接口壳。
- `apps/web`：前端入口壳。

## 数据流

`Markdown/config -> core parser/store -> Task objects -> heartbeat decision -> integrations/web/api -> TaskPatch -> core render -> atomic write`

## 心跳执行流程

1. 读取配置与 `data/HEARTBEAT.md`。
2. parser 解析为 `Task[]`。
3. scheduler 计算运行态、到期集合与 `HeartbeatDecision`。
4. integrations 根据 `notifications` 执行外部动作。
5. core 应用 `taskMutations`，规范重渲染并原子写回。

## UI 与 core 的关系

UI 和本地 API 只是任务操作入口。它们读取共享类型、构造 `TaskPatch`，但不直接操作 Markdown 文本，也不内嵌 heartbeat 规则。

## integrations 的职责位置

integrations 位于 core 与外部系统之间，负责 provider/notifier/chatbridge 的适配。它消费 core 的结构化输入输出，不定义持久 schema，也不越权写盘。
