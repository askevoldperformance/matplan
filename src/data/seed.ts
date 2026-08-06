import type { FoodItem, HouseholdState, Person, PlannedMeal, Recipe } from "../types";
import { addDays, todayISO, startOfWeek } from "../utils/dates";

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

export const FOODS: FoodItem[] = [
  { id: "f-kylling", name: "Kyllingfilet", category: "Kjøtt & Fisk", icon: "🍗", pricePerUnit: 9,
    per100: { kcal: 165, protein: 31, fat: 3.6, saturatedFat: 1, carbs: 0, sugar: 0, fiber: 0, salt: 0.1 } },
  { id: "f-laks", name: "Laksefilet", category: "Kjøtt & Fisk", icon: "🐟", pricePerUnit: 18,
    per100: { kcal: 208, protein: 20, fat: 13, saturatedFat: 2.5, carbs: 0, sugar: 0, fiber: 0, salt: 0.1 } },
  { id: "f-kjottdeig", name: "Kjøttdeig 9%", category: "Kjøtt & Fisk", icon: "🥩", pricePerUnit: 7,
    per100: { kcal: 170, protein: 18, fat: 11, saturatedFat: 4.5, carbs: 0, sugar: 0, fiber: 0, salt: 0.15 } },
  { id: "f-villris", name: "Villris", category: "Kornvarer", icon: "🍚", pricePerUnit: 2,
    per100: { kcal: 357, protein: 7.5, fat: 2, saturatedFat: 0.3, carbs: 76, sugar: 0.7, fiber: 3, salt: 0 } },
  { id: "f-pasta", name: "Fullkornpasta", category: "Kornvarer", icon: "🍝", pricePerUnit: 2,
    per100: { kcal: 350, protein: 13, fat: 2, saturatedFat: 0.4, carbs: 68, sugar: 3, fiber: 8, salt: 0.01 } },
  { id: "f-havregryn", name: "Havregryn", category: "Kornvarer", icon: "🌾", pricePerUnit: 1.5,
    per100: { kcal: 375, protein: 13, fat: 7, saturatedFat: 1.3, carbs: 60, sugar: 1, fiber: 10, salt: 0 } },
  { id: "f-brodskive", name: "Brødskive, helkorn", category: "Kornvarer", icon: "🍞", pricePerUnit: 3,
    per100: { kcal: 250, protein: 9, fat: 3.5, saturatedFat: 0.5, carbs: 45, sugar: 4, fiber: 7, salt: 1.1 } },
  { id: "f-kokosmelk", name: "Kokosmelk", category: "Fett & Olje", icon: "🥥", pricePerUnit: 3,
    per100: { kcal: 190, protein: 2, fat: 19, saturatedFat: 17, carbs: 3, sugar: 3, fiber: 0, salt: 0 } },
  { id: "f-olivenolje", name: "Olivenolje", category: "Fett & Olje", icon: "🫒", pricePerUnit: 6,
    per100: { kcal: 884, protein: 0, fat: 100, saturatedFat: 14, carbs: 0, sugar: 0, fiber: 0, salt: 0 } },
  { id: "f-karripulver", name: "Karripulver", category: "Krydder", icon: "🟠", pricePerUnit: 8,
    per100: { kcal: 325, protein: 13, fat: 14, saturatedFat: 1, carbs: 58, sugar: 3, fiber: 35, salt: 0.1 } },
  { id: "f-egg", name: "Egg", category: "Annet", icon: "🥚", pricePerUnit: 5,
    per100: { kcal: 155, protein: 13, fat: 11, saturatedFat: 3.3, carbs: 1.1, sugar: 1.1, fiber: 0, salt: 0.4 } },
  { id: "f-kaffe", name: "Kaffe, svart", category: "Annet", icon: "☕️", pricePerUnit: 1,
    per100: { kcal: 2, protein: 0.1, fat: 0, saturatedFat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 } },
  { id: "f-salatmiks", name: "Salatmiks", category: "Grønnsaker", icon: "🥬", pricePerUnit: 4,
    per100: { kcal: 15, protein: 1.4, fat: 0.2, saturatedFat: 0, carbs: 2.9, sugar: 1.5, fiber: 1.3, salt: 0.03 } },
  { id: "f-cherrytomat", name: "Cherrytomater", category: "Grønnsaker", icon: "🍅", pricePerUnit: 4,
    per100: { kcal: 18, protein: 0.9, fat: 0.2, saturatedFat: 0, carbs: 3.9, sugar: 2.6, fiber: 1.2, salt: 0 } },
  { id: "f-agurk", name: "Agurk", category: "Grønnsaker", icon: "🥒", pricePerUnit: 2,
    per100: { kcal: 12, protein: 0.6, fat: 0.1, saturatedFat: 0, carbs: 2.2, sugar: 1.7, fiber: 0.5, salt: 0 } },
  { id: "f-paprika", name: "Paprika, rød", category: "Grønnsaker", icon: "🫑", pricePerUnit: 4,
    per100: { kcal: 31, protein: 1, fat: 0.3, saturatedFat: 0, carbs: 6, sugar: 4.2, fiber: 2.1, salt: 0 } },
  { id: "f-brokkoli", name: "Brokkoli", category: "Grønnsaker", icon: "🥦", pricePerUnit: 3,
    per100: { kcal: 34, protein: 2.8, fat: 0.4, saturatedFat: 0, carbs: 6.6, sugar: 1.7, fiber: 2.6, salt: 0.03 } },
  { id: "f-lok", name: "Løk", category: "Grønnsaker", icon: "🧅", pricePerUnit: 1.5,
    per100: { kcal: 40, protein: 1.1, fat: 0.1, saturatedFat: 0, carbs: 9.3, sugar: 4.2, fiber: 1.7, salt: 0 } },
  { id: "f-hvitlok", name: "Hvitløk", category: "Grønnsaker", icon: "🧄", pricePerUnit: 5,
    per100: { kcal: 149, protein: 6.4, fat: 0.5, saturatedFat: 0.1, carbs: 33, sugar: 1, fiber: 2.1, salt: 0 } },
  { id: "f-tomatsaus", name: "Hakkede tomater", category: "Grønnsaker", icon: "🥫", pricePerUnit: 1.5,
    per100: { kcal: 25, protein: 1.2, fat: 0.3, saturatedFat: 0, carbs: 4, sugar: 3.5, fiber: 1.2, salt: 0.5 } },
  { id: "f-lettmelk", name: "Lettmelk", category: "Meieri", icon: "🥛", pricePerUnit: 1.2,
    per100: { kcal: 42, protein: 3.4, fat: 1, saturatedFat: 0.6, carbs: 5, sugar: 5, fiber: 0, salt: 0.1 } },
  { id: "f-yoghurt", name: "Yoghurt naturell", category: "Meieri", icon: "🥣", pricePerUnit: 2.5,
    per100: { kcal: 62, protein: 4, fat: 3.3, saturatedFat: 2.2, carbs: 4.5, sugar: 4.5, fiber: 0, salt: 0.1 } },
  { id: "f-bar", name: "Bær, blandet frossen", category: "Frukt", icon: "🫐", pricePerUnit: 3,
    per100: { kcal: 45, protein: 0.8, fat: 0.3, saturatedFat: 0, carbs: 9, sugar: 7, fiber: 3, salt: 0 } },
  { id: "f-banan", name: "Banan", category: "Frukt", icon: "🍌", pricePerUnit: 2.5,
    per100: { kcal: 89, protein: 1.1, fat: 0.3, saturatedFat: 0.1, carbs: 23, sugar: 12, fiber: 2.6, salt: 0 } },
];

