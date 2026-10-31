import { useState } from 'react';
import type { PersonId, ShoppingItem, Store, TimerState } from '../types';
import { PEOPLE } from '../data/content';
import { formatTime } from '../lib/dates';
import { normalizeCalendarUrl } from '../lib/ics';

const PRESETS = [1, 5, 10, 15, 25, 45];

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function HouseScreen({
  store,
  timer,
  syncing,
  onTimer,
  onArmAudio,
  onShopping,
  onCalendars,
  onSync,
}: {
  store: Store;
  timer: TimerState;
  syncing: boolean;
  onTimer: (timer: TimerState) => void;
  onArmAudio: () => void;
  onShopping: (items: ShoppingItem[]) => void;
  onCalendars: (calendars: Store['settings']['calendars']) => void;
  onSync: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [minutes, setMinutes] = useState(10);
  const progress = timer.durationMs > 0 ? Math.min(1, Math.max(0, timer.remainingMs / timer.durationMs)) : 0;
  const ring = 2 * Math.PI * 42;

  const setDuration = (ms: number) => {
    const durationMs = Math.max(1000, ms);
    onTimer({ status: 'idle', durationMs, remainingMs: durationMs, endsAt: null, label: timer.label });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-sage">House</p>
        <h1 className="font-serif text-4xl text-ink">Kitchen and lists</h1>
      </header>
      <div className="grid gap-3 min-[900px]:grid-cols-2">
        <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
          <h2 className="font-serif text-2xl">Kitchen timer</h2>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <svg viewBox="0 0 100 100" className="h-36 w-36">
              <circle cx="50" cy="50" r="42" className="fill-none stroke-paper" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`fill-none ${timer.status === 'done' ? 'stroke-clay' : 'stroke-sage'}`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${ring} ${ring}`}
                strokeDashoffset={ring * (1 - (timer.status === 'done' ? 1 : progress))}
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="54" textAnchor="middle" className="fill-ink font-serif text-[16px]">
                {timer.status === 'done' ? 'Done' : formatRemaining(timer.remainingMs)}
              </text>
            </svg>
            <div className="min-w-0 flex-1">
              <label className="block text-sm text-muted">
                What is it?
                <input
                  value={timer.label}
                  onChange={(event) => onTimer({ ...timer, label: event.target.value.slice(0, 40) })}
                  placeholder="Pasta, rice, oven…"
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {timer.status === 'done' ? (
                  <button type="button" className="rounded-full bg-clay px-4 py-2 text-sm font-medium text-white" onClick={() => setDuration(timer.durationMs)}>
                    Dismiss
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white"
                    onClick={() => {
                      onArmAudio();
                      if (timer.status === 'running' && timer.endsAt) {
                        onTimer({ ...timer, status: 'paused', remainingMs: Math.max(0, timer.endsAt - Date.now()), endsAt: null });
                        return;
                      }
                      const remainingMs = timer.remainingMs > 0 ? timer.remainingMs : timer.durationMs;
                      onTimer({
                        ...timer,
                        status: 'running',
                        remainingMs,
                        durationMs: timer.durationMs || remainingMs,
                        endsAt: Date.now() + remainingMs,
                      });
                    }}
                  >
                    {timer.status === 'running' ? 'Pause' : 'Start'}
                  </button>
                )}
                <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => setDuration(timer.durationMs || 10 * 60 * 1000)}>
                  Reset
                </button>
                <button
                  type="button"
                  className="rounded-full border border-line px-4 py-2 text-sm"
                  onClick={() => {
                    const extra = 60_000;
                    if (timer.status === 'running' && timer.endsAt) {
                      onTimer({ ...timer, durationMs: timer.durationMs + extra, remainingMs: timer.remainingMs + extra, endsAt: timer.endsAt + extra });
                      return;
                    }
                    const remainingMs = timer.remainingMs + extra;
                    onTimer({ ...timer, durationMs: timer.durationMs + extra, remainingMs, endsAt: null });
                  }}
                >
                  +1 min
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset} type="button" className="rounded-full bg-paper px-3 py-2 text-sm" onClick={() => setDuration(preset * 60 * 1000)}>
                {preset} min
              </button>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setDuration(Math.min(180, Math.max(1, minutes)) * 60 * 1000);
              }}
            >
              <input
                aria-label="Custom minutes"
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="w-20 rounded-xl border border-line bg-paper px-2 py-2 text-base"
              />
              <button type="submit" className="rounded-full border border-line px-3 py-2 text-sm">
                Set
              </button>
            </form>
          </div>
          {timer.status === 'done' && (
            <p className="mt-3 font-medium text-clay-deep">{timer.label ? `${timer.label} is ready.` : "Time's up."}</p>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Shopping list</h2>
            <button
              type="button"
              className="text-sm text-muted"
              onClick={() => onShopping(store.shopping.filter((item) => !item.done))}
            >
              Clear done
            </button>
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = draft.trim();
              if (!name) return;
              onShopping([...store.shopping, { id: crypto.randomUUID(), name: name.slice(0, 80), done: false }]);
              setDraft('');
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add an item"
              aria-label="Shopping item"
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
            />
            <button type="submit" className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white">
              Add
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {store.shopping.length === 0 && <li className="text-sm text-muted">The list is empty.</li>}
            {store.shopping.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <button
                  type="button"
                  aria-pressed={item.done}
                  onClick={() => onShopping(store.shopping.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)))}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${item.done ? 'border-sage bg-sage text-white' : 'border-line'}`}
                >
                  {item.done ? '✓' : ''}
                </button>
                <span className={`flex-1 ${item.done ? 'text-muted line-through' : ''}`}>{item.name}</span>
                <button type="button" aria-label={`Remove ${item.name}`} className="text-sm text-muted" onClick={() => onShopping(store.shopping.filter((row) => row.id !== item.id))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">Calendars</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Paste a secret iCal address for each person. Links stay in this browser only. webcal links are fetched as https.
            </p>
          </div>
          <button type="button" onClick={onSync} disabled={syncing} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
        <div className="mt-4 grid gap-3 min-[900px]:grid-cols-2">
          {(['sehrish', 'andre'] as PersonId[]).map((person) => (
            <label key={person} className="block">
              <span className="text-sm font-medium">{PEOPLE[person].name}</span>
              <input
                type="url"
                inputMode="url"
                value={store.settings.calendars[person]}
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                onChange={(event) => onCalendars({ ...store.settings.calendars, [person]: event.target.value })}
                onBlur={(event) => onCalendars({ ...store.settings.calendars, [person]: normalizeCalendarUrl(event.target.value) })}
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
              />
              {store.calendarCache.errors[person] && <span className="mt-1 block text-sm text-clay-deep">{store.calendarCache.errors[person]}</span>}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {store.calendarCache.fetchedAt ? `Last sync ${formatTime(new Date(store.calendarCache.fetchedAt))}.` : 'Not synced yet.'} Meals, chores, shopping, and the timer are saved on this tablet.
        </p>
      </section>
    </div>
  );
}
