import { seedChores, seedMeals, seedShopping } from '../data/content';
import type { CalendarCache, Chore, ShoppingItem, Store, TimerState } from '../types';

const STORE_KEY = 'our-home.v1';
const TIMER_KEY = 'our-home.timer.v1';

export const EMPTY_CALENDAR: CalendarCache = { fetchedAt: null, events: [], errors: {} };

export function defaultTimer(): TimerState {
  return {
    status: 'idle',
    durationMs: 10 * 60 * 1000,
    remainingMs: 10 * 60 * 1000,
    endsAt: null,
    label: '',
  };
}

export function createDefaultStore(): Store {
  return {
    version: 1,
    meals: seedMeals(),
    chores: seedChores(),
    shopping: seedShopping(),
    settings: { calendars: { sehrish: '', andre: '' } },
    calendarCache: EMPTY_CALENDAR,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hydrate(raw: unknown): Store {
  const base = createDefaultStore();
  if (!isRecord(raw)) return base;
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const calendars = isRecord(settings.calendars) ? settings.calendars : {};
  const cache = isRecord(raw.calendarCache) ? raw.calendarCache : {};
  return {
    version: 1,
    meals: isRecord(raw.meals) ? (raw.meals as Store['meals']) : base.meals,
    chores: Array.isArray(raw.chores) ? (raw.chores as Chore[]) : base.chores,
    shopping: Array.isArray(raw.shopping) ? (raw.shopping as ShoppingItem[]) : base.shopping,
    settings: {
      calendars: {
        sehrish: typeof calendars.sehrish === 'string' ? calendars.sehrish : '',
        andre: typeof calendars.andre === 'string' ? calendars.andre : '',
      },
    },
    calendarCache: {
      fetchedAt: typeof cache.fetchedAt === 'number' ? cache.fetchedAt : null,
      events: Array.isArray(cache.events) ? (cache.events as CalendarCache['events']) : [],
      errors: isRecord(cache.errors) ? (cache.errors as CalendarCache['errors']) : {},
    },
  };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createDefaultStore();
    return hydrate(JSON.parse(raw));
  } catch {
    return createDefaultStore();
  }
}

export function saveStore(store: Store): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function loadTimer(): TimerState {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return defaultTimer();
    const parsed = JSON.parse(raw) as TimerState;
    if (!parsed || typeof parsed.durationMs !== 'number') return defaultTimer();
    if (parsed.status === 'running' && parsed.endsAt) {
      const remainingMs = parsed.endsAt - Date.now();
      if (remainingMs <= 0) return { ...parsed, status: 'done', remainingMs: 0, endsAt: null };
      return { ...parsed, remainingMs };
    }
    return parsed;
  } catch {
    return defaultTimer();
  }
}

export function saveTimer(timer: TimerState): void {
  localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
}