export const RECIPES: Recipe[] = [
  { id: "r-frokost-egg", name: "Egg, skive og kaffe", icon: "🍳", basePortions: 1,
    ingredients: [{ foodId: "f-egg", grams: 100 }, { foodId: "f-brodskive", grams: 60 }, { foodId: "f-kaffe", grams: 150 }] },
  { id: "r-frokost-havre", name: "Havregrøt med bær", icon: "🥣", basePortions: 1,
    ingredients: [{ foodId: "f-havregryn", grams: 50 }, { foodId: "f-lettmelk", grams: 200 }, { foodId: "f-bar", grams: 50 }] },
  { id: "r-lunsj-salat", name: "Salat med kylling", icon: "🥗", basePortions: 2,
    ingredients: [
      { foodId: "f-kylling", grams: 240 },
      { foodId: "f-salatmiks", grams: 160 },
      { foodId: "f-cherrytomat", grams: 100 },
      { foodId: "f-agurk", grams: 100 },
      { foodId: "f-olivenolje", grams: 20 },
    ] },
  { id: "r-lunsj-yoghurt", name: "Yoghurt med banan", icon: "🍌", basePortions: 1,
    ingredients: [{ foodId: "f-yoghurt", grams: 200 }, { foodId: "f-banan", grams: 120 }, { foodId: "f-havregryn", grams: 20 }] },
  { id: "r-middag-laks", name: "Laks med grønnsaker", icon: "🐟", basePortions: 2,
    ingredients: [
      { foodId: "f-laks", grams: 300 },
      { foodId: "f-brokkoli", grams: 200 },
      { foodId: "f-paprika", grams: 150 },
      { foodId: "f-olivenolje", grams: 20 },
    ] },
  { id: "r-middag-bolognese", name: "Pasta Bolognese", icon: "🍝", basePortions: 4,
    ingredients: [
      { foodId: "f-pasta", grams: 320 },
      { foodId: "f-kjottdeig", grams: 400 },
      { foodId: "f-tomatsaus", grams: 400 },
      { foodId: "f-lok", grams: 100 },
      { foodId: "f-hvitlok", grams: 20 },
      { foodId: "f-olivenolje", grams: 20 },
    ] },
  { id: "r-middag-curry", name: "Kyllingcurry med ris", icon: "🍛", basePortions: 1,
    ingredients: [
      { foodId: "f-kylling", grams: 150 },
      { foodId: "f-villris", grams: 100 },
      { foodId: "f-kokosmelk", grams: 80 },
      { foodId: "f-karripulver", grams: 5 },
    ] },
  { id: "r-kvelds-yoghurt", name: "Yoghurt, bær", icon: "🥣", basePortions: 2,
    ingredients: [{ foodId: "f-yoghurt", grams: 200 }, { foodId: "f-bar", grams: 60 }] },
];

