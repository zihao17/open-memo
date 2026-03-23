# Open Memo Phase-3 规划

## 文档信息

- **阶段**：M0 Phase-3 稳定化
- **起草者**：指挥官 mimo-v2-pro
- **旧指挥官审核**：已采纳全部 5 条修正建议
- **基于分支**：`feat/m0-phase2-integration`
- **状态**：待启动

---

## 一、Phase-3 目标定义

**一句话**：数据安全、语义统一、测试补强、闭环更稳。

**聚焦稳定化，不包含以下内容**：
- 不接真实 provider / notifier（system notifier 仍为 stub，放到后续阶段）
- 不做新 UI 功能
- 不加 Electron / 数据库 / 复杂框架
- 不接真实 chat automation

**预期成果**：
- 任务块自由正文在读写后保留
- Web 分组语义与 core 统一
- 测试覆盖关键路径
- Windows 写回增强（有限重试，不损坏真源）

---

## 二、当前状况诊断

| 维度 | 状态 | 具体问题 |
|------|------|----------|
| 数据流通 | ✅ 已通 | Phase-2 已接通 api→core→heartbeat→notifier |
| 自由正文 | ❌ 丢失 | `renderTaskBlock()` 不输出 YAML 之外的文本，`parseTaskBlock()` 不捕获，HEARTBEAT.md 中人类备注会在 save/update 后消失 |
| 分组语义 | ❌ 分叉 | web 前端自己算 Today/Overdue，core 有独立 `runHeartbeat()` 运行态判断，两套逻辑不一致 |
| 测试覆盖 | ⚠️ 缺口 | 只有 3 个测试，未覆盖 waiting_ack、create/delete、recurrence、bodyText、异常路径 |
| Windows 写回 | ⚠️ 弱 | temp+rename 无重试，Windows 文件占用时直接抛错 |
| recurring | ❌ 未闭环 | helper 存在但 heartbeat 不自动推进，不属于 Phase-3 范围 |

---

## 三、任务清单

### 任务 1：修复自由正文丢失（P1-1）

**负责人**：codex

**问题根因**

`packages/core/src/heartbeat-markdown.ts` 中：
- `parseTaskBlock()`（第 109-118 行）只用正则提取 ` ```yaml ... ``` ` 内容，YAML fence 和 `<!-- end -->` 之间的自由文本被丢弃
- `renderTaskBlock()`（第 218-241 行）直接从 YAML fence 跳到 `TASK_BLOCK_END`，没有写回位置

**实现约束（旧指挥官修正 #1）**

`bodyText` 必须**原样保留**：
- 不做 `trim()`
- 不规范化空行
- 不重排缩进
- 多段文本、空行、列表缩进都应尽量保持稳定
- 测试中需覆盖：单行备注、多行备注、含空行的备注、含缩进列表的备注

**改动步骤**

Step A：在 `packages/shared/src/types.ts` 的 `Task` 接口中增加可选字段：
```ts
bodyText?: string;
```

Step B：修改 `parseTaskBlock()`，在提取 YAML fence 后，捕获 ` ``` ` 闭合到 `<!-- open-memo:task:end -->` 之间的原始文本（含换行），存入 `task.bodyText`。如果这段文本为空或只有空白，则设为 `undefined` 或空字符串。

Step C：修改 `renderTaskBlock()`，在 `YAML_FENCE_END` 后、`TASK_BLOCK_END` 前写回 `task.bodyText`。如果 `bodyText` 为空/undefined，则 YAML fence 和 end 标记之间不留多余内容。

Step D：修改 `validateTask()`，对 `bodyText` 做可选字符串校验（undefined 或 string 均可）。

Step E：在 `tests/core.test.mjs` 中新增 bodyText round-trip 测试：
- fixture 含自由正文的任务块
- parse → 修改 title → render → 重新 parse
- 断言 bodyText 仍然一致
- 覆盖多段、空行、缩进的情况

**验收标准**
- 修改任务标题后保存 → HEARTBEAT.md 中"补充说明：..."仍在
- 新增任务有 bodyText → 写入后刷新仍在
- 新增任务无 bodyText → 不产生多余空行或格式异常
- 原有 round-trip 测试继续通过

---

### 任务 2：补充测试覆盖

**负责人**：codex

**前置依赖**：任务 1 完成（bodyText 测试依赖 P1-1 修复）

**waiting_ack 语义先定义再测试（旧指挥官修正 #2）**

当前对 waiting_ack 的简单理解（"过期 + confirmRequired"）可能不准确。更精确的语义应该是"已经提醒过、需要确认但尚未确认"。

在补测试之前，先在 `docs/contracts.md` 中明确：
- `waiting_ack` 的**进入条件**：什么情况下任务进入此状态
- `waiting_ack` 的**退出条件**：什么情况下任务离开此状态（用户确认？超时？）
- `waiting_ack` 与 `due`/`overdue` 的关系

明确语义后再写对应的测试用例。

**需要补充的测试用例**

| 测试 | 验证内容 | 优先级 |
|------|----------|--------|
| `createTask` 写入 | 创建任务后 HEARTBEAT.md 增加 task block | 高 |
| `deleteTask` 写入 | 删除任务后 HEARTBEAT.md 移除 task block | 高 |
| `waiting_ack` 运行态 | 按明确定义的语义验证 | 中（待语义明确） |
| `snoozeUntil` 过期后 | snooze 时间已过 → 不再 suppress due/overdue | 中 |
| parser 格式错误 | 缺少 YAML fence → 抛出明确错误信息 | 中 |
| parser 字段缺失 | 缺少必需字段 → 抛出明确错误信息 | 中 |
| recurrence daily | `dueAt` 加 1 天，结果正确 | 中 |
| recurrence weekly | `dueAt` 加 7 天，结果正确 | 中 |
| recurrence none | 返回 null | 低 |
| bodyText round-trip | 任务 1 完成后补 | 高 |

**验收标准**
- `pnpm test` 通过，测试数量从 3 个增加到 12+ 个
- 每个测试有明确的 assert 断言
- 不引入额外测试依赖，继续用 `node:test`

---

### 任务 3：统一 web 与 core 的分组语义

**负责人**：gemini（前端适配）+ codex（core helper）

**方案锁定（旧指挥官修正 #3）**

唯一方案：API 出口统一，web 不直接 import core。

```
core: classifyTasks(tasks, now) → ClassifiedTasks
  ↓
