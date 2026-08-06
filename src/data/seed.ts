import type { HouseholdState, Person } from "../types";

export const PEOPLE: Person[] = [
  {
    id: "p-robin",
    name: "Robin",
    emoji: "🧔",
    gender: "mann",
    age: 30,
    heightCm: 183,
    weightKg: 90,
    activityLevel: "moderat_aktiv",
    goal: "ned",
    goalRateKgPerWeek: 0.4,
    color: "orange",
    weightHidden: false,
  },
  {
    id: "p-mina",
    name: "Mina",
    emoji: "👩",
    gender: "kvinne",
    age: 28,
    heightCm: 167,
    weightKg: 64,
    activityLevel: "moderat_aktiv",
    goal: "ned",
    goalRateKgPerWeek: 0.3,
    color: "yellow",
    weightHidden: false,
  },
];

export const DEFAULT_CATEGORY_ORDER = [
  "Grønnsaker",
  "Frukt",
  "Kjøtt & Fisk",
  "Meieri",
  "Kornvarer",
  "Fett & Olje",
  "Krydder",
  "Annet",
];

// No dummy foods/recipes/meals — everything now comes from the Kassal search or is built
// manually via "Ny oppskrift". Empty on first run; Supabase gets seeded with just the two
// people + default category order (see seedSupabaseIfEmpty in lib/householdSync.ts).
export function createInitialState(): HouseholdState {
  return {
    people: PEOPLE,
    foods: [],
    recipes: [],
    weekPlan: [],
    groceryChecked: {},
    categoryOrder: DEFAULT_CATEGORY_ORDER,
  };
}
