import type { Store } from '../types';

export const SYNC_URL = 'https://our-home-sync.sia-ansari11.workers.dev';
const KEY = 'our-home.household';

export type SyncDoc = Pick<Store, 'chores' | 'meals' | 'shopping' | 'tasks' | 'note' | 'checklists'>;

export function householdKey(): string {
  return localStorage.getItem(KEY) || '';
}

export function saveHouseholdKey(value: string): void {
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(KEY, trimmed);
  else localStorage.removeItem(KEY);
}

function byId<T extends { id: string; updatedAt?: number; deletedAt?: number }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of [...remote, ...local]) {
    const prev = map.get(item.id);
    if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) map.set(item.id, item);
  }
  return [...map.values()];
}

export function mergeDocs(local: SyncDoc, remote: SyncDoc): SyncDoc {
  const meals = { ...remote.meals };
  for (const [day, meal] of Object.entries(local.meals)) {
    const other = meals[day];
    if (!other || (meal.updatedAt || 0) >= (other.updatedAt || 0)) meals[day] = meal;
  }
  const note = (local.note.updatedAt || 0) >= (remote.note.updatedAt || 0) ? local.note : remote.note;
  return {
    chores: byId(local.chores, remote.chores),
    shopping: byId(local.shopping, remote.shopping),
    tasks: byId(local.tasks, remote.tasks),
    checklists: byId(local.checklists, remote.checklists),
    meals,
    note,
  };
}

export function docFromStore(store: Store): SyncDoc {
  return {
    chores: store.chores,
    meals: store.meals,
    shopping: store.shopping,
    tasks: store.tasks,
    note: store.note,
    checklists: store.checklists,
  };
}

async function request(path: string, key: string, init?: RequestInit): Promise<SyncDoc | null> {
  const response = await fetch(`${SYNC_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Household-Key': key,
      ...(init?.headers || {}),
    },
  });
  if (response.status === 401) throw new Error('Household key was rejected.');
  if (!response.ok) throw new Error(`Sync responded ${response.status}.`);
  return (await response.json()) as SyncDoc;
}

export async function pullState(key: string): Promise<SyncDoc | null> {
  return request('/v1/state', key);
}

export async function pushState(key: string, doc: SyncDoc): Promise<SyncDoc | null> {
  return request('/v1/state', key, { method: 'PUT', body: JSON.stringify(doc) });
}

export async function syncTodoist(key: string): Promise<SyncDoc | null> {
  return request('/v1/todoist', key, { method: 'POST', body: '{}' });
}
