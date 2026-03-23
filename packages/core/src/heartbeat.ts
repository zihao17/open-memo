import type {
  HeartbeatDecision,
  NotificationUrgency,
  RuntimeTaskState,
  Task
} from "../../shared/dist/index.js";

import { DEFAULT_DUE_WINDOW_MS } from "./constants.js";
import { TaskStore } from "./task-store.js";
import type {
  HeartbeatEvaluationOptions,
  HeartbeatOnceOptions,
  HeartbeatRunResult,
  HeartbeatTaskSnapshot,
  HeartbeatTaskState
} from "./types.js";

type DeadlineKind = "none" | "upcoming" | "due" | "overdue";

export function runHeartbeat(
  tasks: readonly Task[],
  options: HeartbeatEvaluationOptions
): HeartbeatRunResult {
  const nowDate = parseIsoTimestamp(options.now, "heartbeat.now");
  const nowIso = nowDate.toISOString();
  const dueWindowMs = options.dueWindowMs ?? DEFAULT_DUE_WINDOW_MS;
  const dueTaskIds: string[] = [];
  const overdueTaskIds: string[] = [];
  const notifications: HeartbeatDecision["notifications"] = [];
  const taskMutations: HeartbeatDecision["taskMutations"] = [];
  const snapshots: HeartbeatTaskSnapshot[] = [];
  const nextWakeCandidates: number[] = [];

  for (const task of tasks) {
    const deadlineKind = classifyDeadline(task, nowDate, dueWindowMs);
    const state = resolveTaskRuntimeState(task, deadlineKind, nowDate);

    snapshots.push({
      taskId: task.id,
      title: task.title,
      state,
      dueAt: task.dueAt,
      snoozeUntil: task.snoozeUntil,
      recurrence: task.recurrence,
      priority: task.priority,
      status: task.status
    });

    if (task.status !== "active") {
      continue;
    }

    if (deadlineKind === "due") {
      dueTaskIds.push(task.id);
    }

    if (deadlineKind === "overdue") {
      overdueTaskIds.push(task.id);
    }

    if (deadlineKind === "due" || deadlineKind === "overdue") {
      notifications.push(
        ...task.channels.map((channel) => ({
          taskId: task.id,
          title: task.title,
          body: task.detail || task.title,
          channel,
          urgency: getNotificationUrgency(task.priority, state),
          deepLink: null,
          dedupeKey: `${task.id}:${channel}:${state}:${task.updatedAt}`
        }))
      );
    }

    const nextWakeCandidate = getNextWakeCandidate(task, state, nowDate);
    if (nextWakeCandidate !== null) {
      nextWakeCandidates.push(nextWakeCandidate.getTime());
    }
  }

  const nextWakeAt =
    dueTaskIds.length > 0 || overdueTaskIds.length > 0 || notifications.length > 0
      ? nowIso
      : new Date(Math.min(...nextWakeCandidates, nowDate.getTime())).toISOString();

  const decision: HeartbeatDecision = {
    now: nowIso,
    dueTaskIds,
    overdueTaskIds,
    notifications,
    taskMutations,
    nextWakeAt
  };

  return {
    now: nowIso,
    tasks: snapshots,
    decision
  };
}

export async function runHeartbeatOnce(
  options: HeartbeatOnceOptions
): Promise<HeartbeatRunResult> {
  const taskStore = new TaskStore(options.heartbeatFilePath);
  const tasks = await taskStore.loadTasks();

  return runHeartbeat(tasks, {
    now: options.now,
    dueWindowMs: options.dueWindowMs
  });
}

export function resolveTaskRuntimeState(
  task: Task,
  deadlineKind: DeadlineKind,
  nowDate: Date
): HeartbeatTaskState {
  if (task.status !== "active") {
    return "inactive";
  }

  if (task.snoozeUntil !== null) {
    const snoozeUntilDate = parseIsoTimestamp(
      task.snoozeUntil,
      `${task.id}.snoozeUntil`
    );
    if (snoozeUntilDate.getTime() > nowDate.getTime()) {
      return "snoozed";
    }
  }

  if (deadlineKind === "due" || deadlineKind === "overdue") {
    if (task.confirmRequired) {
      return "waiting_ack";
    }

    return deadlineKind as Extract<RuntimeTaskState, "due" | "overdue">;
  }

  return "upcoming";
}

function classifyDeadline(task: Task, nowDate: Date, dueWindowMs: number): DeadlineKind {
  if (task.status !== "active" || task.dueAt === null) {
    return "none";
  }

  if (task.snoozeUntil !== null) {
    const snoozeUntilDate = parseIsoTimestamp(
      task.snoozeUntil,
      `${task.id}.snoozeUntil`
    );
    if (snoozeUntilDate.getTime() > nowDate.getTime()) {
      return "none";
    }
  }

  const dueAtDate = parseIsoTimestamp(task.dueAt, `${task.id}.dueAt`);
  const diffMs = nowDate.getTime() - dueAtDate.getTime();

  if (diffMs < 0) {
    return "upcoming";
  }

  if (diffMs < dueWindowMs) {
    return "due";
  }

  return "overdue";
}

function getNextWakeCandidate(
  task: Task,
  state: HeartbeatTaskState,
  nowDate: Date
): Date | null {
  if (task.status !== "active" || state === "inactive") {
    return null;
  }

  if (state === "upcoming" && task.dueAt !== null) {
    return parseIsoTimestamp(task.dueAt, `${task.id}.dueAt`);
  }

  if (state === "snoozed" && task.snoozeUntil !== null) {
    return parseIsoTimestamp(task.snoozeUntil, `${task.id}.snoozeUntil`);
  }

  if (state === "due" || state === "overdue" || state === "waiting_ack") {
    return nowDate;
  }

  return null;
}

function getNotificationUrgency(
  priority: Task["priority"],
  state: HeartbeatTaskState
): NotificationUrgency {
  if (state === "overdue" || state === "waiting_ack") {
    return priority === "p0" ? "critical" : "high";
  }

  if (priority === "p0") {
    return "critical";
  }

  if (priority === "p1") {
    return "high";
  }

  if (priority === "p2") {
    return "normal";
  }

  return "low";
}

function parseIsoTimestamp(value: string, context: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${context}: expected ISO-8601 timestamp.`);
  }

  return date;
}
