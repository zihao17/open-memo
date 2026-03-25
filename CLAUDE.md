# Open Memo - Claude Code Project Memory

## Project
Open Memo is a Windows-first, local-first, ultra-light personal memo and reminder agent.

## Core principles
- Markdown is the source of truth.
- All important data stays local.
- HEARTBEAT.md is the editable task storage layer.
- Deterministic scheduling first, LLM second.
- Keep the runtime lightweight and short-lived.
- Do not introduce heavy frameworks or unnecessary infra.

## Current architecture
- packages/core: parser, task store, heartbeat, recurrence
- apps/web + apps/api: local web console and mock/local API
- packages/integrations: provider adapters, notifier router, chatbridge registry

## Guardrails
- Do not redesign the project into a large agent platform.
- Do not add Electron.
- Do not add a database.
- Do not bypass Markdown storage.
- Do not create duplicate domain models outside shared.
- Keep Windows-first behavior in mind.

## Current development phase
M0 Phase-3 completed.
Next step is M0 Phase-4: 让提醒真正发生。

## Phase-4 priorities
1. Windows Toast 通知（SystemNotifier 从 stub 改为真实通知）
2. Heartbeat 循环进程（定时唤醒扫描）
3. Recurring 自动推进（heartbeat 完成后推进 recurring task）
4. 前端无感适配
5. Integrations review

## Roadmap
P1→P2→P3 完成（基础→接线→稳定化）
P4：让提醒真正发生
P5：让 AI 聊天可用
P6：产品化打磨
详见 docs/roadmap.md