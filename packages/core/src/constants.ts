export const HEARTBEAT_FILE_HEADER = `# HEARTBEAT

\`HEARTBEAT.md\` 是 Open Memo V1 的任务源文件。所有任务都应通过 parser/render 管线读取和回写，而不是直接做局部字符串替换。`;

export const TASK_BLOCK_START = "<!-- open-memo:task:start -->";

export const TASK_BLOCK_END = "<!-- open-memo:task:end -->";

export const YAML_FENCE_START = "```yaml";

export const YAML_FENCE_END = "```";

export const TASK_FIELD_ORDER = [
  "id",
  "title",
  "detail",
  "status",
  "priority",
  "dueAt",
  "timezone",
  "recurrence",
  "snoozeUntil",
  "confirmRequired",
  "channels",
  "tags",
  "createdAt",
  "updatedAt",
  "source"
] as const;

export const ARRAY_FIELDS = new Set(["channels", "tags"]);

export const MUTABLE_TASK_FIELDS = new Set([
  "title",
  "detail",
  "status",
  "priority",
  "dueAt",
  "timezone",
  "recurrence",
  "snoozeUntil",
  "confirmRequired",
  "channels",
  "tags",
  "updatedAt",
  "source"
]);

export const DEFAULT_DUE_WINDOW_MS = 60_000;
