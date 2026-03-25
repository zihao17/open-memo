import type { Task } from "../../shared/dist/index.js";

import { runHeartbeat } from "./heartbeat.js";

export interface ClassifiedTasks {
  today: Task[];
  overdue: Task[];
  snoozed: Task[];
  done: Task[];
  upcoming: Task[];
}

export function classifyTasks(
  tasks: readonly Task[],
  now = new Date().toISOString()
): ClassifiedTasks {
  const heartbeatResult = runHeartbeat(tasks, { now });
  const stateByTaskId = new Map(
    heartbeatResult.tasks.map((snapshot) => [snapshot.taskId, snapshot.state])
  );
  const classified: ClassifiedTasks = {
    today: [],
    overdue: [],
    snoozed: [],
    done: [],
    upcoming: []
  };

  for (const task of tasks) {
    if (task.status === "done") {
      classified.done.push(task);
      continue;
    }

    const state = stateByTaskId.get(task.id);

    if (state === "due" || state === "waiting_ack") {
      classified.today.push(task);
      continue;
    }

    if (state === "overdue") {
      classified.overdue.push(task);
      continue;
    }

    if (state === "snoozed") {
      classified.snoozed.push(task);
      continue;
    }

    if (state === "upcoming") {
      classified.upcoming.push(task);
    }
  }

  return classified;
}
