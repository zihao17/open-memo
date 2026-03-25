import path from "node:path";

import express from "express";
import cors from "cors";

import { classifyTasks, runHeartbeatOnce, TaskStore } from "@open-memo/core";
import { NotifierRouter } from "@open-memo/integrations";
import { Task, TaskPatch } from "@open-memo/shared";

const app = express();
app.use(cors());
app.use(express.json());

const HEARTBEAT_PATH = path.resolve("../../data/HEARTBEAT.md");
const taskStore = new TaskStore(HEARTBEAT_PATH);
const notifierRouter = new NotifierRouter();

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("was not found");
}

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await taskStore.loadTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/tasks/classified", async (req, res) => {
  try {
    const tasks = await taskStore.loadTasks();
    const classified = classifyTasks(tasks);
    classified.today = [...classified.today, ...classified.upcoming];
    res.json(classified);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: req.body.title || "New Task",
      detail: req.body.detail || "",
      status: req.body.status || "active",
      priority: req.body.priority || "p2",
      dueAt: req.body.dueAt || null,
      timezone: req.body.timezone || "UTC",
      recurrence: req.body.recurrence || "none",
      snoozeUntil: req.body.snoozeUntil || null,
      confirmRequired: req.body.confirmRequired || false,
      channels: req.body.channels || ["system"],
      tags: req.body.tags || [],
      createdAt: now,
      updatedAt: now,
      source: req.body.source || "ui"
    };

    const createdTask = await taskStore.createTask(newTask);
    res.status(201).json(createdTask);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.patch("/tasks/:id", async (req, res) => {
  try {
    const patch = req.body as TaskPatch;
    const updatedTask = await taskStore.updateTask(req.params.id, {
      ...(patch.changes ?? {}),
      source: patch.source ?? "ui",
      updatedAt: new Date().toISOString()
    });

    res.json(updatedTask);
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(500).json({ error: String(error) });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    await taskStore.deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(500).json({ error: String(error) });
  }
});

app.post("/heartbeat/once", async (req, res) => {
  try {
    const result = await runHeartbeatOnce({
      heartbeatFilePath: HEARTBEAT_PATH,
      now: req.body.now || new Date().toISOString()
    });
    const notifyResults = await notifierRouter.routeBatch(
      result.decision.notifications
    );
    res.json({ heartbeat: result, notifications: notifyResults });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/today-brief", (req, res) => {
  res.json({
    brief: "Hello! You have some tasks lined up for today, including reviewing the M0 design doc. Let me know if you want to reschedule anything."
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Open Memo API running on port ${PORT}`);
});
