import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyTasks,
  getNextRecurringDueAt,
  getNextTaskDueAt,
  TaskStore,
  parseHeartbeatMarkdown,
  renderHeartbeatMarkdown,
  runHeartbeat
} from "../packages/core/dist/index.js";

function makeTask(overrides = {}) {
  return {
    id: "task-default",
    title: "Default task",
    detail: "",
    status: "active",
    priority: "p2",
    dueAt: "2026-03-22T12:00:00.000Z",
    timezone: "UTC",
    recurrence: "none",
    snoozeUntil: null,
    confirmRequired: false,
    channels: ["system"],
    tags: [],
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-22T10:00:00.000Z",
    source: "manual",
    ...overrides
  };
}

async function setupHeartbeatFixture() {
  const tempDirectoryPath = await mkdtemp(path.join(os.tmpdir(), "open-memo-core-"));
  const heartbeatFilePath = path.join(tempDirectoryPath, "HEARTBEAT.md");
  const sourceMarkdown = await readFile(
    path.resolve("tests/fixtures/heartbeat-roundtrip.md"),
    "utf8"
  );

  await writeFile(heartbeatFilePath, sourceMarkdown, "utf8");
  return { tempDirectoryPath, heartbeatFilePath };
}

test("parser/render round-trip keeps task fields stable", async () => {
  const fixturePath = path.resolve("tests/fixtures/heartbeat-roundtrip.md");
  const markdown = await readFile(fixturePath, "utf8");

  const parsedTasks = parseHeartbeatMarkdown(markdown);
  const renderedMarkdown = renderHeartbeatMarkdown(parsedTasks);
  const reparsedTasks = parseHeartbeatMarkdown(renderedMarkdown);

  assert.deepEqual(reparsedTasks, parsedTasks);
});

test("updateTask rewrites through temp file and leaves no temp files behind", async () => {
  const { tempDirectoryPath, heartbeatFilePath } = await setupHeartbeatFixture();

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
  assert.match(updatedMarkdown, /this note should be preserved by the canonical renderer/);
  assert.deepEqual(
    directoryEntries.filter((entry) => entry.endsWith(".tmp")),
    []
  );
});

test("createTask writes a new task block to disk", async () => {
  const { heartbeatFilePath } = await setupHeartbeatFixture();
  const taskStore = new TaskStore(heartbeatFilePath);

  await taskStore.createTask(
    makeTask({
      id: "task-created",
      title: "Created task",
      bodyText: "\ncreated task note"
    })
  );

  const markdown = await readFile(heartbeatFilePath, "utf8");
  const tasks = parseHeartbeatMarkdown(markdown);

  assert.equal(tasks.length, 3);
  assert.equal(tasks.find((task) => task.id === "task-created")?.bodyText, "\ncreated task note");
  assert.match(markdown, /id: task-created/);
  assert.match(markdown, /created task note/);
});

