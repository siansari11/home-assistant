import type { CalendarEvent, Chore, Store, WeatherReport } from '../types';
import { PEOPLE } from '../data/content';
import { isChoreDone, isDueToday } from '../lib/chores';
import { formatDay, formatLongDate, formatTime, greeting, todayIso } from '../lib/dates';
import { WEATHER_PLACE, weatherLabel } from '../lib/weather';
import { Marquee } from '../components/Marquee';
import { WeatherGlyph } from '../components/Icons';

function eventWhen(event: CalendarEvent): string {
  if (event.allDay) return 'All day';
  const start = formatTime(new Date(event.start));
  const end = formatTime(new Date(event.end));
  return `${start}–${end}`;
}

export function HomeScreen({
  now,
  store,
  weather,
  events,
}: {
  now: Date;
  store: Store;
  weather: WeatherReport | null;
  events: CalendarEvent[];
}) {
  const today = todayIso(now);
  const dinner = store.meals[today]?.dinner?.trim();
  const due = store.chores.filter((chore) => isDueToday(chore, today));
  const openChores = due.filter((chore) => !isChoreDone(chore, today));
  const shoppingLeft = store.shopping.filter((item) => !item.done).length;
  const upcoming = events.filter((event) => (event.allDay ? event.end > today : new Date(event.start).getTime() >= now.getTime() - 60_000)).slice(0, 3);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto min-[900px]:overflow-hidden">
      <header className="shrink-0">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-sage">{formatLongDate(today)}</p>
        <h1 className="font-serif text-4xl text-ink min-[900px]:text-5xl">
          {greeting(now)}, {PEOPLE.sehrish.name} & {PEOPLE.andre.name}
        </h1>
      </header>
      <div className="grid shrink-0 gap-3 min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:shrink min-[900px]:grid-cols-5 min-[900px]:overflow-auto">
        <section className="rounded-3xl border border-line bg-card p-5 shadow-card min-[900px]:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{WEATHER_PLACE.name}</p>
              <p className="font-serif text-6xl leading-none text-ink">{weather ? `${weather.now.temperature}°` : '—'}</p>
              <p className="mt-2 text-sm text-muted">
                {weather
                  ? `${weatherLabel(weather.now.code)} · feels ${weather.now.apparent}° · wind ${weather.now.wind} km/h`
                  : 'Weather will appear when Open-Meteo answers.'}
              </p>
            </div>
            {weather && <WeatherGlyph code={weather.now.code} className="h-14 w-14 text-sage" />}
          </div>
          <div className="mt-5 grid grid-cols-5 gap-1">
            {(weather?.days ?? []).map((day) => (
              <div key={day.date} className="rounded-2xl bg-paper px-1 py-2 text-center">
                <p className="text-[11px] uppercase tracking-wide text-muted">{day.date === today ? 'Today' : formatDay(day.date, { weekday: 'short' })}</p>
                <WeatherGlyph code={day.code} className="mx-auto mt-1 h-5 w-5 text-sage" />
                <p className="mt-1 text-sm font-medium text-ink">{day.high}°</p>
                <p className="text-xs text-muted">{day.low}°</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-line bg-card p-5 shadow-card min-[900px]:col-span-3">
          <h2 className="font-serif text-2xl">Tonight and still open</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-clay-soft px-3 py-3">
              <dt className="text-xs uppercase tracking-[0.14em] text-clay-deep">Dinner</dt>
              <dd className="mt-1 font-medium text-ink">{dinner || 'Nothing planned'}</dd>
            </div>
            <div className="rounded-2xl bg-sage-soft px-3 py-3">
              <dt className="text-xs uppercase tracking-[0.14em] text-sage-deep">Chores today</dt>
              <dd className="mt-1 font-medium text-ink">{openChores.length === 0 ? 'All done' : `${openChores.length} left`}</dd>
            </div>
            <div className="rounded-2xl bg-paper px-3 py-3">
              <dt className="text-xs uppercase tracking-[0.14em] text-muted">Shopping</dt>
              <dd className="mt-1 font-medium text-ink">{shoppingLeft === 0 ? 'List is clear' : `${shoppingLeft} to buy`}</dd>
            </div>
          </dl>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Up next</h3>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No upcoming events. Add calendar links on House.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {upcoming.map((event) => (
                <li key={`${event.uid}-${event.start}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{event.title}</span>
                    <span className="text-xs text-muted">{PEOPLE[event.person].name}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">{eventWhen(event)}</span>
                </li>
              ))}
            </ul>
          )}
          {openChores.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Next chore: {openChores[0] ? choreLine(openChores[0]) : ''}
            </p>
          )}
        </section>
      </div>
      <div className="shrink-0">
        <Marquee />
      </div>
    </div>
  );
}

function choreLine(chore: Chore): string {
  const who = chore.assignee === 'both' ? 'both' : PEOPLE[chore.assignee].name;
  return `${chore.title} (${who})`;
}
