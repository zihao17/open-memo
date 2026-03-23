import type {
  NotificationChannel,
  RecurrenceType,
  Task,
  TaskPriority,
  TaskSource,
  TaskStatus
} from "../../shared/dist/index.js";

import {
  ARRAY_FIELDS,
  HEARTBEAT_FILE_HEADER,
  TASK_BLOCK_END,
  TASK_BLOCK_START,
  TASK_FIELD_ORDER,
  YAML_FENCE_END,
  YAML_FENCE_START
} from "./constants.js";

const TASK_STATUSES = new Set<TaskStatus>([
  "active",
  "paused",
  "done",
  "cancelled"
]);

const TASK_PRIORITIES = new Set<TaskPriority>(["p0", "p1", "p2", "p3"]);

const RECURRENCE_TYPES = new Set<RecurrenceType>(["none", "daily", "weekly"]);

const NOTIFICATION_CHANNELS = new Set<NotificationChannel>([
  "system",
  "browser",
  "ai_chat"
]);

const TASK_SOURCES = new Set<TaskSource>(["ui", "ai", "manual"]);

type TaskRecord = Record<string, unknown>;

export function parseHeartbeatMarkdown(markdown: string): Task[] {
  const normalizedMarkdown = normalizeLineEndings(markdown);
  const blockPattern =
    /<!-- open-memo:task:start -->\n([\s\S]*?)\n<!-- open-memo:task:end -->/g;
  const tasks: Task[] = [];
  let blockMatch: RegExpExecArray | null;
  let blockIndex = 0;

  while ((blockMatch = blockPattern.exec(normalizedMarkdown)) !== null) {
    blockIndex += 1;
    tasks.push(parseTaskBlock(blockMatch[1], blockIndex));
  }

  return tasks;
}

export function renderHeartbeatMarkdown(tasks: readonly Task[]): string {
  const normalizedTasks = tasks.map((task, index) =>
    validateTask(task, `render task ${index + 1}`)
  );
  const blocks = normalizedTasks.map(renderTaskBlock);

  if (blocks.length === 0) {
    return `${HEARTBEAT_FILE_HEADER}\n`;
  }

  return `${HEARTBEAT_FILE_HEADER}\n\n${blocks.join("\n\n")}\n`;
}

export function validateTask(task: Task, context = "task"): Task {
  assertNonEmptyString(task.id, `${context}.id`);
  assertSingleLineString(task.id, `${context}.id`);
  assertSingleLineString(task.title, `${context}.title`);
  assertString(task.detail, `${context}.detail`);
  assertOptionalString(task.bodyText, `${context}.bodyText`);

  if (!TASK_STATUSES.has(task.status)) {
    throw new Error(`Invalid ${context}.status: ${task.status}`);
  }

  if (!TASK_PRIORITIES.has(task.priority)) {
    throw new Error(`Invalid ${context}.priority: ${task.priority}`);
  }

  assertNullableIsoString(task.dueAt, `${context}.dueAt`);
  assertValidTimeZone(task.timezone, `${context}.timezone`);

  if (!RECURRENCE_TYPES.has(task.recurrence)) {
    throw new Error(`Invalid ${context}.recurrence: ${task.recurrence}`);
  }

  assertNullableIsoString(task.snoozeUntil, `${context}.snoozeUntil`);

  if (typeof task.confirmRequired !== "boolean") {
    throw new Error(`Invalid ${context}.confirmRequired: ${task.confirmRequired}`);
  }

  assertChannels(task.channels, `${context}.channels`);
  assertStringArray(task.tags, `${context}.tags`);
  assertIsoString(task.createdAt, `${context}.createdAt`);
  assertIsoString(task.updatedAt, `${context}.updatedAt`);

  if (!TASK_SOURCES.has(task.source)) {
    throw new Error(`Invalid ${context}.source: ${task.source}`);
  }

  return {
    ...task,
    channels: [...task.channels],
    tags: [...task.tags]
  };
}

function parseTaskBlock(blockContent: string, blockIndex: number): Task {
  const yamlPattern = /^```yaml\n([\s\S]*?)\n```([\s\S]*)$/;
  const yamlMatch = yamlPattern.exec(normalizeLineEndings(blockContent));

  if (!yamlMatch) {
    throw new Error(`Task block ${blockIndex} is missing a yaml fence.`);
  }

  const record = parseYamlLikeMap(yamlMatch[1], blockIndex);
  return parseTaskRecord(record, blockIndex, parseBodyText(yamlMatch[2]));
}

