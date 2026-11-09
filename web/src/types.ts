export type PersonId = 'sehrish' | 'andre';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export type ScreenId = 'home' | 'calendar' | 'meals' | 'chores' | 'tasks' | 'house';

export type Chore = {
  id: string;
  title: string;
  assignee: PersonId | 'both';
  cadence: 'daily' | 'weekly';
  /** 0 Sunday … 6 Saturday. Used when cadence is weekly. */
  weekday: number;
  completedOn: string[];
  updatedAt?: number;
  deletedAt?: number;
};

export type ShoppingItem = {
  id: string;
  name: string;
  done: boolean;
  updatedAt?: number;
  deletedAt?: number;
};

export type TaskStatus = 'waiting' | 'in_progress' | 'done';

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  nextStep: string;
  dueDate: string | null;
  updatedAt: number;
  deletedAt?: number;
  todoistId?: string;
  todoistSyncedAt?: number;
};

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  updatedAt: number;
  deletedAt?: number;
};

export type StickyNote = {
  text: string;
  updatedAt: number;
};

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export type TimerState = {
  status: TimerStatus;
  durationMs: number;
  remainingMs: number;
  endsAt: number | null;
  label: string;
};

export type CalendarEvent = {
  uid: string;
  person: PersonId;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
};

export type CalendarCache = {
  fetchedAt: number | null;
  events: CalendarEvent[];
  errors: Partial<Record<PersonId, string>>;
};

export type Store = {
  version: 1;
  meals: Record<string, Partial<Record<MealSlot, string>> & { updatedAt?: number }>;
  chores: Chore[];
  shopping: ShoppingItem[];
  tasks: Task[];
  note: StickyNote;
  checklists: ChecklistItem[];
  settings: {
    calendars: Record<PersonId, string>;
    /** Cloudflare ICS proxy base URL. Empty uses VITE_ICS_PROXY, which defaults to empty. */
    icsProxy: string;
  };
  calendarCache: CalendarCache;
};

export type WeatherNow = {
  temperature: number;
  apparent: number;
  code: number;
  wind: number;
  humidity: number;
};

export type WeatherDay = {
  date: string;
  code: number;
  high: number;
  low: number;
  rain: number | null;
};

export type WeatherReport = {
  fetchedAt: number;
  now: WeatherNow;
  days: WeatherDay[];
};

export type StripItem =
  | { kind: 'recipe'; title: string; minutes: number; note: string }
  | { kind: 'tip'; title: string; note: string };