api: GET /tasks/classified → 调用 classifyTasks，返回分好组的任务
  ↓
web: 消费 GET /tasks/classified，不再自己 filter
```

**两套逻辑的差异**

| 维度 | web 当前逻辑 | core 运行态逻辑 |
|------|-------------|----------------|
| Today | 未 done + 未 snooze + (dueAt>=now 或 日期=今天) 或无 dueAt | `due`（now - dueAt < 60s）|
| Overdue | 未 done + 未 snooze + dueAt<now 且日期不是今天 | `overdue`（now - dueAt >= 60s）|
| Snoozed | snoozeUntil > now 且未 done | `snoozed`（snoozeUntil > now）|
| Done | status=done | 不在运行态中（status=done 的任务不参与 heartbeat）|
| 特殊 | 无 | `waiting_ack`、`upcoming` |

**改动步骤**

Step A（codex）：在 `packages/core` 新增 `task-classifier.ts`：
```ts
export interface ClassifiedTasks {
  today: Task[];    // due 状态的任务
  overdue: Task[];  // overdue 状态的任务
  snoozed: Task[];  // snoozed 状态的任务
  done: Task[];     // status=done 的任务
  upcoming: Task[]; // upcoming 状态 + 无 dueAt 的 active 任务
}

export function classifyTasks(tasks: readonly Task[], now?: string): ClassifiedTasks
```

内部复用 `runHeartbeat()` 的运行态判断逻辑，按状态分组返回。

Step B（codex）：在 `apps/api` 新增路由：
```ts
app.get("/tasks/classified", async (req, res) => {
  const tasks = await taskStore.loadTasks();
  const classified = classifyTasks(tasks);
  res.json(classified);
});
```

Step C（gemini）：修改 `apps/web/src/App.tsx`：
- 删除前端自己的 filter 逻辑（第 102-128 行）
- 新增 `fetchClassifiedTasks()` 调用 `GET /tasks/classified`
- 直接使用返回的分组结果渲染列表
- 保持 UI 样式和交互不变

**验收标准**
- Web 页面显示的分组与 `pnpm heartbeat:once` 输出一致
- 刷新后分组仍然正确
- UI 样式和交互没有变化，只是数据来源变了

---

### 任务 4：补强 Windows 原子写回（P1-2）

**负责人**：codex

**改动方案（旧指挥官修正 #4，已移除不安全的 fallback）**

当前 `packages/core/src/task-store.ts` 的 `atomicWriteFile()`（第 99-122 行）：
- 写 temp → fsync → rename
- rename 失败直接抛错

**增强为**：
- 写 temp → fsync → rename
- 遇到 `EPERM`/`EBUSY` 等错误：有限次数退避重试（最多 3 次，间隔递增 100ms/200ms/300ms）
- 重试期间如果 rename 失败：**不删除原文件**，直接重试 rename
- 最终仍失败：明确报错退出，附带原始错误信息
- 重试过程中清理失败产生的 temp 文件

**关键约束**：
- **绝不主动删除原文件**（HEARTBEAT.md 是唯一真源）
- 宁可失败报错，也不损坏真源

**验收标准**
- `pnpm test` 继续通过
- 在 Windows 上手动验证：API 运行时写入 HEARTBEAT.md 不报错
- 重试逻辑有单元测试覆盖（模拟 rename 失败场景）

---

### 任务 5：确认 integrations 稳定性

**负责人**：minimax + mimo

**性质**：review 任务，不改代码

**审查清单**

| 检查项 | 说明 |
|--------|------|
| NotifierRouter 调用链 | Phase-2 后 /heartbeat/once 的调用是否仍然正确 |
| NotificationResult 结构 | 是否需要调整以配合 Phase-3 的变化 |
| ProviderAdapter stub | 接口是否需要小修 |
| imports 路径 | Phase-3 改了 shared/types.ts（加 bodyText），integrations 是否受影响 |
| 结论 | 确认 integrations 在 Phase-3 期间不需要改动 |

**输出**：review 报告 + 更新 `docs/agent-notes/minimax.md`

---

## 四、Agent 分工总览

| Agent | 任务 | 改动文件 |
|-------|------|----------|
| **codex** | 任务 1（P1-1 自由正文） | `packages/shared/src/types.ts`、`packages/core/src/heartbeat-markdown.ts` |
| **codex** | 任务 2（测试补充） | `tests/core.test.mjs`、`tests/fixtures/`、`docs/contracts.md`（waiting_ack 语义） |
| **codex** | 任务 3A（core classifier） | `packages/core/src/task-classifier.ts`、`apps/api/src/index.ts`（新路由） |
| **codex** | 任务 4（Windows 写回） | `packages/core/src/task-store.ts` |
| **gemini** | 任务 3B（web 适配） | `apps/web/src/App.tsx` |
| **minimax + mimo** | 任务 5（review） | 不改代码 |

---

## 五、执行顺序与依赖

```
Phase-3 启动
  │
  ├─ codex 串行执行：
  │   任务 1（P1-1 bodyText）
  │       ↓
  │   任务 2（测试补充，含 bodyText 测试）
  │       ↓
  │   任务 3A（core classifier + api 路由）
  │       ↓
  │   任务 4（Windows 写回）
  │
  ├─ gemini 并行执行（可与 codex 同时启动）：
  │   等待任务 3A 完成 → 任务 3B（web 适配 classified 接口）
  │
  └─ minimax + mimo 串行：
      等 codex 全部完成 → 任务 5（review）
