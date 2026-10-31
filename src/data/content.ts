import type { Chore, MealSlot, PersonId, ShoppingItem, StripItem } from '../types';
import { addDays, mondayOf, todayIso } from '../lib/dates';

export const PEOPLE: Record<PersonId, { name: string; initial: string }> = {
  sehrish: { name: 'Sehrish', initial: 'S' },
  andre: { name: 'André', initial: 'A' },
};

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

const recipes: StripItem[] = [
  { kind: 'recipe', title: 'Tomato pasta', minutes: 20, note: 'Garlic, tinned tomatoes, pasta, olive oil. Enough for two.' },
  { kind: 'recipe', title: 'Red lentil soup', minutes: 40, note: 'Lentils, carrot, cumin, and lemon. It freezes well.' },
  { kind: 'recipe', title: 'Sheet-pan chicken', minutes: 45, note: 'Thighs, potatoes, and onion on one tray.' },
  { kind: 'recipe', title: 'Shakshuka', minutes: 25, note: 'Eggs in spiced tomato. Serve with bread.' },
  { kind: 'recipe', title: 'Chickpea curry', minutes: 30, note: 'Chickpeas, coconut milk, spinach, and curry powder.' },
  { kind: 'recipe', title: 'Baked salmon', minutes: 20, note: 'Salmon, lemon, and green beans on the same tray.' },
  { kind: 'recipe', title: 'Veggie fried rice', minutes: 20, note: 'Cold rice, egg, frozen peas, and soy sauce.' },
  { kind: 'recipe', title: 'Overnight oats', minutes: 5, note: 'Oats, yogurt, and fruit. Set the jars out tonight.' },
  { kind: 'recipe', title: 'Pasta al limone', minutes: 20, note: 'Lemon, butter, parmesan, and a ladle of pasta water.' },
  { kind: 'recipe', title: 'Potato frittata', minutes: 30, note: 'Eggs, boiled potatoes, and whatever greens are left.' },
];

const tips: StripItem[] = [
  { kind: 'tip', title: 'Warm hob', note: 'Wipe the hob while it is warm, not hot. Spills lift off before they bake on.' },
  { kind: 'tip', title: 'The cloth', note: 'Do not leave a wet cloth on the tap. It smells by morning. Hang it open.' },
  { kind: 'tip', title: 'Before the shop', note: 'Empty one fridge drawer first so this week’s leftovers get eaten.' },
  { kind: 'tip', title: 'After a shower', note: 'Open a window for five minutes. The fan on its own is not enough.' },
  { kind: 'tip', title: 'Cardboard', note: 'Flatten boxes the same day so the recycling still closes.' },
  { kind: 'tip', title: 'The kettle', note: 'Descale when you can see a chalky ring. Vinegar, then a boil of clean water.' },
  { kind: 'tip', title: 'Weeknight floor', note: 'A damp microfiber on the kitchen floor beats a mop most evenings.' },
  { kind: 'tip', title: 'After frying', note: 'Leave the extractor on for ten minutes so the flat does not hold the smell.' },
  { kind: 'tip', title: 'The sponge', note: 'Rinse and squeeze it out tonight. Replace it once a week.' },
  { kind: 'tip', title: 'The mat', note: 'Shake the doormat. Most of the grit in the flat starts there.' },
];

export const STRIP: StripItem[] = recipes.flatMap((recipe, index) => [recipe, tips[index]!]);

const WEEK_PLAN: Record<MealSlot, string>[] = [
  { breakfast: 'Oats and fruit', lunch: 'Leftovers', dinner: 'Tomato pasta' },
  { breakfast: 'Eggs on toast', lunch: 'Lentil soup', dinner: 'Sheet-pan chicken' },
  { breakfast: 'Yogurt and honey', lunch: 'Sandwiches', dinner: 'Chickpea curry' },
  { breakfast: 'Overnight oats', lunch: 'Leftovers', dinner: 'Baked salmon' },
  { breakfast: 'Eggs', lunch: 'Salad', dinner: 'Shakshuka' },
  { breakfast: 'Pancakes', lunch: 'Soup', dinner: 'Potato frittata' },
  { breakfast: 'Yogurt', lunch: 'Roast vegetables', dinner: 'Veggie fried rice' },
];

export function seedMeals(today = todayIso()): Record<string, Partial<Record<MealSlot, string>>> {
  const monday = mondayOf(today);
  const meals: Record<string, Partial<Record<MealSlot, string>>> = {};
  WEEK_PLAN.forEach((plan, index) => {
    meals[addDays(monday, index)] = { ...plan };
  });
  return meals;
}

export function seedChores(): Chore[] {
  const rows: Array<Omit<Chore, 'id' | 'completedOn'>> = [
    { title: 'Wipe counters and hob', assignee: 'both', cadence: 'daily', weekday: 0 },
    { title: 'Dishes and drying rack', assignee: 'both', cadence: 'daily', weekday: 0 },
    { title: 'Reset the sink', assignee: 'sehrish', cadence: 'daily', weekday: 0 },
    { title: 'Take out rubbish', assignee: 'andre', cadence: 'weekly', weekday: 3 },
    { title: 'Recycling', assignee: 'andre', cadence: 'weekly', weekday: 3 },
    { title: 'Vacuum the flat', assignee: 'sehrish', cadence: 'weekly', weekday: 6 },
    { title: 'Bathroom', assignee: 'both', cadence: 'weekly', weekday: 0 },
    { title: 'Water plants', assignee: 'sehrish', cadence: 'weekly', weekday: 2 },
    { title: 'Change sheets', assignee: 'andre', cadence: 'weekly', weekday: 5 },
    { title: 'Laundry', assignee: 'sehrish', cadence: 'weekly', weekday: 1 },
  ];
  return rows.map((row, index) => ({ ...row, id: `chore-${index + 1}`, completedOn: [] }));
}

export function seedShopping(): ShoppingItem[] {
  return ['Oat milk', 'Eggs', 'Bread', 'Lemons', 'Oats'].map((name, index) => ({
    id: `shop-${index + 1}`,
    name,
    done: false,
  }));
}
