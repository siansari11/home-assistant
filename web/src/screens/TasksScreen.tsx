import { useState } from 'react';
import type { Store, Task, TaskCategory, TaskStatus } from '../types';
import { todayIso } from '../lib/dates';

const CATEGORY_ICON: Record<TaskCategory, string> = {
  deadline: '⏰',
  email: '✉️',
  ask: '🙋',
  process: '🔄',
};

const STATUSES: TaskStatus[] = ['waiting', 'in_progress', 'done', 'blocked'];

function daysUntil(due: string, today: string): number {
  const [year, month, day] = due.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86400000);
}

function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'due today';
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

function dueLabel(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}.${month}`;
}

function berlinUpdated(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
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
  const [filter, setFilter] = useState<TaskStatus | null>(null);
  const [title, setTitle] = useState('');
  const tasks = store.tasks.filter((task) => !task.deletedAt);
  const counts: Record<TaskStatus, number> = {
    waiting: tasks.filter((task) => task.status === 'waiting').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
    blocked: tasks.filter((task) => task.status === 'blocked').length,
  };
  const matches = (task: Task) => !filter || task.status === filter;
  const dated = tasks.filter((task) => task.dueDate && task.status !== 'done' && matches(task)).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const undated = tasks.filter((task) => !task.dueDate && task.status !== 'done' && matches(task));
  const done = tasks.filter((task) => task.status === 'done' && matches(task));

  const patch = (task: Task, next: Partial<Task>) => {
    onChange(store.tasks.map((item) => (item.id === task.id ? { ...item, ...next, updatedAt: Date.now() } : item)));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto pb-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-ink">My tasks</h1>
          <p className="text-sm text-muted">Updated {berlinUpdated(now)} (Berlin time)</p>
        </div>
        <button type="button" onClick={onTodoist} disabled={syncing} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {syncing ? 'Syncing…' : 'Sync Todoist'}
        </button>
      </header>
      {syncNote && <p className="text-sm text-muted">{syncNote}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Waiting on you" count={counts.waiting} active={filter === 'waiting'} className="border-orange-400 bg-orange-100 text-orange-900" onClick={() => setFilter(filter === 'waiting' ? null : 'waiting')} />
        <Stat label="In progress" count={counts.in_progress} active={filter === 'in_progress'} className="border-sky-400 bg-sky-100 text-sky-950" onClick={() => setFilter(filter === 'in_progress' ? null : 'in_progress')} />
        <Stat label="Done" count={counts.done} active={filter === 'done'} className="border-emerald-500 bg-emerald-100 text-emerald-950" onClick={() => setFilter(filter === 'done' ? null : 'done')} />
        <Stat label="Blocked" count={counts.blocked} active={filter === 'blocked'} className="border-stone-400 bg-stone-200 text-stone-700" onClick={() => setFilter(filter === 'blocked' ? null : 'blocked')} />
      </div>
      <div className="grid items-start gap-4 min-[900px]:grid-cols-2">
        <section>
          <h2 className="font-serif text-2xl">🔥 Do now</h2>
          <div className="mt-2 grid gap-3">
            {dated.length === 0 && <p className="text-sm text-muted">Nothing with a due date in this filter.</p>}
            {dated.map((task) => (
              <DoNowCard key={task.id} task={task} today={today} onPatch={(next) => patch(task, next)} />
            ))}
          </div>
        </section>
        <div className="grid gap-4">
          <section className="rounded-3xl border border-line bg-card p-4">
            <h2 className="font-serif text-2xl">Deadline timeline</h2>
            <ul className="mt-3 space-y-3">
              {dated.map((task) => {
                const days = daysUntil(task.dueDate || today, today);
                const overdue = days < 0;
                const span = Math.min(100, Math.max(12, 100 - Math.abs(days) * 4));
                return (
                  <li key={task.id} className="grid grid-cols-[3.2rem_1fr] items-center gap-2 text-sm">
                    <span className={overdue ? 'font-semibold text-red-600' : 'text-ink'}>{dueLabel(task.dueDate || today)}</span>
                    <span>
                      <span className={`mb-1 block h-2 rounded-full ${overdue ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${span}%` }} />
                      <span className="block font-medium">{task.title}</span>
                      <span className={overdue ? 'text-red-600' : 'text-emerald-700'}>{days < 0 ? `- ${Math.abs(days)} days overdue` : urgencyLabel(days)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          {STATUSES.filter((status) => status !== 'done').map((status) => {
            const group = undated.filter((task) => task.status === status);
            if (!group.length) return null;
            return (
              <section key={status}>
                <h2 className="font-serif text-2xl capitalize">{status.replace('_', ' ')}</h2>
                <div className="mt-2 grid gap-2">
                  {group.map((task) => (
                    <DoNowCard key={task.id} task={task} today={today} onPatch={(next) => patch(task, next)} />
                  ))}
                </div>
              </section>
            );
          })}
          <details className="rounded-3xl border border-line bg-card p-4">
            <summary className="cursor-pointer font-serif text-2xl">Done ({done.length})</summary>
            <div className="mt-3 grid gap-2">
              {done.map((task) => (
                <DoNowCard key={task.id} task={task} today={today} onPatch={(next) => patch(task, next)} />
              ))}
            </div>
          </details>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const name = title.trim();
          if (!name) return;
          onChange([...store.tasks, { id: crypto.randomUUID(), title: name, status: 'waiting', category: 'process', nextStep: '', dueDate: null, updatedAt: Date.now() }]);
          setTitle('');
        }}
      >
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" aria-label="Task" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-base outline-none focus:border-sage" />
        <button type="submit" className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white">Add</button>
      </form>
    </div>
  );
}

function Stat({ label, count, active, className, onClick }: { label: string; count: number; active: boolean; className: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border-2 px-3 py-3 text-left ${className} ${active ? 'ring-2 ring-ink' : ''}`}>
      <span className="block font-serif text-4xl leading-none">{count}</span>
      <span className="mt-1 block text-sm font-medium">{label}</span>
    </button>
  );
}

function DoNowCard({ task, today, onPatch }: { task: Task; today: string; onPatch: (next: Partial<Task>) => void }) {
  const days = task.dueDate ? daysUntil(task.dueDate, today) : null;
  const overdue = days !== null && days < 0;
  const category = task.category || 'process';
  return (
    <article className={`rounded-2xl border-2 bg-card p-3 ${task.dueDate ? (overdue ? 'border-red-500' : 'border-emerald-500') : 'border-line'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-serif text-2xl leading-tight ${overdue ? 'text-red-600' : task.dueDate ? 'text-emerald-700' : 'text-ink'}`}>
          {days === null ? 'No date' : urgencyLabel(days)}
        </p>
        <button type="button" aria-pressed={task.status === 'done'} onClick={() => onPatch({ status: task.status === 'done' ? 'waiting' : 'done' })} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${task.status === 'done' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-line'}`}>
          {task.status === 'done' ? '✓' : ''}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {CATEGORY_ICON[category]} {category}
        {task.dueDate ? ` · due ${dueLabel(task.dueDate)}` : ''}
      </p>
      <h3 className="mt-1 font-semibold">{task.title}</h3>
      {task.nextStep && <p className="mt-1 text-sm text-muted">{task.nextStep}</p>}
      <label className="mt-2 block text-xs text-muted">
        Status
        <select
          value={task.status}
          onChange={(event) => onPatch({ status: event.target.value as TaskStatus })}
          className="mt-1 w-full rounded-xl border border-line bg-paper px-2 py-2 text-sm text-ink"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
