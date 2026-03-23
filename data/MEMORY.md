# MEMORY

## Long-Term Facts

- 用户常住时区为 `Asia/Shanghai`。
- 工作日早上 9 点前通常不希望收到长消息。
- 每周日晚上适合做复盘和下周规划。

## Commander Memory (mimo-v2-pro)

### 用户偏好与规则

- 用户说"读读"时，只读不动手，不擅自开始干活。
- 用户说"简短回答"时，该次提问简短回答，之后恢复正常的详细回答。
- 做决定要向用户说明，申请用户同意后才执行。
- 用户倾向方案 A（让一个 agent 做多件事，减少冲突），而非串行。
- 用户希望 worktree 复用而非每次新建，避免重新读取大量上下文。
- 用户希望我持续记录重要信息到 MEMORY.md。

### Agent 协作关键教训

#### Phase-2 HEARTBEAT.md 数据事故（2026-03-23）
- codex 验收时通过 TaskStore 的 save/update 操作触发了 P1-1 自由正文丢失。
- 5 个任务块的人类备注被 canonical render 吃掉。
- 我（指挥官）在合并前手动 `git checkout` 恢复了原文件。
- 教训：验收时应先备份数据文件，或用独立的测试文件而非真实数据。

#### 不要假设恢复了就是真的恢复了
- codex 声称"HEARTBEAT.md 临时改动已恢复"，但实际残留了问题（自由正文丢失 + 测试任务未清理）。
- 必须亲自验证 git diff，不能只听 agent 汇报。

#### Worktree 有未提交改动时 git graph 看不到
- codex 和 gemini 在 Phase-2 中改了代码但没有 commit，导致 git graph 显示分支指向同一个 commit。
- 解决：先用 `git worktree list` + 各 worktree 的 `git status` 检查。

### Phase 关键决策记录

#### Phase-2 方案 A（2026-03-23）
- 问题：codex 和 minimax 都要改 apps/api/src/index.ts，同文件冲突。
- 决策：让 codex 一个人把两件事都做（api→core + heartbeat→notifier），minimax 只做 review。
- 原因：方案 B（严格串行）太慢，方案 A 更高效。

#### Phase-3 旧指挥官 5 条修正（2026-03-23）
- bodyText 原样保留（不 trim、不规范化）。
- waiting_ack 先补契约再补测试（语义还不确定）。
- 分组统一锁定为 API 出口（web 不直接 import core）。
- Windows 写回：绝不删除原文件做 fallback（数据丢失风险）。
- P3 目标表述收敛为"稳定化"（不含真实 notifier）。

### 已知技术风险

- Task 类型新增 bodyText 字段会影响所有使用 Task 的模块，但因为是可选字段，不处理的地方不会报错。
- Windows 上 atomicWriteFile 的 rename 可能因文件占用失败，P1-2 已计划补强。
- canonical render 丢失自由正文是 TaskStore 的核心缺陷，任何 save/update 操作都会触发。

### 容易出错的点

- bash 中文编码问题：commit message 含中文时 bash 解析失败，用 `git commit -F file.tmp` 解决。
- Windows 路径分隔符：git bash 对反斜杠解析有问题，用正斜杠或 workdir 参数。
- worktree remove 时目录非空会失败，用 `git worktree prune` 清理。
