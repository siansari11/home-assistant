import type { CalendarEvent, PersonId } from '../types';
import { TZ, zonedParts, zonedTimeToUtc } from './dates';

type Prop = { name: string; params: Record<string, string>; value: string };

type RawEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  rrule?: string;
  recurrenceId?: Date;
  timeZone: string;
};

function unfold(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseProp(line: string): Prop | null {
  const idx = line.indexOf(':');
  if (idx <= 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const [nameRaw, ...paramParts] = left.split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: nameRaw.toUpperCase(), params, value };
}

function parseDate(value: string, params: Record<string, string>, fallbackZone: string): { date: Date; allDay: boolean; timeZone: string } | null {
  const raw = value.trim();
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6));
    const day = Number(raw.slice(6, 8));
    if (!year || !month || !day) return null;
    return { date: new Date(Date.UTC(year, month - 1, day)), allDay: true, timeZone: 'UTC' };
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (match[7] === 'Z') {
    return { date: new Date(Date.UTC(year, month - 1, day, hour, minute, second)), allDay: false, timeZone: 'UTC' };
  }
  const timeZone = params.TZID || fallbackZone || TZ;
  return {
    date: zonedTimeToUtc(year, month, day, hour, minute, second, timeZone),
    allDay: false,
    timeZone,
  };
}

function first(props: Prop[] | undefined): Prop | undefined {
  return props?.[0];
}

function toRaw(bag: Record<string, Prop[]>): RawEvent | null {
  const startProp = first(bag.DTSTART);
  if (!startProp) return null;
  const start = parseDate(startProp.value, startProp.params, TZ);
  if (!start) return null;
  const endProp = first(bag.DTEND);
  let end = endProp ? parseDate(endProp.value, endProp.params, start.timeZone) : null;
  if (!end) {
    end = {
      date: new Date(start.date.getTime() + (start.allDay ? 86400000 : 3600000)),
      allDay: start.allDay,
      timeZone: start.timeZone,
    };
  }
  const recurrenceProp = first(bag['RECURRENCE-ID']);
  const recurrence = recurrenceProp ? parseDate(recurrenceProp.value, recurrenceProp.params, start.timeZone) : null;
  const uid = first(bag.UID)?.value.trim() || `${start.date.toISOString()}-${first(bag.SUMMARY)?.value ?? 'event'}`;
  const title = unescapeText(first(bag.SUMMARY)?.value || 'Busy');
  const location = first(bag.LOCATION)?.value ? unescapeText(first(bag.LOCATION)!.value) : undefined;
  return {
    uid,
    title,
    start: start.date,
    end: end.date,
    allDay: start.allDay,
    location,
    rrule: first(bag.RRULE)?.value,
    recurrenceId: recurrence?.date,
    timeZone: start.timeZone,
  };
}