```

**codex 串行原因**：任务 1→2 有 bodyText 测试依赖，任务 3A 需要等语义明确，任务 4 最后做。

**gemini 可并行原因**：任务 3B 只改前端，与 codex 不改同一批文件。但 gemini 需要等 codex 的任务 3A 完成后才有 API 可以对接。

---

## 六、Worktree 分配

| Agent | Worktree 路径 | 分支 | 基于 |
|-------|--------------|------|------|
| codex | `E:\AI\open\open-memo.worktrees\feat\p3-core` | `feat/p3-core` | `feat/m0-phase2-integration` |
| gemini | `E:\AI\open\open-memo.worktrees\feat\p3-web` | `feat/p3-web` | `feat/m0-phase2-integration` |
| minimax | 不需要 | 直接读主目录代码 | review only |

创建命令：
```bash
git worktree add -b feat/p3-core "E:/AI/open/open-memo.worktrees/feat/p3-core" feat/m0-phase2-integration
git worktree add -b feat/p3-web "E:/AI/open/open-memo.worktrees/feat/p3-web" feat/m0-phase2-integration
```

---

## 七、验收标准汇总

| 任务 | 核心验收 |
|------|----------|
| 任务 1 | 修改任务后 HEARTBEAT.md 中自由正文仍在，原有 round-trip 测试继续通过 |
| 任务 2 | `pnpm test` 通过，测试数量 12+，覆盖关键路径 |
| 任务 3 | Web 分组与 heartbeat 输出一致，UI 无变化 |
| 任务 4 | Windows 写入不报错，重试逻辑有测试覆盖 |
| 任务 5 | review 报告通过，integrations 无需改动 |

---

## 八、风险与注意事项

### 风险 1：bodyText 改了公共类型

`Task` 接口新增 `bodyText?: string` 字段，会影响：
- `packages/shared`（类型定义）
- `packages/core`（parser/render/validate）
- `apps/api`（可能需要透传）
- `apps/web`（可能需要显示）

但由于是可选字段（`?`），现有代码不做 bodyText 处理的地方不会报错。

### 风险 2：classifyTasks 与 runHeartbeat 语义差异

`runHeartbeat()` 的输出是给通知系统用的（due/overdue/snoozed），而 `classifyTasks()` 是给 UI 用的（Today/Overdue/Snoozed/Done/Upcoming）。两者颗粒度不同，不要强行复用到完全一致。

### 风险 3：任务量

codex 承担了 4 个任务，是 Phase-3 的主力。需要合理安排串行顺序，避免单点阻塞。

---

## 九、Phase-3 完成后的下一步展望

Phase-3 完成后，项目将具备：
- 数据安全（自由正文保留、Windows 写回增强）
- 语义统一（分组逻辑一致）
- 测试可靠（关键路径覆盖）

**Phase-4 可能的方向**（待 Phase-3 完成后评估）：
- 真实 system notifier（Windows Toast 通知）
- recurring 自动推进闭环
- 左侧聊天面板接入真实 AI
- 定时 heartbeat 进程（短命进程循环唤醒）
