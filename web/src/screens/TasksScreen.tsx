import { useState } from 'react';
import type { Store, Task } from '../types';
import { formatShortDate, todayIso } from '../lib/dates';

function byDue(a: Task, b: Task): number {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.title.localeCompare(b.title);
}

export function TasksScreen({
  now,
  store,
  syncing,
  syncNote,
  onChange,
  onTodoist,
}: {
  now: Date;
  store: Store;
  syncing: boolean;
  syncNote: string;
  onChange: (tasks: Task[]) => void;
  onTodoist: () => void;
}) {
  const today = todayIso(now);
  const [title, setTitle] = useState('');
  const open = store.tasks.filter((task) => !task.deletedAt && task.status !== 'done').sort(byDue);
  const done = store.tasks.filter((task) => !task.deletedAt && task.status === 'done').sort(byDue);

  const toggle = (task: Task) => {
    onChange(
      store.tasks.map((item) =>
        item.id === task.id
          ? { ...item, status: item.status === 'done' ? 'waiting' : 'done', updatedAt: Date.now() }
          : item,
      ),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-sage">Tasks</p>
          <h1 className="font-serif text-4xl text-ink">My tasks</h1>
        </div>
        <button type="button" onClick={onTodoist} disabled={syncing} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {syncing ? 'Syncing…' : 'Sync Todoist'}
        </button>
      </header>
      {syncNote && <p className="text-sm text-muted">{syncNote}</p>}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const name = title.trim();
          if (!name) return;
          onChange([...store.tasks, { id: crypto.randomUUID(), title: name, status: 'waiting', nextStep: '', dueDate: null, updatedAt: Date.now() }]);
          setTitle('');
        }}
      >
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" aria-label="Task" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-base outline-none focus:border-sage" />
        <button type="submit" className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white">Add</button>
      </form>
      <TaskList title="Open" tasks={open} today={today} onToggle={toggle} />
      <details className="rounded-3xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-serif text-2xl">Done ({done.length})</summary>
        <ul className="mt-3 space-y-2">
          {done.map((task) => (
            <TaskRow key={task.id} task={task} today={today} onToggle={toggle} />
          ))}
        </ul>
      </details>
    </div>
  );
}

function TaskList({ title, tasks, today, onToggle }: { title: string; tasks: Task[]; today: string; onToggle: (task: Task) => void }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      <ul className="mt-3 space-y-2">
        {tasks.length === 0 && <li className="text-sm text-muted">Nothing open.</li>}
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({ task, today, onToggle }: { task: Task; today: string; onToggle: (task: Task) => void }) {
  const overdue = Boolean(task.dueDate && task.dueDate < today && task.status !== 'done');
  return (
    <li className={`flex items-start gap-3 rounded-2xl px-3 py-2 ${overdue ? 'bg-clay-soft' : 'bg-paper'}`}>
      <button type="button" aria-pressed={task.status === 'done'} onClick={() => onToggle(task)} className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border ${task.status === 'done' ? 'border-sage bg-sage text-white' : 'border-line bg-card'}`}>
        {task.status === 'done' ? '✓' : ''}
      </button>
      <span className="min-w-0">
        <span className={`block font-medium ${task.status === 'done' ? 'text-muted line-through' : ''}`}>{task.title}</span>
        {task.nextStep && <span className="block text-sm text-muted">{task.nextStep}</span>}
        <span className="text-xs text-muted">
          {task.status === 'in_progress' ? 'In progress' : task.status === 'waiting' ? 'Waiting' : 'Done'}
          {task.dueDate ? ` · ${overdue ? 'Overdue ' : ''}${formatShortDate(task.dueDate)}` : ''}
        </span>
      </span>
    </li>
  );
}