function parseYamlLikeMap(yaml: string, blockIndex: number): TaskRecord {
  const lines = normalizeLineEndings(yaml).split("\n");
  const record: TaskRecord = {};
  let currentArrayKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      continue;
    }

    const arrayItemMatch = /^\s*-\s(.*)$/.exec(line);
    if (arrayItemMatch) {
      if (!currentArrayKey) {
        throw new Error(
          `Task block ${blockIndex} has an array item without an array field.`
        );
      }

      const currentValue = record[currentArrayKey];
      if (!Array.isArray(currentValue)) {
        throw new Error(
          `Task block ${blockIndex} has an invalid array field: ${currentArrayKey}.`
        );
      }

      currentValue.push(parseScalar(arrayItemMatch[1]));
      continue;
    }

    const keyMatch = /^([A-Za-z][A-Za-z0-9]*):(.*)$/.exec(line);
    if (!keyMatch) {
      throw new Error(`Task block ${blockIndex} has an invalid line: ${line}`);
    }

    const [, key, rawValue] = keyMatch;
    if (key in record) {
      throw new Error(`Task block ${blockIndex} repeats field "${key}".`);
    }

    const value = rawValue.trimStart();
    if (ARRAY_FIELDS.has(key)) {
      record[key] = [];
      currentArrayKey = key;

      if (value !== "") {
        throw new Error(`Task block ${blockIndex} field "${key}" must use list syntax.`);
      }
      continue;
    }

    record[key] = value === "" ? "" : parseScalar(value);
    currentArrayKey = null;
  }

  return record;
}

function parseTaskRecord(
  record: TaskRecord,
  blockIndex: number,
  bodyText?: string
): Task {
  const knownFields = new Set<string>(TASK_FIELD_ORDER);
  for (const fieldName of Object.keys(record)) {
    if (!knownFields.has(fieldName)) {
      throw new Error(`Task block ${blockIndex} has an unknown field "${fieldName}".`);
    }
  }

  const task: Task = {
    id: expectString(record.id, `Task block ${blockIndex}.id`),
    title: expectString(record.title, `Task block ${blockIndex}.title`),
    detail: expectString(record.detail, `Task block ${blockIndex}.detail`),
    bodyText,
    status: expectTaskStatus(record.status, `Task block ${blockIndex}.status`),
    priority: expectTaskPriority(record.priority, `Task block ${blockIndex}.priority`),
    dueAt: expectNullableString(record.dueAt, `Task block ${blockIndex}.dueAt`),
    timezone: expectString(record.timezone, `Task block ${blockIndex}.timezone`),
    recurrence: expectRecurrenceType(
      record.recurrence,
      `Task block ${blockIndex}.recurrence`
    ),
    snoozeUntil: expectNullableString(
      record.snoozeUntil,
      `Task block ${blockIndex}.snoozeUntil`
    ),
    confirmRequired: expectBoolean(
      record.confirmRequired,
      `Task block ${blockIndex}.confirmRequired`
    ),
    channels: expectChannels(record.channels, `Task block ${blockIndex}.channels`),
    tags: expectStringArray(record.tags, `Task block ${blockIndex}.tags`),
    createdAt: expectString(record.createdAt, `Task block ${blockIndex}.createdAt`),
    updatedAt: expectString(record.updatedAt, `Task block ${blockIndex}.updatedAt`),
    source: expectTaskSource(record.source, `Task block ${blockIndex}.source`)
  };

  return validateTask(task, `Task block ${blockIndex}`);
}

function renderTaskBlock(task: Task): string {
  const yamlLines: string[] = [];

  for (const fieldName of TASK_FIELD_ORDER) {
    const value = task[fieldName];
    if (Array.isArray(value)) {
      yamlLines.push(`${fieldName}:`);
      for (const item of value) {
        yamlLines.push(`  - ${renderScalar(item)}`);
      }
      continue;
    }

    yamlLines.push(`${fieldName}: ${renderScalar(value)}`);
  }

  const yamlBlock = [TASK_BLOCK_START, YAML_FENCE_START, ...yamlLines, YAML_FENCE_END].join(
    "\n"
  );
  const bodyText = task.bodyText ?? "";

  return `${yamlBlock}${bodyText}\n${TASK_BLOCK_END}`;
}

