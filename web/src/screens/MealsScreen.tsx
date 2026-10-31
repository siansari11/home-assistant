import { useState } from 'react';
import type { MealSlot, Store } from '../types';
import { MEAL_SLOTS } from '../data/content';
import { addDays, formatShortDate, mondayOf, todayIso } from '../lib/dates';

export function MealsScreen({
  now,
  store,
  onChange,
}: {
  now: Date;
  store: Store;
  onChange: (meals: Store['meals']) => void;
}) {
  const today = todayIso(now);
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const setMeal = (day: string, slot: MealSlot, value: string) => {
    onChange({
      ...store.meals,
      [day]: { ...store.meals[day], [slot]: value },
    });
  };

  const copyLastWeek = () => {
    const next = { ...store.meals };
    for (const day of days) {
      const previous = addDays(day, -7);
      next[day] = { ...(store.meals[previous] ?? {}) };
    }
    onChange(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-sage">Meals</p>
          <h1 className="font-serif text-4xl text-ink">The week</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            Previous
          </button>
          <button type="button" className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(mondayOf(today))}>
            This week
          </button>
          <button type="button" className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next
          </button>
          <button type="button" className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white" onClick={copyLastWeek}>
            Copy last week
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-2 overflow-auto min-[1100px]:grid-cols-7">
        {days.map((day) => (
          <section key={day} className={`rounded-3xl border bg-card p-3 ${day === today ? 'border-sage' : 'border-line'}`}>
            <h2 className="font-serif text-lg">{formatShortDate(day)}</h2>
            <div className="mt-2 space-y-2">
              {MEAL_SLOTS.map((slot) => (
                <label key={slot.id} className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{slot.label}</span>
                  <input
                    value={store.meals[day]?.[slot.id] ?? ''}
                    onChange={(event) => setMeal(day, slot.id, event.target.value)}
                    placeholder={slot.label}
                    className="mt-1 w-full rounded-xl border border-line bg-paper px-2 py-2 text-base text-ink outline-none focus:border-sage"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
