# Core Follow-ups

本文档记录 `packages/core` 在 M0 Phase-1 之后已确认、但暂未在本轮继续展开的后续修复项。

## P1-1 保留任务块自由正文说明

现状：

- `renderer / saveTasks / updateTask` 对 schema 外内容不是保留式更新。
- `HEARTBEAT.md` 任务块中的自由正文备注会在重渲染后丢失。
- `Task` 对象上的未知字段不会被保留回写。

后续目标：

- 至少保留任务块内 YAML 之外的自由正文说明。
- 明确 schema 外字段的保留策略，避免无意丢失人工编辑内容。

## P1-2 Windows 原子写回补强

现状：

- 当前实现使用同目录 temp file + rename。
- 当前假设同目录 rename 可直接替换目标文件。
- 未处理目标文件占用、替换失败、重试或回退。

后续目标：

- 做到 Windows-first 的稳健原子写回。
- 明确已有目标文件时的替换语义与失败处理策略。

## 其他 follow-ups

1. 明确 recurring task 的推进 / rollover 语义。
2. 增补 `waiting_ack`、`create/delete`、`recurrence helper`、异常路径测试。