function parseBodyText(rawBodyText: string): string | undefined {
  return /\S/.test(rawBodyText) ? rawBodyText : undefined;
}

function parseScalar(rawValue: string): unknown {
  if (rawValue === "null") {
    return null;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  if (
    (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function renderScalar(value: string | boolean | null): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  assertSingleLineString(value, "rendered string");
  return value;
}

function expectString(value: unknown, context: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected ${context} to be a string.`);
  }

  return value;
}

function expectNullableString(value: unknown, context: string): string | null {
  if (value === null) {
    return null;
  }

  return expectString(value, context);
}

function expectBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${context} to be a boolean.`);
  }

  return value;
}

function expectTaskStatus(value: unknown, context: string): TaskStatus {
  if (typeof value !== "string" || !TASK_STATUSES.has(value as TaskStatus)) {
    throw new Error(`Expected ${context} to be a valid task status.`);
  }

  return value as TaskStatus;
}

function expectTaskPriority(value: unknown, context: string): TaskPriority {
  if (typeof value !== "string" || !TASK_PRIORITIES.has(value as TaskPriority)) {
    throw new Error(`Expected ${context} to be a valid task priority.`);
  }

  return value as TaskPriority;
}

function expectRecurrenceType(value: unknown, context: string): RecurrenceType {
  if (typeof value !== "string" || !RECURRENCE_TYPES.has(value as RecurrenceType)) {
    throw new Error(`Expected ${context} to be a valid recurrence type.`);
  }

  return value as RecurrenceType;
}

function expectTaskSource(value: unknown, context: string): TaskSource {
  if (typeof value !== "string" || !TASK_SOURCES.has(value as TaskSource)) {
    throw new Error(`Expected ${context} to be a valid task source.`);
  }

  return value as TaskSource;
}

function expectChannels(value: unknown, context: string): NotificationChannel[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${context} to be an array.`);
  }

  return value.map((entry, index) => {
    if (
      typeof entry !== "string" ||
      !NOTIFICATION_CHANNELS.has(entry as NotificationChannel)
    ) {
      throw new Error(`Expected ${context}[${index}] to be a valid channel.`);
    }

    return entry as NotificationChannel;
  });
}

function expectStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${context} to be an array.`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(`Expected ${context}[${index}] to be a string.`);
    }

    return entry;
  });
}

function assertChannels(value: NotificationChannel[], context: string): void {
  for (const [index, channel] of value.entries()) {
    if (!NOTIFICATION_CHANNELS.has(channel)) {
      throw new Error(`Invalid ${context}[${index}]: ${channel}`);
    }
  }
}

function assertStringArray(value: string[], context: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${context}.`);
  }

  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") {
      throw new Error(`Invalid ${context}[${index}].`);
    }
  }
}

function assertNonEmptyString(value: string, context: string): void {
  assertString(value, context);
  if (value.trim() === "") {
    throw new Error(`Invalid ${context}: empty string.`);
  }
}

function assertString(value: unknown, context: string): void {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${context}: expected string.`);
  }
}

function assertOptionalString(value: unknown, context: string): void {
  if (value === undefined) {
    return;
  }

  assertString(value, context);
}

function assertSingleLineString(value: string, context: string): void {
  assertString(value, context);
  if (value.includes("\n") || value.includes("\r")) {
    throw new Error(`Invalid ${context}: multi-line strings are not supported.`);
  }
}

function assertIsoString(value: string, context: string): void {
  assertString(value, context);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid ${context}: expected ISO-8601 timestamp.`);
  }
}

function assertNullableIsoString(value: string | null, context: string): void {
  if (value === null) {
    return;
  }

  assertIsoString(value, context);
}

function assertValidTimeZone(value: string, context: string): void {
  assertNonEmptyString(value, context);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
  } catch (error) {
    throw new Error(
      `Invalid ${context}: ${
        error instanceof Error ? error.message : "unknown time zone error"
      }`
    );
  }
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}
