import type { CalendarEvent, TimerState, WeatherReport } from '../types';
import { formatClock, formatLongDate, todayIso } from '../lib/dates';
import { WEATHER_PLACE, weatherLabel } from '../lib/weather';
import { WeatherGlyph } from '../components/Icons';

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function LockScreen({
  now,
  weather,
  nextEvent,
  timer,
  onWake,
}: {
  now: Date;
  weather: WeatherReport | null;
  nextEvent: CalendarEvent | null;
  timer: TimerState;
  onWake: () => void;
}) {
  const timerVisible = timer.status === 'running' || timer.status === 'paused' || timer.status === 'done';
  return (
    <button
      type="button"
      onClick={onWake}
      className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-paper px-8 py-10 text-left sm:px-14"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-sage/15 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-clay/15 blur-3xl" />
        <svg className="absolute right-[-2rem] top-8 hidden h-[28rem] w-[28rem] text-sage/25 min-[800px]:block" viewBox="0 0 200 200" fill="none">
          <path d="M120 20c20 30 10 60-10 74 30 4 58-8 70 18-28 8-40 36-34 62-24-18-52-16-74-4 4-28-12-50-36-58 26-14 30-40 22-64 22 10 42-6 62-28z" fill="currentColor" />
        </svg>
      </div>
      <p className="relative text-xs font-semibold uppercase tracking-[0.28em] text-sage">Our Home</p>
      <div className="relative">
        <p className="font-serif text-[18vw] leading-none text-ink min-[800px]:text-[8.5rem]">{formatClock(now)}</p>
        <p className="mt-3 font-serif text-3xl text-ink">{formatLongDate(todayIso(now))}</p>
        <p className="mt-3 flex items-center gap-2 text-lg text-muted">
          {weather ? (
            <>
              <WeatherGlyph code={weather.now.code} className="h-6 w-6 text-sage" />
              <span>
                {weather.now.temperature}° · {weatherLabel(weather.now.code)} · {WEATHER_PLACE.name}
              </span>
            </>
          ) : (
            <span>{WEATHER_PLACE.name}</span>
          )}
        </p>
        {nextEvent && (
          <p className="mt-6 inline-flex max-w-xl rounded-2xl bg-clay-soft px-4 py-3 text-ink">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-clay-deep">Next up</span>
              <span className="font-medium">{nextEvent.title}</span>
            </span>
          </p>
        )}
        {timerVisible && (
          <p className="mt-4 inline-flex rounded-2xl bg-sage-soft px-4 py-3 text-sage-deep">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                {timer.status === 'done' ? "Time's up" : 'Kitchen timer'}
              </span>
              <span className="font-serif text-3xl">{timer.status === 'done' ? timer.label || 'Ready' : formatRemaining(timer.remainingMs)}</span>
            </span>
          </p>
        )}
      </div>
      <p className="relative animate-pulse text-sm uppercase tracking-[0.22em] text-muted motion-reduce:animate-none">Tap anywhere to wake</p>
    </button>
  );
}
