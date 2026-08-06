import type { ActivityLevel, FoodItem, Goal, Macros, MealItem, PlannedMeal, Person, Recipe } from "../types";

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  stillesittende: 1.2,
  lett_aktiv: 1.375,
  moderat_aktiv: 1.55,
  svaert_aktiv: 1.725,
  ekstremt_aktiv: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  stillesittende: "Stillesittende",
  lett_aktiv: "Lett aktiv",
  moderat_aktiv: "Moderat aktiv",
  svaert_aktiv: "Svært aktiv",
  ekstremt_aktiv: "Ekstremt aktiv",
};

export const GOAL_LABEL: Record<Goal, string> = {
  ned: "Ned i vekt",
  vedlikehold: "Vedlikeholde",
  opp: "Opp i vekt",
};

const KCAL_PER_KG_FAT = 7700;

export function calculateBMR(person: Person): number {
  const base = 10 * person.weightKg + 6.25 * person.heightCm - 5 * person.age;
  return person.gender === "mann" ? base + 5 : base - 161;
}

export function calculateTDEE(person: Person): number {
  return calculateBMR(person) * ACTIVITY_MULTIPLIER[person.activityLevel];
}

export function calculateTargetKcal(person: Person): number {
  const tdee = calculateTDEE(person);
  const dailyDelta = (person.goalRateKgPerWeek * KCAL_PER_KG_FAT) / 7;
  if (person.goal === "ned") return Math.round(tdee - dailyDelta);
  if (person.goal === "opp") return Math.round(tdee + dailyDelta);
  return Math.round(tdee);
}

export function calculateMacroTargets(person: Person): Macros {
  const kcal = calculateTargetKcal(person);
  return {
    kcal,
    protein: Math.round((kcal * 0.3) / 4),
    fat: Math.round((kcal * 0.3) / 9),
    saturatedFat: Math.round((kcal * 0.1) / 9),
    carbs: Math.round((kcal * 0.4) / 4),
    sugar: 0,
    fiber: 0,
    salt: 0,
  };
}

export function emptyMacros(): Macros {
  return { kcal: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, sugar: 0, fiber: 0, salt: 0 };
}

export function scaleMacros(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    fat: per100.fat * f,
    saturatedFat: per100.saturatedFat * f,
    carbs: per100.carbs * f,
    sugar: per100.sugar * f,
    fiber: per100.fiber * f,
    salt: per100.salt * f,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    saturatedFat: a.saturatedFat + b.saturatedFat,
    carbs: a.carbs + b.carbs,
    sugar: a.sugar + b.sugar,
    fiber: a.fiber + b.fiber,
    salt: a.salt + b.salt,
  };
}

/** Nutrition for one person's portion of a recipe, given their portion factor (1 = base per-portion amount). */
export function recipePersonMacros(recipe: Recipe, foods: FoodItem[], portionFactor: number): Macros {
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  let total = emptyMacros();
  for (const ing of recipe.ingredients) {
    const food = foodMap.get(ing.foodId);
    if (!food) continue;
    const gramsForPerson = (ing.grams / recipe.basePortions) * portionFactor;
    total = addMacros(total, scaleMacros(food.per100, gramsForPerson));
  }
  return total;
}

/** Macros a person has actually eaten on a given date, from meals checked "spist". */
/** Macros for a specific ad-hoc item within a meal (grams already resolved from the chosen unit). */
export function mealItemMacros(item: MealItem, foods: FoodItem[]): Macros {
  const food = foods.find((f) => f.id === item.foodId);
  if (!food) return emptyMacros();
  return scaleMacros(food.per100, item.grams);
}

