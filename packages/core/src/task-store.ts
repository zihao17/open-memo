import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type { Task } from "../../shared/dist/index.js";

import { MUTABLE_TASK_FIELDS } from "./constants.js";
import {
  parseHeartbeatMarkdown,
  renderHeartbeatMarkdown,
  validateTask
} from "./heartbeat-markdown.js";
import type { TaskUpdatePatch } from "./types.js";

export interface TaskStoreOptions {
  now?: () => string;
}

const RENAME_RETRY_DELAYS_MS = [100, 200, 300] as const;

export class TaskStore {
  private readonly heartbeatFilePath: string;
  private readonly now: () => string;

  constructor(heartbeatFilePath: string, options: TaskStoreOptions = {}) {
    this.heartbeatFilePath = heartbeatFilePath;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async loadTasks(): Promise<Task[]> {
    try {
      const markdown = await readFile(this.heartbeatFilePath, "utf8");
      return parseHeartbeatMarkdown(markdown);
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  async saveTasks(tasks: readonly Task[]): Promise<void> {
    const normalizedTasks = ensureUniqueTaskIds(
      tasks.map((task, index) => validateTask(task, `saveTasks[${index}]`))
    );
    const markdown = renderHeartbeatMarkdown(normalizedTasks);
    await atomicWriteFile(this.heartbeatFilePath, markdown);
  }

  async createTask(task: Task): Promise<Task> {
    const nextTask = validateTask(task, "createTask");
    const tasks = await this.loadTasks();

    if (tasks.some((existingTask) => existingTask.id === nextTask.id)) {
      throw new Error(`Task "${nextTask.id}" already exists.`);
    }

    await this.saveTasks([...tasks, nextTask]);
    return nextTask;
  }

  async updateTask(id: string, patch: TaskUpdatePatch): Promise<Task> {
    const tasks = await this.loadTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      throw new Error(`Task "${id}" was not found.`);
    }

    const currentTask = tasks[taskIndex];
    const nextTask = validateTask(
      {
        ...currentTask,
        ...pickAllowedPatchFields(patch),
        updatedAt: patch.updatedAt ?? this.now(),
        source: patch.source ?? currentTask.source
      },
      `updateTask(${id})`
    );

    const nextTasks = [...tasks];
    nextTasks[taskIndex] = nextTask;

    await this.saveTasks(nextTasks);
    return nextTask;
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.loadTasks();
    const nextTasks = tasks.filter((task) => task.id !== id);

    if (nextTasks.length === tasks.length) {
      throw new Error(`Task "${id}" was not found.`);
    }

    await this.saveTasks(nextTasks);
  }
}

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const directoryPath = path.dirname(filePath);
  const tempFilePath = path.join(
    directoryPath,
    `${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );

  await mkdir(directoryPath, { recursive: true });
  const fileHandle = await open(tempFilePath, "w");

  try {
    await fileHandle.writeFile(content, "utf8");
    await fileHandle.sync();
  } finally {
    await fileHandle.close();
  }

  let renameError: unknown;

  for (const retryDelayMs of [0, ...RENAME_RETRY_DELAYS_MS]) {
    if (retryDelayMs > 0) {
      await delay(retryDelayMs);
    }

    try {
      await rename(tempFilePath, filePath);
      return;
    } catch (error) {
      renameError = error;

      if (isRetryableRenameError(error) && retryDelayMs !== RENAME_RETRY_DELAYS_MS.at(-1)) {
        continue;
      }

      break;
    }
  }

  await cleanupTempFile(tempFilePath);
  throw createAtomicWriteRenameError(filePath, tempFilePath, renameError);
}

function pickAllowedPatchFields(patch: TaskUpdatePatch): TaskUpdatePatch {
  return Object.fromEntries(
    Object.entries(patch).filter(([fieldName]) => MUTABLE_TASK_FIELDS.has(fieldName))
  ) as TaskUpdatePatch;
}

function ensureUniqueTaskIds(tasks: readonly Task[]): Task[] {
  const seenIds = new Set<string>();

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      throw new Error(`Duplicate task id "${task.id}".`);
    }

    seenIds.add(task.id);
  }

  return [...tasks];
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isRetryableRenameError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EPERM" || error.code === "EBUSY")
  );
}

async function cleanupTempFile(tempFilePath: string): Promise<void> {
  await rm(tempFilePath, { force: true });
}

function createAtomicWriteRenameError(
  filePath: string,
  tempFilePath: string,
  error: unknown
): Error {
  const reason =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);

  return new Error(
    `Failed to atomically replace "${filePath}" with temp file "${tempFilePath}": ${reason}`
  );
}
