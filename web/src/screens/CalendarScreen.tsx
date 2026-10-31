import { useState } from 'react';
import type { CalendarEvent, PersonId, Store } from '../types';
import { PEOPLE } from '../data/content';
import { addDays, formatShortDate, formatTime, mondayOf, todayIso, zonedParts } from '../lib/dates';

function eventWhen(event: CalendarEvent): string {
  if (event.allDay) return 'All day';
  return `${formatTime(new Date(event.start))}–${formatTime(new Date(event.end))}`;
}

export function CalendarScreen({
  now,
  store,
  syncing,
  onSync,
}: {
  now: Date;
  store: Store;
  syncing: boolean;
  onSync: () => void;
}) {
  const today = todayIso(now);
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [filter, setFilter] = useState<PersonId | 'both'>('both');
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const urls = store.settings.calendars;
  const hasUrl = Boolean(urls.sehrish || urls.andre);
  const events = store.calendarCache.events.filter((event) => filter === 'both' || event.person === filter);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-sage">Calendar</p>
          <h1 className="font-serif text-4xl text-ink">This week</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            Previous
          </button>
          <button type="button" className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(mondayOf(today))}>
            Today
          </button>
          <button type="button" className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next
          </button>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing || !hasUrl}
            className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </header>
      <div className="flex flex-wrap gap-2">
        {(['both', 'sehrish', 'andre'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === id ? 'bg-ink text-white' : 'bg-card text-muted'}`}
          >
            {id === 'both' ? 'Both' : PEOPLE[id].name}
          </button>
        ))}
        <p className="self-center text-sm text-muted">
          {store.calendarCache.fetchedAt
            ? `Last sync ${formatTime(new Date(store.calendarCache.fetchedAt))}`
            : 'Not synced yet'}
        </p>
      </div>
      {!hasUrl && (
        <p className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-ink">
          Paste Sehrish and André’s secret iCal links on the House screen. They stay in this tablet’s storage.
        </p>
      )}
      {(store.calendarCache.errors.sehrish || store.calendarCache.errors.andre) && (
        <p className="rounded-2xl border border-clay/40 bg-card px-4 py-3 text-sm text-clay-deep">
          {store.calendarCache.errors.sehrish && <span className="block">Sehrish: {store.calendarCache.errors.sehrish}</span>}
          {store.calendarCache.errors.andre && <span className="block">André: {store.calendarCache.errors.andre}</span>}
        </p>
      )}
      <div className="grid min-h-0 flex-1 gap-2 overflow-auto min-[900px]:grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) =>
            event.allDay ? event.start <= day && event.end > day : zonedParts(new Date(event.start)).iso === day,
          );
          const isToday = day === today;
          return (
            <section key={day} className={`rounded-3xl border bg-card p-3 ${isToday ? 'border-sage' : 'border-line'}`}>
              <h2 className="font-serif text-lg">{formatShortDate(day)}</h2>
              <ul className="mt-2 space-y-2">
                {dayEvents.length === 0 && <li className="text-sm text-muted">Clear</li>}
                {dayEvents.map((event) => (
                  <li
                    key={`${event.uid}-${event.start}-${day}`}
                    className={`rounded-xl px-2 py-1.5 text-sm ${event.person === 'sehrish' ? 'bg-clay-soft' : 'bg-sage-soft'}`}
                  >
                    <p className="font-medium leading-snug">{event.title}</p>
                    <p className="text-xs text-muted">
                      {eventWhen(event)} · {PEOPLE[event.person].name}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