/** Full macros a specific person gets from one planned meal: recipe portion (if any) + their own ad-hoc items. */
export function mealMacrosForPerson(meal: PlannedMeal, personId: string, recipes: Recipe[], foods: FoodItem[]): Macros {
  let total = emptyMacros();
  if (meal.recipeId) {
    const recipe = recipes.find((r) => r.id === meal.recipeId);
    if (recipe) {
      const factor = meal.personPortions[personId] ?? 1;
      total = addMacros(total, recipePersonMacros(recipe, foods, factor));
    }
  }
  for (const item of meal.items ?? []) {
    if (item.personId !== personId) continue;
    total = addMacros(total, mealItemMacros(item, foods));
  }
  return total;
}

/** Whether this meal applies to a given person at all — shared (personId null) or specifically theirs. */
export function mealAppliesToPerson(meal: PlannedMeal, personId: string): boolean {
  return !meal.personId || meal.personId === personId;
}

/** Rough share of daily kcal budget each meal slot represents — used to auto-portion a recipe when it's first added. */
export const SLOT_KCAL_SHARE: Record<string, number> = {
  frokost: 0.2,
  lunsj: 0.25,
  middag: 0.35,
  kveldsmat: 0.2,
};

/** Default portion factor so a newly-added recipe roughly matches this person's calorie budget for that slot. */
export function autoPortionFactor(person: Person, recipe: Recipe, slot: string, foods: FoodItem[]): number {
  const target = calculateTargetKcal(person);
  const slotTargetKcal = target * (SLOT_KCAL_SHARE[slot] ?? 0.25);
  const baseMacros = recipePersonMacros(recipe, foods, 1);
  if (baseMacros.kcal <= 0) return 1;
  const factor = slotTargetKcal / baseMacros.kcal;
  return Math.round(Math.max(0.25, Math.min(3, factor)) * 20) / 20; // snap to nearest 0.05, clamp 0.25x–3x
}

export function eatenMacrosForPersonDay(
  personId: string,
  date: string,
  weekPlan: PlannedMeal[],
  recipes: Recipe[],
  foods: FoodItem[]
): Macros {
  let total = emptyMacros();
  for (const meal of weekPlan) {
    if (meal.date !== date) continue;
    if (!mealAppliesToPerson(meal, personId)) continue;
    if (!meal.eatenBy[personId]) continue;
    total = addMacros(total, mealMacrosForPerson(meal, personId, recipes, foods));
  }
  return total;
}

export interface WeightProjectionPoint {
  label: string;
  days: number;
  projectedWeightKg: number;
}

/**
 * Projects weight assuming the person eats their calculated target kcal every day
 * (i.e. follows the plan) against their TDEE.
 */
export function projectWeight(person: Person): WeightProjectionPoint[] {
  const tdee = calculateTDEE(person);
  const targetKcal = calculateTargetKcal(person);
  const dailyDeltaKg = (targetKcal - tdee) / KCAL_PER_KG_FAT;

  const horizons: [string, number][] = [
    ["1 uke", 7],
    ["1 mnd", 30],
    ["3 mnd", 90],
    ["6 mnd", 180],
  ];

  return horizons.map(([label, days]) => ({
    label,
    days,
    projectedWeightKg: Math.round((person.weightKg + dailyDeltaKg * days) * 10) / 10,
  }));
}

export function projectWeightSeries(person: Person, totalDays = 180, stepDays = 7): { day: number; weightKg: number }[] {
  const tdee = calculateTDEE(person);
  const targetKcal = calculateTargetKcal(person);
  const dailyDeltaKg = (targetKcal - tdee) / KCAL_PER_KG_FAT;
  const points: { day: number; weightKg: number }[] = [];
  for (let d = 0; d <= totalDays; d += stepDays) {
    points.push({ day: d, weightKg: Math.round((person.weightKg + dailyDeltaKg * d) * 10) / 10 });
  }
  return points;
}

export interface GroceryLine {
  food: FoodItem;
  totalGrams: number;
  estimatedPrice: number;
}