function ruleMap(rrule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rrule.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

const DAY_CODE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function mondayMillis(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.getTime();
}

function nextIso(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function expand(master: RawEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  if (!master.rrule) return [master.start];
  const rule = ruleMap(master.rrule);
  const freq = rule.FREQ || 'DAILY';
  const interval = Math.max(1, Number(rule.INTERVAL || 1));
  const countCap = rule.COUNT ? Number(rule.COUNT) : 800;
  const zone = master.timeZone || TZ;
  let until = rangeEnd;
  if (rule.UNTIL) {
    const parsed = parseDate(rule.UNTIL, rule.UNTIL.endsWith('Z') ? {} : { TZID: zone }, zone);
    if (parsed && parsed.date < until) until = parsed.date;
  }
  const byday = rule.BYDAY?.split(',').map((code) => code.replace(/^[+-]?\d+/, '')) ?? null;
  const origin = zonedParts(master.start, zone);
  const originWeekday = DAY_CODE[new Date(Date.UTC(origin.year, origin.month - 1, origin.day)).getUTCDay()] ?? 'MO';
  const weekdays = byday && byday.length ? byday : [originWeekday];
  const originMonday = mondayMillis(origin.year, origin.month, origin.day);
  const windowIso = zonedParts(new Date(rangeStart.getTime() - 14 * 86400000), zone).iso;
  let iso = rule.COUNT || origin.iso > windowIso ? origin.iso : windowIso;
  if (iso < origin.iso) iso = origin.iso;
  const endIso = zonedParts(until, zone).iso;
  const instances: Date[] = [];
  let seen = 0;

  for (let guard = 0; guard < 2000 && iso <= endIso && seen < countCap; guard++) {
    const [year, month, day] = iso.split('-').map(Number);
    const weekday = DAY_CODE[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? 'MO';
    const dayNumber = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(origin.year, origin.month - 1, origin.day)) / 86400000);
    const weeksBetween = Math.round((mondayMillis(year, month, day) - originMonday) / (7 * 86400000));
    const monthsBetween = (year - origin.year) * 12 + (month - origin.month);
    let match = false;
    if (freq === 'DAILY') match = dayNumber >= 0 && dayNumber % interval === 0;
    else if (freq === 'WEEKLY') match = weeksBetween >= 0 && weeksBetween % interval === 0 && weekdays.includes(weekday);
    else if (freq === 'MONTHLY') match = monthsBetween >= 0 && monthsBetween % interval === 0 && day === origin.day;
    else if (freq === 'YEARLY') match = year >= origin.year && (year - origin.year) % interval === 0 && month === origin.month && day === origin.day;
    if (match) {
      seen += 1;
      const date = master.allDay
        ? new Date(Date.UTC(year, month - 1, day))
        : zonedTimeToUtc(year, month, day, origin.hour, origin.minute, origin.second, zone);
      if (date.getTime() <= until.getTime() && date.getTime() >= rangeStart.getTime() - 14 * 86400000) {
        instances.push(date);
      }
    }
    iso = nextIso(iso);
  }
  return instances.length ? instances : [master.start];
}

function overlaps(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return start.getTime() < rangeEnd.getTime() && end.getTime() > rangeStart.getTime();
}

export function parseIcs(text: string, person: PersonId, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const lines = unfold(text).split('\n');
  const raws: RawEvent[] = [];
  let bag: Record<string, Prop[]> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      bag = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (bag) {
        const raw = toRaw(bag);
        if (raw) raws.push(raw);
      }
      bag = null;
      continue;
    }
    if (!bag || !line) continue;
    const prop = parseProp(line);
    if (!prop) continue;
    (bag[prop.name] ||= []).push(prop);
  }

  const exceptions = new Map<string, RawEvent[]>();
  const masters: RawEvent[] = [];
  for (const raw of raws) {
    if (raw.recurrenceId) {
      const list = exceptions.get(raw.uid) ?? [];
      list.push(raw);
      exceptions.set(raw.uid, list);
    } else masters.push(raw);
  }

  const events: CalendarEvent[] = [];
  const seen = new Set<string>();
  const add = (raw: RawEvent, start: Date) => {
    const duration = Math.max(60_000, raw.end.getTime() - raw.start.getTime());
    const end = new Date(start.getTime() + duration);
    if (!overlaps(start, end, rangeStart, rangeEnd)) return;
    const key = `${raw.uid}|${start.toISOString()}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push({
      uid: raw.uid,
      person,
      title: raw.title,
      start: raw.allDay ? start.toISOString().slice(0, 10) : start.toISOString(),
      end: raw.allDay ? end.toISOString().slice(0, 10) : end.toISOString(),
      allDay: raw.allDay,
      location: raw.location,
    });
  };

  for (const master of masters) {
    const skips = new Set((exceptions.get(master.uid) ?? []).map((item) => item.recurrenceId!.toISOString()));
    for (const start of expand(master, rangeStart, rangeEnd)) {
      if (skips.has(start.toISOString())) continue;
      add(master, start);
    }
    for (const exception of exceptions.get(master.uid) ?? []) add(exception, exception.start);
  }

  for (const [uid, list] of exceptions) {
    if (masters.some((master) => master.uid === uid)) continue;
    for (const exception of list) add(exception, exception.start);
  }

  events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  return events;
}

export function normalizeCalendarUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('webcal://')) return `https://${trimmed.slice('webcal://'.length)}`;
  if (trimmed.startsWith('webcals://')) return `https://${trimmed.slice('webcals://'.length)}`;
  return trimmed;
}

const FETCH_TIMEOUT_MS = 28_000;
const DIRECT_TIMEOUT_MS = 10_000;
const BROKEN_FOR_MS = 6 * 60 * 60 * 1000;
const BROKEN_KEY = 'our-home.ics-broken-hosts';

/** Public proxies that currently fail (401 or gateway timeout) and must not block sync. */
const SKIP_PUBLIC_HOSTS = new Set(['corsproxy.io', 'api.allorigins.win', 'api.codetabs.com']);

const PUBLIC_PROXIES: Array<(url: string) => string> = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

