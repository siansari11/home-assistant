import type { Chore } from '../types';
import { isoWeekKey, isoWeekday } from './dates';

export function isChoreDone(chore: Chore, today: string): boolean {
  if (chore.cadence === 'daily') return chore.completedOn.includes(today);
  const week = isoWeekKey(today);
  return chore.completedOn.some((date) => isoWeekKey(date) === week);
}

export function toggleChore(chore: Chore, today: string): Chore {
  const done = isChoreDone(chore, today);
  if (chore.cadence === 'daily') {
    const completedOn = done
      ? chore.completedOn.filter((date) => date !== today)
      : [...chore.completedOn, today].slice(-90);
    return { ...chore, completedOn };
  }
  const week = isoWeekKey(today);
  const completedOn = done
    ? chore.completedOn.filter((date) => isoWeekKey(date) !== week)
    : [...chore.completedOn, today].slice(-90);
  return { ...chore, completedOn };
}

export function isDueToday(chore: Chore, today: string): boolean {
  if (chore.cadence === 'daily') return true;
  return isoWeekday(today) === chore.weekday;
}
