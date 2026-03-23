import type { RecurrenceType, Task } from "../../shared/dist/index.js";

const ISO_LOCAL_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)(Z|[+-]\d{2}:\d{2})$/;

export function getNextRecurringDueAt(
  dueAt: string | null,
  recurrence: RecurrenceType
): string | null {
  if (dueAt === null || recurrence === "none") {
    return null;
  }

  const dayOffset = recurrence === "daily" ? 1 : 7;
  return addDaysToIsoTimestamp(dueAt, dayOffset);
}

export function getNextTaskDueAt(task: Pick<Task, "dueAt" | "recurrence">): string | null {
  return getNextRecurringDueAt(task.dueAt, task.recurrence);
}

function addDaysToIsoTimestamp(timestamp: string, dayOffset: number): string {
  const match = ISO_LOCAL_TIMESTAMP_PATTERN.exec(timestamp);
  if (!match) {
    throw new Error(`Unsupported recurring timestamp format: ${timestamp}`);
  }

  const [, year, month, day, timePart, offsetPart] = match;
  const nextDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + dayOffset)
  );

  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(nextDate.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}T${timePart}${offsetPart}`;
}
