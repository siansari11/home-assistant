import type { ScreenId } from '../types';
import { CalendarIcon, ChoresIcon, HomeIcon, HouseIcon, MealsIcon } from './Icons';

const ITEMS: { id: ScreenId; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'meals', label: 'Meals', Icon: MealsIcon },
  { id: 'chores', label: 'Chores', Icon: ChoresIcon },
  { id: 'house', label: 'House', Icon: HouseIcon },
];

export function NavBar({ current, onChange }: { current: ScreenId; onChange: (screen: ScreenId) => void }) {
  return (
    <nav
      aria-label="Dashboard"
      className="order-last flex shrink-0 justify-around gap-1 border-t border-line bg-card/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] min-[900px]:order-first min-[900px]:w-[5.75rem] min-[900px]:flex-col min-[900px]:justify-start min-[900px]:border-r min-[900px]:border-t-0 min-[900px]:px-2 min-[900px]:py-4"
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const active = current === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-medium min-[900px]:flex-none min-[900px]:py-3 ${
              active ? 'bg-sage text-white' : 'text-muted hover:bg-sage-soft hover:text-ink'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
