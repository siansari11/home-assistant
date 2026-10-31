export const TZ = 'Europe/Berlin';

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  iso: string;
};

export function zonedParts(date: Date, timeZone = TZ): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  const hour = Number(bag.hour) % 24;
  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);
  return {
    year,
    month,
    day,
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    iso: `${bag.year}-${bag.month}-${bag.day}`,
  };
}

export function todayIso(date = new Date()): string {
  return zonedParts(date).iso;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** 0 Sunday … 6 Saturday, from a calendar date. */
export function isoWeekday(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function mondayOf(iso: string): string {
  const weekday = isoWeekday(iso);
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(iso, delta);
}

export function isoWeekKey(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    ...opts,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatLongDate(iso: string): string {
  return formatDay(iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(iso: string): string {
  return formatDay(iso, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function formatTime(date: Date): string {
  return formatClock(date);
}

export function weekdayName(weekday: number, width: 'long' | 'short' = 'long'): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return width === 'short' ? short[weekday] ?? '' : names[weekday] ?? '';
}

export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = timeZoneOffsetMs(guess, timeZone);
  let instant = new Date(guess.getTime() - offset);
  const offsetAgain = timeZoneOffsetMs(instant, timeZone);
  if (offsetAgain !== offset) instant = new Date(guess.getTime() - offsetAgain);
  return instant;
}

export function greeting(date: Date): string {
  const hour = zonedParts(date).hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
