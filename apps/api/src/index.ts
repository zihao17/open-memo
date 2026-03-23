import express from 'express';
import cors from 'cors';
import { Task, TaskPatch } from '@open-memo/shared';

const app = express();
app.use(cors());
app.use(express.json());

// Mock Data
let tasks: Task[] = [
  {
    id: 't-1',
    title: 'Review M0 design doc',
    detail: 'Need to review the design document for phase 1.',
    status: 'active',
    priority: 'p1',
    dueAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour later
    timezone: 'Asia/Shanghai',
    recurrence: 'none',
    snoozeUntil: null,
    confirmRequired: false,
    channels: ['system'],
    tags: ['work'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'manual',
  },
  {
    id: 't-2',
    title: 'Fix typo in UI.md',
    detail: '',
    status: 'done',
    priority: 'p2',
    dueAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // yesterday
    timezone: 'Asia/Shanghai',
    recurrence: 'none',
    snoozeUntil: null,
    confirmRequired: false,
    channels: ['system'],
    tags: ['chore'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'manual',
  }
];

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.post('/tasks', (req, res) => {
  const newTask: Task = {
    id: `t-${Date.now()}`,
    title: req.body.title || 'New Task',
    detail: req.body.detail || '',
    status: 'active',
    priority: req.body.priority || 'p2',
    dueAt: req.body.dueAt || null,
    timezone: req.body.timezone || 'UTC',
    recurrence: req.body.recurrence || 'none',
    snoozeUntil: req.body.snoozeUntil || null,
    confirmRequired: req.body.confirmRequired || false,
    channels: req.body.channels || ['system'],
    tags: req.body.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: req.body.source || 'ui',
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.patch('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  const patch: TaskPatch = req.body;
  
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Update fields conditionally based on patch.changes
  const currentTask = tasks[taskIndex];
  const updatedTask = { ...currentTask };
  
  if (patch.changes) {
    Object.assign(updatedTask, patch.changes);
    updatedTask.updatedAt = new Date().toISOString();
  }

  tasks[taskIndex] = updatedTask;
  res.json(updatedTask);
});

app.delete('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  tasks = tasks.filter(t => t.id !== taskId);
  res.status(204).send();
});

app.get('/today-brief', (req, res) => {
  res.json({
    brief: "Hello! You have some tasks lined up for today, including reviewing the M0 design doc. Let me know if you want to reschedule anything."
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Open Memo Mock API running on port ${PORT}`);
});
