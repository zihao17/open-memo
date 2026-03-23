import type {
  HeartbeatDecision,
  RuntimeTaskState,
  Task
} from "../../shared/dist/index.js";

export type HeartbeatTaskState = RuntimeTaskState | "inactive";

export interface HeartbeatTaskSnapshot {
  taskId: string;
  title: string;
  state: HeartbeatTaskState;
  dueAt: string | null;
  snoozeUntil: string | null;
  recurrence: Task["recurrence"];
  priority: Task["priority"];
  status: Task["status"];
}

export interface HeartbeatRunResult {
  now: string;
  tasks: HeartbeatTaskSnapshot[];
  decision: HeartbeatDecision;
}

export type TaskUpdatePatch = Partial<
  Pick<
    Task,
    | "title"
    | "detail"
    | "status"
    | "priority"
    | "dueAt"
    | "timezone"
    | "recurrence"
    | "snoozeUntil"
    | "confirmRequired"
    | "channels"
    | "tags"
    | "updatedAt"
    | "source"
  >
>;

export interface HeartbeatEvaluationOptions {
  now: string;
  dueWindowMs?: number;
}

export interface HeartbeatOnceOptions extends HeartbeatEvaluationOptions {
  heartbeatFilePath: string;
}