const ROBIN = "p-robin";
const MINA = "p-mina";

function meal(
  id: string,
  date: string,
  slot: PlannedMeal["slot"],
  recipeId: string,
  factors: [number, number],
  eaten: [boolean, boolean]
): PlannedMeal {
  return {
    id,
    date,
    slot,
    recipeId,
    personPortions: { [ROBIN]: factors[0], [MINA]: factors[1] },
    items: [],
    eatenBy: { [ROBIN]: eaten[0], [MINA]: eaten[1] },
  };
}

const dinnerRotation: [string, [number, number]][] = [
  ["r-middag-curry", [1.3, 0.9]],
  ["r-middag-bolognese", [1.2, 0.85]],
  ["r-middag-laks", [1.2, 0.85]],
  ["r-middag-curry", [1.3, 0.9]],
  ["r-middag-bolognese", [1.2, 0.85]],
  ["r-middag-laks", [1.2, 0.85]],
  ["r-middag-bolognese", [1.2, 0.85]],
];

// Demo-data dekker fra forrige ukes mandag til to uker frem, så både historikk og
// fremtidig planlegging har noe å vise med en gang.
export const WEEK_PLAN: PlannedMeal[] = [];
const seedRangeStart = addDays(startOfWeek(todayISO()), -7);
const today = todayISO();

for (let offset = 0; offset < 21; offset++) {
  const date = addDays(seedRangeStart, offset);
  const isToday = date === today;
  const isPast = date < today;
  const dayOfRange = offset % 7;

  WEEK_PLAN.push(
    meal(`d${date}-frokost`, date, "frokost", dayOfRange % 2 === 0 ? "r-frokost-egg" : "r-frokost-havre", [1.1, 0.8], [
      isPast || isToday,
      isPast || isToday,
    ])
  );
  WEEK_PLAN.push(
    meal(`d${date}-lunsj`, date, "lunsj", dayOfRange % 3 === 0 ? "r-lunsj-salat" : "r-lunsj-yoghurt", [1.3, 0.9], [
      isPast || isToday,
      isPast || isToday,
    ])
  );
  const [dinnerRecipe, dinnerFactors] = dinnerRotation[dayOfRange];
  WEEK_PLAN.push(meal(`d${date}-middag`, date, "middag", dinnerRecipe, dinnerFactors, [isPast, isPast]));
  WEEK_PLAN.push(meal(`d${date}-kveldsmat`, date, "kveldsmat", "r-kvelds-yoghurt", [1.1, 0.9], [false, false]));
}

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

export function createInitialState(): HouseholdState {
  return {
    people: PEOPLE,
    foods: FOODS,
    recipes: RECIPES,
    weekPlan: WEEK_PLAN,
    groceryChecked: {},
    categoryOrder: DEFAULT_CATEGORY_ORDER,
  };
}
