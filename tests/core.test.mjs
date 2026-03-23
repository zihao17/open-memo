import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  TaskStore,
  parseHeartbeatMarkdown,
  renderHeartbeatMarkdown,
  runHeartbeat
} from "../packages/core/dist/index.js";

test("parser/render round-trip keeps task fields stable", async () => {
  const fixturePath = path.resolve("tests/fixtures/heartbeat-roundtrip.md");
  const markdown = await readFile(fixturePath, "utf8");

  const parsedTasks = parseHeartbeatMarkdown(markdown);
  const renderedMarkdown = renderHeartbeatMarkdown(parsedTasks);
  const reparsedTasks = parseHeartbeatMarkdown(renderedMarkdown);

  assert.deepEqual(reparsedTasks, parsedTasks);
});

test("updateTask rewrites through temp file and leaves no temp files behind", async () => {
  const tempDirectoryPath = await mkdtemp(path.join(os.tmpdir(), "open-memo-core-"));
  const heartbeatFilePath = path.join(tempDirectoryPath, "HEARTBEAT.md");
  const sourceMarkdown = await readFile(
    path.resolve("tests/fixtures/heartbeat-roundtrip.md"),
    "utf8"
  );

  await writeFile(heartbeatFilePath, sourceMarkdown, "utf8");

  const taskStore = new TaskStore(heartbeatFilePath, {
    now: () => "2026-03-22T01:00:00.000Z"
  });

  const updatedTask = await taskStore.updateTask("task-alpha", {
    title: "Alpha task updated"
  });

  const updatedMarkdown = await readFile(heartbeatFilePath, "utf8");
  const directoryEntries = await readdir(tempDirectoryPath);

  assert.equal(updatedTask.title, "Alpha task updated");
  assert.match(updatedMarkdown, /title: Alpha task updated/);
  assert.match(updatedMarkdown, /updatedAt: 2026-03-22T01:00:00.000Z/);
  assert.deepEqual(
    directoryEntries.filter((entry) => entry.endsWith(".tmp")),
    []
  );
});

test("heartbeat marks due, overdue and snoozed tasks deterministically", () => {
  const result = runHeartbeat(
    [
      {
        id: "task-due",
        title: "Due task",
        detail: "",
        status: "active",
        priority: "p1",
        dueAt: "2026-03-22T12:00:30.000Z",
        timezone: "UTC",
        recurrence: "none",
        snoozeUntil: null,
        confirmRequired: false,
        channels: ["system"],
        tags: [],
        createdAt: "2026-03-22T11:00:00.000Z",
        updatedAt: "2026-03-22T11:00:00.000Z",
        source: "manual"
      },
      {
        id: "task-overdue",
        title: "Overdue task",
        detail: "",
        status: "active",
        priority: "p0",
        dueAt: "2026-03-22T11:58:59.000Z",
        timezone: "UTC",
        recurrence: "weekly",
        snoozeUntil: null,
        confirmRequired: false,
        channels: ["browser"],
        tags: [],
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        source: "manual"
      },
      {
        id: "task-snoozed",
        title: "Snoozed task",
        detail: "",
        status: "active",
        priority: "p2",
        dueAt: "2026-03-22T11:55:00.000Z",
        timezone: "UTC",
        recurrence: "daily",
        snoozeUntil: "2026-03-22T12:05:00.000Z",
        confirmRequired: false,
        channels: ["ai_chat"],
        tags: [],
        createdAt: "2026-03-22T09:00:00.000Z",
        updatedAt: "2026-03-22T09:00:00.000Z",
        source: "ui"
      }
    ],
    {
      now: "2026-03-22T12:01:00.000Z"
    }
  );

  assert.deepEqual(result.decision.dueTaskIds, ["task-due"]);
  assert.deepEqual(result.decision.overdueTaskIds, ["task-overdue"]);
  assert.equal(
    result.tasks.find((task) => task.taskId === "task-snoozed")?.state,
    "snoozed"
  );
});