test("deleteTask rewrites the file without the removed task block", async () => {
  const { heartbeatFilePath } = await setupHeartbeatFixture();
  const taskStore = new TaskStore(heartbeatFilePath);

  await taskStore.deleteTask("task-beta");

  const markdown = await readFile(heartbeatFilePath, "utf8");
  const tasks = parseHeartbeatMarkdown(markdown);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, "task-alpha");
  assert.doesNotMatch(markdown, /id: task-beta/);
  assert.match(markdown, /this note should be preserved by the canonical renderer/);
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

test("heartbeat uses waiting_ack for active confirmRequired tasks after deadline", () => {
  const result = runHeartbeat(
    [
      makeTask({
        id: "task-waiting-ack",
        title: "Waiting ack task",
        priority: "p0",
        dueAt: "2026-03-22T11:58:00.000Z",
        confirmRequired: true,
        channels: ["system", "browser"]
      })
    ],
    {
      now: "2026-03-22T12:01:00.000Z"
    }
  );

  assert.equal(result.tasks[0].state, "waiting_ack");
  assert.deepEqual(result.decision.overdueTaskIds, ["task-waiting-ack"]);
  assert.equal(result.decision.notifications[0]?.urgency, "critical");
});

test("expired snoozeUntil no longer suppresses overdue classification", () => {
  const result = runHeartbeat(
    [
      makeTask({
        id: "task-snooze-expired",
        dueAt: "2026-03-22T11:58:00.000Z",
        snoozeUntil: "2026-03-22T11:59:00.000Z"
      })
    ],
    {
      now: "2026-03-22T12:01:00.000Z"
    }
  );

  assert.equal(result.tasks[0].state, "overdue");
  assert.deepEqual(result.decision.overdueTaskIds, ["task-snooze-expired"]);
});

test("parser rejects malformed task lines", () => {
  const markdown = `# HEARTBEAT

<!-- open-memo:task:start -->
\`\`\`yaml
id: task-bad
title: malformed
detail: ok
this is not valid yaml
status: active
priority: p1
dueAt: null
timezone: UTC
recurrence: none
snoozeUntil: null
confirmRequired: false
channels:
  - system
tags:
createdAt: 2026-03-22T10:00:00.000Z
updatedAt: 2026-03-22T10:00:00.000Z
source: manual
\`\`\`
<!-- open-memo:task:end -->
`;

  assert.throws(
    () => parseHeartbeatMarkdown(markdown),
    /Task block 1 has an invalid line: this is not valid yaml/
  );
});

test("parser rejects task blocks with missing required fields", () => {
  const markdown = `# HEARTBEAT

<!-- open-memo:task:start -->
\`\`\`yaml
id: task-missing-title
detail: ok
status: active
priority: p1
dueAt: null
timezone: UTC
recurrence: none
snoozeUntil: null
confirmRequired: false
channels:
  - system
tags:
createdAt: 2026-03-22T10:00:00.000Z
updatedAt: 2026-03-22T10:00:00.000Z
source: manual
\`\`\`
<!-- open-memo:task:end -->
`;

  assert.throws(
    () => parseHeartbeatMarkdown(markdown),
    /Expected Task block 1\.title to be a string/
  );
});

test("recurrence daily advances by one day", () => {
  assert.equal(
    getNextRecurringDueAt("2026-03-22T20:00:00+08:00", "daily"),
    "2026-03-23T20:00:00+08:00"
  );
});

test("recurrence weekly advances by seven days", () => {
  assert.equal(
    getNextTaskDueAt({
      dueAt: "2026-03-22T21:00:00+08:00",
      recurrence: "weekly"
    }),
    "2026-03-29T21:00:00+08:00"
  );
});

test("recurrence none returns null", () => {
  assert.equal(getNextRecurringDueAt("2026-03-22T21:00:00+08:00", "none"), null);
  assert.equal(getNextTaskDueAt({ dueAt: null, recurrence: "none" }), null);
});

test("bodyText round-trip preserves multiline text exactly", () => {
  const markdown = `# HEARTBEAT

<!-- open-memo:task:start -->
\`\`\`yaml
id: task-body
title: Body task
detail: keep the note intact
status: active
priority: p2
dueAt: null
timezone: UTC
recurrence: none
snoozeUntil: null
confirmRequired: false
channels:
  - system
tags:
  - note
createdAt: 2026-03-22T10:00:00.000Z
updatedAt: 2026-03-22T10:00:00.000Z
source: manual
\`\`\`
First paragraph.

  - indented bullet
    - nested bullet

Trailing line.
<!-- open-memo:task:end -->
`;

  const parsedTasks = parseHeartbeatMarkdown(markdown);
  const renderedMarkdown = renderHeartbeatMarkdown(parsedTasks);
  const reparsedTasks = parseHeartbeatMarkdown(renderedMarkdown);

  assert.equal(
    parsedTasks[0].bodyText,
    "\nFirst paragraph.\n\n  - indented bullet\n    - nested bullet\n\nTrailing line."
  );
  assert.equal(reparsedTasks[0].bodyText, parsedTasks[0].bodyText);
  assert.match(renderedMarkdown, /First paragraph\./);
  assert.match(renderedMarkdown, /  - indented bullet/);
  assert.match(renderedMarkdown, /    - nested bullet/);
});

test("classifyTasks groups runtime states into API-facing buckets", () => {
  const tasks = [
    makeTask({
      id: "task-today",
      dueAt: "2026-03-22T12:00:30.000Z"
    }),
    makeTask({
      id: "task-waiting-ack-bucket",
      dueAt: "2026-03-22T11:58:00.000Z",
      confirmRequired: true
    }),
    makeTask({
      id: "task-overdue-bucket",
      dueAt: "2026-03-22T11:57:00.000Z"
    }),
    makeTask({
      id: "task-snoozed-bucket",
      dueAt: "2026-03-22T11:57:00.000Z",
      snoozeUntil: "2026-03-22T12:05:00.000Z"
    }),
    makeTask({
      id: "task-upcoming-bucket",
      dueAt: "2026-03-22T12:10:00.000Z"
    }),
    makeTask({
      id: "task-done-bucket",
      status: "done",
      dueAt: null
    })
  ];

  const classified = classifyTasks(tasks, "2026-03-22T12:01:00.000Z");

  assert.deepEqual(classified.today.map((task) => task.id), [
    "task-today",
    "task-waiting-ack-bucket"
  ]);
  assert.deepEqual(classified.overdue.map((task) => task.id), ["task-overdue-bucket"]);
  assert.deepEqual(classified.snoozed.map((task) => task.id), ["task-snoozed-bucket"]);
  assert.deepEqual(classified.done.map((task) => task.id), ["task-done-bucket"]);
  assert.deepEqual(classified.upcoming.map((task) => task.id), ["task-upcoming-bucket"]);
});
