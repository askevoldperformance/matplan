export type Gender = "mann" | "kvinne";
export type ActivityLevel = "stillesittende" | "lett_aktiv" | "moderat_aktiv" | "svaert_aktiv" | "ekstremt_aktiv";
export type Goal = "ned" | "vedlikehold" | "opp";
export type MealSlot = "frokost" | "lunsj" | "middag" | "kveldsmat";
export type Unit = "g" | "ml" | "stk" | "ts" | "ss";

export interface Macros {
  kcal: number;
  protein: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  salt: number;
}

export interface Person {
  id: string;
  name: string;
  emoji: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  goalRateKgPerWeek: number; // e.g. 0.5 kg/week deficit target
  manualTargetKcal?: number; // direct override — when set, this wins over the TDEE+goal formula
  color: "orange" | "yellow";
  weightHidden: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  category: "Grønnsaker" | "Frukt" | "Kjøtt & Fisk" | "Meieri" | "Kornvarer" | "Fett & Olje" | "Krydder" | "Annet";
  icon: string;
  pricePerUnit: number; // kr per 100g/ml (estimate)
  per100: Macros;
  imageUrl?: string; // real product photo from Kassal.app, falls back to `icon` emoji
  kassalId?: number;
  ean?: string;
  unitPrice?: number; // Kassal "current_price" for the package as sold
  unitPriceLabel?: string; // e.g. "kr/kg" from Kassal's current_unit_price_unit
  isFavorite?: boolean;
  storeCode?: string; // Kassal store group this was found in, e.g. "KIWI", "REMA_1000"
  commonUnits?: { label: string; grams: number }[]; // quick-add units, e.g. "skive" = 30g
  packageWeight?: number; // grams/ml as actually sold — lets the grocery list round up to whole packages
}

export interface RecipeIngredient {
  foodId: string;
  grams: number;
}

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  basePortions: number;
  ingredients: RecipeIngredient[];
}

export interface MealItem {
  id: string;
  foodId: string;
  grams: number;
  personId: string;
}

export interface PlannedMeal {
  id: string;
  date: string; // ISO yyyy-mm-dd — real calendar date, not a recurring weekday template
  slot: MealSlot;
  recipeId?: string; // optional — a meal can be pure ad-hoc items with no recipe at all
  personId?: string | null; // null/undefined = shared meal for the whole household; else meal belongs to just this person
  personPortions: Record<string, number>; // personId -> gram multiplier factor (1 = base recipe portion), used when recipeId is set
  items: MealItem[]; // ad-hoc products added on top of (or instead of) the recipe
  eatenBy: Record<string, boolean>; // personId -> spist?
}

export interface GroceryOverride {
  foodId: string;
  checked: boolean;
}

export type GroceryRange = "uke" | "neste_uke" | "maned";

export interface HouseholdState {
  people: Person[];
  foods: FoodItem[];
  recipes: Recipe[];
  weekPlan: PlannedMeal[];
  groceryChecked: Record<string, boolean>; // `${periodKey}:${foodId}` -> checked
  categoryOrder: string[];
}
