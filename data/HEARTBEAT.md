# HEARTBEAT

`HEARTBEAT.md` 是 Open Memo V1 的任务源文件示例。所有任务都应通过 parser/render 管线读取和回写，而不是直接做局部字符串替换。

<!-- open-memo:task:start -->
```yaml
id: task-renew-passport
title: 准备护照续签材料
detail: 整理旧护照、照片和预约确认单，周一中午前放进背包。
status: active
priority: p1
dueAt: 2026-03-23T12:00:00+08:00
timezone: Asia/Shanghai
recurrence: none
snoozeUntil: null
confirmRequired: false
channels:
  - system
  - ai_chat
tags:
  - personal
  - errands
createdAt: 2026-03-20T20:00:00+08:00
updatedAt: 2026-03-21T09:15:00+08:00
source: manual
```
补充说明：材料已经大致齐全，只差打印预约单。
<!-- open-memo:task:end -->

<!-- open-memo:task:start -->
```yaml
id: task-call-landlord
title: 联系房东确认维修时间
detail: 下次提醒前不再弹出，等午休结束后再处理。
status: active
priority: p2
dueAt: 2026-03-22T13:30:00+08:00
timezone: Asia/Shanghai
recurrence: none
snoozeUntil: 2026-03-22T14:15:00+08:00
confirmRequired: false
channels:
  - system
tags:
  - home
createdAt: 2026-03-22T09:00:00+08:00
updatedAt: 2026-03-22T12:05:00+08:00
source: ui
```
备注：这是一个处于 snooze 中的任务样例。
<!-- open-memo:task:end -->

<!-- open-memo:task:start -->
```yaml
id: task-daily-water
title: 晚饭后给绿植浇水
detail: 每天一次，固定晚饭后处理，不需要长对话。
status: active
priority: p3
dueAt: 2026-03-22T20:00:00+08:00
timezone: Asia/Shanghai
recurrence: daily
snoozeUntil: null
confirmRequired: false
channels:
  - browser
tags:
  - home
  - routine
createdAt: 2026-03-15T20:30:00+08:00
updatedAt: 2026-03-21T20:01:00+08:00
source: manual
```
备注：daily recurrence 需要由 heartbeat 在完成后生成下一次触发时间。
<!-- open-memo:task:end -->

<!-- open-memo:task:start -->
```yaml
id: task-weekly-review
title: 每周回顾项目与财务
detail: 周日晚上统一回顾本周项目进展、支出和下周重点。
status: active
priority: p1
dueAt: 2026-03-22T21:00:00+08:00
timezone: Asia/Shanghai
recurrence: weekly
snoozeUntil: null
confirmRequired: false
channels:
  - browser
  - ai_chat
tags:
  - review
  - planning
createdAt: 2026-03-01T21:00:00+08:00
updatedAt: 2026-03-16T21:05:00+08:00
source: ai
```
备注：weekly recurrence 与一次性任务共享同一持久模型，只在调度逻辑上不同。
<!-- open-memo:task:end -->

<!-- open-memo:task:start -->
```yaml
id: task-submit-expense
title: 确认并提交报销单
detail: 需要用户明确确认“已提交”，否则保留等待确认提醒。
status: active
priority: p0
dueAt: 2026-03-21T18:00:00+08:00
timezone: Asia/Shanghai
recurrence: none
snoozeUntil: null
confirmRequired: true
channels:
  - system
  - browser
  - ai_chat
tags:
  - finance
  - work
createdAt: 2026-03-19T10:00:00+08:00
updatedAt: 2026-03-21T18:05:00+08:00
source: manual
```
备注：这是 overdue + confirmRequired 的样例，运行态应可被计算为 `waiting_ack`。
<!-- open-memo:task:end -->