/** Aggregates all ingredients across the whole week plan into one combined shopping list. */
export function aggregateGroceryList(
  weekPlan: PlannedMeal[],
  recipes: Recipe[],
  foods: FoodItem[]
): GroceryLine[] {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const totals = new Map<string, number>();

  for (const meal of weekPlan) {
    if (meal.recipeId) {
      const recipe = recipeMap.get(meal.recipeId);
      if (recipe) {
        for (const ing of recipe.ingredients) {
          let gramsThisMeal = 0;
          for (const personId of Object.keys(meal.personPortions)) {
            const factor = meal.personPortions[personId] ?? 1;
            gramsThisMeal += (ing.grams / recipe.basePortions) * factor;
          }
          totals.set(ing.foodId, (totals.get(ing.foodId) ?? 0) + gramsThisMeal);
        }
      }
    }
    for (const item of meal.items ?? []) {
      totals.set(item.foodId, (totals.get(item.foodId) ?? 0) + item.grams);
    }
  }

  const lines: GroceryLine[] = [];
  for (const [foodId, grams] of totals.entries()) {
    const food = foodMap.get(foodId);
    if (!food) continue;
    lines.push({
      food,
      totalGrams: Math.round(grams),
      estimatedPrice: Math.round((grams / 100) * food.pricePerUnit),
    });
  }
  return lines.sort((a, b) => a.food.category.localeCompare(b.food.category));
}

export interface KiwiBonusResult {
  totalPrice: number;
  bonusKr: number;
  netPrice: number;
  produceRatePct: number;
  standardRatePct: number;
}

/**
 * Kiwi Pluss: 15% cashback on fruit & veg (permanent Kiwi Pluss benefit), 1% on everything
 * else, bumped to 3% on days with "Trippeltrumf" (Kiwi's randomly-announced triple-bonus days).
 * Assumption: Trippeltrumf triples the everyday 1% rate — it does not change the fixed 15%
 * produce rate. Adjust here if Kiwi's actual terms differ.
 */
export function calcKiwiBonus(
  lines: GroceryLine[],
  kiwiPlussEnabled: boolean,
  trippelTrumfToday: boolean
): KiwiBonusResult {
  const totalPrice = lines.reduce((sum, l) => sum + l.estimatedPrice, 0);
  const standardRatePct = trippelTrumfToday ? 3 : 1;
  const produceRatePct = 15;

  if (!kiwiPlussEnabled) {
    return { totalPrice, bonusKr: 0, netPrice: totalPrice, produceRatePct: 0, standardRatePct: 0 };
  }

  let bonusKr = 0;
  for (const line of lines) {
    const rate = (line.food.category === "Frukt" || line.food.category === "Grønnsaker" ? produceRatePct : standardRatePct) / 100;
    bonusKr += line.estimatedPrice * rate;
  }
  bonusKr = Math.round(bonusKr);

  return { totalPrice, bonusKr, netPrice: totalPrice - bonusKr, produceRatePct, standardRatePct };
}

export function groupGroceryByCategory(lines: GroceryLine[]): Record<string, GroceryLine[]> {
  const groups: Record<string, GroceryLine[]> = {};
  for (const line of lines) {
    if (!groups[line.food.category]) groups[line.food.category] = [];
    groups[line.food.category].push(line);
  }
  return groups;
}

export function formatGramsOrUnit(food: FoodItem, grams: number): string {
  if (food.category === "Meieri" && food.name.toLowerCase().includes("melk")) {
    return `${(grams / 1000).toFixed(1)} liter`.replace(".0", "");
  }
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`.replace(".0", "");
  return `${Math.round(grams)} g`;
}

export const SLOT_LABELS: Record<string, string> = {
  frokost: "Frokost",
  lunsj: "Lunsj",
  middag: "Middag",
  kveldsmat: "Kveldsmat",
};
export const SLOT_ICONS: Record<string, string> = {
  frokost: "☕️",
  lunsj: "🥗",
  middag: "🍽️",
  kveldsmat: "🥣",
};