type AttemptFailure = { timedOut: boolean; cors: boolean; message: string };

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function readBrokenHosts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BROKEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function brokenHost(url: string): boolean {
  const host = hostOf(url);
  if (!host || SKIP_PUBLIC_HOSTS.has(host)) return true;
  const until = readBrokenHosts()[host] ?? 0;
  return until > Date.now();
}

function markBroken(url: string): void {
  const host = hostOf(url);
  if (!host) return;
  const next = readBrokenHosts();
  next[host] = Date.now() + BROKEN_FOR_MS;
  try {
    localStorage.setItem(BROKEN_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function configuredProxy(stored: string | undefined): string {
  const fromSettings = (stored ?? '').trim();
  if (fromSettings) return fromSettings;
  return (import.meta.env.VITE_ICS_PROXY ?? '').trim();
}

export function proxyRequestUrl(proxyBase: string, icsUrl: string): string {
  const base = proxyBase.trim();
  const endpoint = new URL(base.includes('://') ? base : `https://${base}`);
  endpoint.searchParams.set('url', icsUrl);
  return endpoint.toString();
}

function isTimeout(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return name === 'TimeoutError' || name === 'AbortError' || /timed out|signal timed out|aborted due to timeout/i.test(message);
}

function isCors(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /failed to fetch|networkerror|load failed|cors/i.test(message);
}

async function readCalendar(url: string, timeoutMs: number): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'text/calendar, text/plain, */*' },
  });
  if (!response.ok) {
    throw new Error(`Calendar responded ${response.status}.`);
  }
  const text = await response.text();
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('That link did not return a calendar.');
  }
  return text;
}

function failureMessage(failures: AttemptFailure[], usedProxy: boolean): string {
  if (failures.some((failure) => failure.timedOut)) {
    return usedProxy
      ? 'Timed out fetching the calendar — the proxy did not answer. Paste the .ics file on this screen.'
      : 'Timed out fetching the calendar — try the proxy, or paste the .ics file on this screen.';
  }
  if (failures.some((failure) => failure.cors) || !usedProxy) {
    return 'The browser blocked this calendar link. Paste the .ics file on this screen, or set your Cloudflare proxy URL below.';
  }
  return failures.at(-1)?.message || 'Could not download the calendar. Paste the .ics file on this screen.';
}

export async function fetchIcs(url: string, proxyUrl = ''): Promise<string> {
  const normalized = normalizeCalendarUrl(url);
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('Use an https or webcal link, or paste the .ics file.');
  }

  const failures: AttemptFailure[] = [];
  try {
    return await readCalendar(normalized, DIRECT_TIMEOUT_MS);
  } catch (error) {
    failures.push({
      timedOut: isTimeout(error),
      cors: isCors(error),
      message: error instanceof Error ? error.message : 'Could not download the calendar.',
    });
  }

  const owned = proxyUrl.trim();
  if (owned) {
    let viaProxy = '';
    try {
      viaProxy = proxyRequestUrl(owned, normalized);
    } catch {
      failures.push({ timedOut: false, cors: false, message: 'The proxy URL is not a valid https address.' });
    }
    if (viaProxy && !brokenHost(viaProxy)) {
      try {
        return await readCalendar(viaProxy, FETCH_TIMEOUT_MS);
      } catch (error) {
        if (isTimeout(error) || (error instanceof Error && /responded 5/.test(error.message))) markBroken(viaProxy);
        failures.push({
          timedOut: isTimeout(error),
          cors: isCors(error),
          message: error instanceof Error ? error.message : 'Proxy failed.',
        });
      }
    }
  }

  const pending: Array<Promise<string>> = [];
  for (const make of PUBLIC_PROXIES) {
    const attempt = make(normalized);
    if (brokenHost(attempt)) continue;
    pending.push(
      readCalendar(attempt, FETCH_TIMEOUT_MS).catch((error: unknown) => {
        if (isTimeout(error) || (error instanceof Error && /responded 5|responded 401|did not return/.test(error.message))) {
          markBroken(attempt);
        }
        failures.push({
          timedOut: isTimeout(error),
          cors: isCors(error),
          message: error instanceof Error ? error.message : 'Public proxy failed.',
        });
        throw error;
      }),
    );
  }
  if (pending.length) {
    try {
      return await Promise.any(pending);
    } catch {
      /* failures already recorded */
    }
  }

  throw new Error(failureMessage(failures, Boolean(owned)));
}
