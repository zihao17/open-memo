export type TaskStatus = "active" | "paused" | "done" | "cancelled";

export type TaskPriority = "p0" | "p1" | "p2" | "p3";

export type RecurrenceType = "none" | "daily" | "weekly";

export type NotificationChannel = "system" | "browser" | "ai_chat";

export type TaskSource = "ui" | "ai" | "manual";

export type RuntimeTaskState =
  | "upcoming"
  | "due"
  | "overdue"
  | "snoozed"
  | "waiting_ack";

export type NotificationUrgency = "low" | "normal" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  timezone: string;
  recurrence: RecurrenceType;
  snoozeUntil: string | null;
  confirmRequired: boolean;
  channels: NotificationChannel[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: TaskSource;
}

export interface TaskPatch {
  taskId: string;
  changes: Partial<
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
    >
  >;
  source: TaskSource;
  requestedAt: string;
  reason?: string;
}

export interface NotifyPayload {
  taskId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  urgency: NotificationUrgency;
  deepLink: string | null;
  dedupeKey: string;
}

export interface TaskMutation {
  taskId: string;
  patch: TaskPatch;
  reason: string;
}

export interface HeartbeatDecision {
  now: string;
  dueTaskIds: string[];
  overdueTaskIds: string[];
  notifications: NotifyPayload[];
  taskMutations: TaskMutation[];
  nextWakeAt: string;
}

export interface ProviderStructuredRequest<TSchema = unknown> {
  profile: string;
  prompt: string;
  schema: TSchema;
}

export interface ProviderToolDefinition {
  name: string;
  description: string;
  inputSchema?: unknown;
}

export interface ProviderToolCall {
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ProviderToolResult {
  toolName: string;
  output: unknown;
}

export interface ProviderChatRequest {
  profile: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
  }>;
  tools?: ProviderToolDefinition[];
}

export interface ProviderChatResponse {
  message: string;
  toolCalls?: ProviderToolCall[];
}

export interface ProviderAdapter {
  generateStructured<TResult, TSchema = unknown>(
    request: ProviderStructuredRequest<TSchema>
  ): Promise<TResult>;
  chatWithTools(
    request: ProviderChatRequest,
    toolResults?: ProviderToolResult[]
  ): Promise<ProviderChatResponse>;
}
