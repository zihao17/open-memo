import { useState, useEffect } from 'react';
import { Task, TaskPatch } from '@open-memo/shared';

const API_URL = 'http://localhost:3001';

// We'll keep things simple and just have everything in App.tsx for M0
function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [snoozedTasks, setSnoozedTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [brief, setBrief] = useState('');

  const fetchClassifiedTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks/classified`);
      const data = await res.json();
      setTodayTasks(data.today);
      setOverdueTasks(data.overdue);
      setSnoozedTasks(data.snoozed);
      setDoneTasks(data.done);
    } catch (e) {
      console.error('Failed to fetch classified tasks', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    }
  };

  const fetchBrief = async () => {
    try {
      const res = await fetch(`${API_URL}/today-brief`);
      const data = await res.json();
      setBrief(data.brief);
    } catch (e) {
      console.error('Failed to fetch brief', e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchBrief();
    fetchClassifiedTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle }),
      });
      const newTask = await res.json();
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      fetchClassifiedTasks();
    } catch (e) {
      console.error('Failed to create task', e);
    }
  };

  const patchTask = async (id: string, partialChanges: Partial<TaskPatch['changes']>) => {
    try {
      const patch: TaskPatch = {
        taskId: id,
        changes: partialChanges,
        source: 'ui',
        requestedAt: new Date().toISOString(),
      };
      
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const updatedTask = await res.json();
      setTasks(tasks.map(t => t.id === id ? updatedTask : t));
      fetchClassifiedTasks();
    } catch (e) {
      console.error('Failed to patch task', e);
    }
  };

  const toggleTaskStatus = (task: Task) => {
    patchTask(task.id, {
      status: task.status === 'done' ? 'active' : 'done'
    });
  };

  const snoozeTask = (task: Task) => {
    // Snooze until tomorrow
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    patchTask(task.id, {
      snoozeUntil: tmr.toISOString(),
      status: 'active'
    });
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
      fetchClassifiedTasks();
    } catch (e) {
      console.error('Failed to delete task', e);
    }
  };

  // Group tasks handled by classified API


  const renderTask = (task: Task) => (
    <div key={task.id} className={`task-item ${task.status === 'done' ? 'done' : ''}`}>
      <input 
        type="checkbox" 
        className="task-checkbox" 
        checked={task.status === 'done'}
        onChange={() => toggleTaskStatus(task)}
      />
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {task.detail && <div className="task-detail">{task.detail}</div>}
        <div className="task-meta">
          {task.dueAt && <span>Due: {new Date(task.dueAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
          {task.snoozeUntil && <span>Snoozed: {new Date(task.snoozeUntil).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="task-actions">
        {task.status !== 'done' && (
          <button className="btn-icon" onClick={() => snoozeTask(task)} title="Snooze until tomorrow">⏱️</button>
        )}
        <button className="btn-icon" onClick={() => {
           const newTitle = prompt('Edit title:', task.title);
           if (newTitle) patchTask(task.id, { title: newTitle });
        }} title="Edit">✏️</button>
        <button className="btn-icon" onClick={() => deleteTask(task.id)} title="Delete">🗑️</button>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* Left Chat Panel */}
      <div className="panel chat-panel">
        <div className="chat-messages">
          <div className="message-bubble message-ai">
            <div>{brief || "Hello! Loading your brief..."}</div>
            <div className="tool-placeholder">
              [Tool Call: get_today_briefing] → Success
            </div>
            <div className="tool-placeholder">
              [Tool Call: get_tasks] → Found {tasks.length} tasks
            </div>
          </div>
          {/* Mock message */}
          <div className="message-bubble message-user">
            I need to review the M0 design doc today.
          </div>
          <div className="message-bubble message-ai">
            I've noted that down and added it to your tasks.
            <div className="tool-placeholder">
              [Tool Call: create_task] → Task 'Review M0 design doc' created
            </div>
          </div>
        </div>

        <div className="chat-input-area">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Type a message or command..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setChatInput('');
                // Mock behavior: Just clear input for M0
              }
            }}
          />
          <button className="btn-primary" onClick={() => setChatInput('')}>Send</button>
        </div>
      </div>

      {/* Right Task Panel */}
      <div className="panel task-panel">
        <h1 className="task-header">Tasks</h1>
        
        <form className="create-task-form" onSubmit={handleCreateTask}>
          <input 
            type="text" 
            className="create-task-input" 
            placeholder="Add to Inbox..." 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>

        {overdueTasks.length > 0 && (
          <div className="task-section">
            <div className="task-section-title" style={{color: '#e53e3e'}}>Overdue</div>
            {overdueTasks.map(renderTask)}
          </div>
        )}

        <div className="task-section">
          <div className="task-section-title">Today</div>
          {todayTasks.length === 0 ? <p style={{fontSize: 13, color: '#777'}}>No tasks for today. You're all caught up!</p> : todayTasks.map(renderTask)}
        </div>

        {snoozedTasks.length > 0 && (
          <div className="task-section">
            <div className="task-section-title">Snoozed / Upcoming</div>
            {snoozedTasks.map(renderTask)}
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="task-section">
            <div className="task-section-title">Done</div>
            {doneTasks.map(renderTask)}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
