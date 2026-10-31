import { useState } from 'react';
import type { Chore, PersonId, Store } from '../types';
import { PEOPLE } from '../data/content';
import { isChoreDone, isDueToday, toggleChore } from '../lib/chores';
import { isoWeekday, todayIso, weekdayName } from '../lib/dates';

export function ChoresScreen({
  now,
  store,
  onChange,
}: {
  now: Date;
  store: Store;
  onChange: (chores: Chore[]) => void;
}) {
  const today = todayIso(now);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<PersonId | 'both'>('both');
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('weekly');
  const [weekday, setWeekday] = useState(() => isoWeekday(todayIso()));

  const todayChores = store.chores.filter((chore) => isDueToday(chore, today));
  const later = store.chores.filter((chore) => !isDueToday(chore, today));

  const add = () => {
    const name = title.trim();
    if (!name) return;
    const chore: Chore = {
      id: crypto.randomUUID(),
      title: name,
      assignee,
      cadence,
      weekday: cadence === 'weekly' ? weekday : 0,
      completedOn: [],
    };
    onChange([...store.chores, chore]);
    setTitle('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-sage">Chores</p>
        <h1 className="font-serif text-4xl text-ink">The flat</h1>
      </header>
      <form
        className="grid gap-2 rounded-3xl border border-line bg-card p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a chore"
          aria-label="Chore"
          className="rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-sage"
        />
        <select aria-label="Who" value={assignee} onChange={(event) => setAssignee(event.target.value as PersonId | 'both')} className="rounded-xl border border-line bg-paper px-3 py-2 text-base">
          <option value="both">Both</option>
          <option value="sehrish">Sehrish</option>
          <option value="andre">André</option>
        </select>
        <select aria-label="How often" value={cadence} onChange={(event) => setCadence(event.target.value as 'daily' | 'weekly')} className="rounded-xl border border-line bg-paper px-3 py-2 text-base">
          <option value="daily">Every day</option>
          <option value="weekly">Weekly</option>
        </select>
        <select
          aria-label="Weekday"
          value={weekday}
          disabled={cadence !== 'weekly'}
          onChange={(event) => setWeekday(Number(event.target.value))}
          className="rounded-xl border border-line bg-paper px-3 py-2 text-base disabled:opacity-40"
        >
          {Array.from({ length: 7 }, (_, day) => (
            <option key={day} value={day}>
              {weekdayName(day)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white">
          Add
        </button>
      </form>
      <div className="grid gap-3 min-[900px]:grid-cols-2">
        <ChoreColumn title="Today" chores={todayChores} today={today} onChange={onChange} all={store.chores} />
        <ChoreColumn title="Later this week" chores={later} today={today} onChange={onChange} all={store.chores} />
      </div>
    </div>
  );
}

function ChoreColumn({
  title,
  chores,
  today,
  all,
  onChange,
}: {
  title: string;
  chores: Chore[];
  today: string;
  all: Chore[];
  onChange: (chores: Chore[]) => void;
}) {
  return (
    <section className="rounded-3xl border border-line bg-card p-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      <ul className="mt-3 space-y-2">
        {chores.length === 0 && <li className="text-sm text-muted">Nothing here.</li>}
        {chores.map((chore) => {
          const done = isChoreDone(chore, today);
          const who = chore.assignee === 'both' ? 'Both' : PEOPLE[chore.assignee].name;
          return (
            <li key={chore.id} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2">
              <button
                type="button"
                aria-pressed={done}
                onClick={() => onChange(all.map((item) => (item.id === chore.id ? toggleChore(item, today) : item)))}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${done ? 'border-sage bg-sage text-white' : 'border-line bg-card'}`}
              >
                {done ? '✓' : ''}
              </button>
              <span className="min-w-0 flex-1">
                <span className={`block font-medium ${done ? 'text-muted line-through' : 'text-ink'}`}>{chore.title}</span>
                <span className="text-xs text-muted">
                  {who}
                  {chore.cadence === 'weekly' ? ` · ${weekdayName(chore.weekday)}` : ' · daily'}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${chore.title}`}
                onClick={() => onChange(all.filter((item) => item.id !== chore.id))}
                className="text-sm text-muted"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
