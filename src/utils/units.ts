import type { FoodItem } from "../types";

export interface FoodUnit {
  label: string;
  grams: number;
}

// Always available regardless of food type — universal kitchen measures.
const UNIVERSAL_UNITS: FoodUnit[] = [
  { label: "ss", grams: 15 },
  { label: "ts", grams: 5 },
];

// Best-effort category defaults for when Kassal/the food itself doesn't tell us serving size.
// These are estimates — editable via the raw gram input, never a hard requirement.
function categoryDefaults(food: FoodItem): FoodUnit[] {
  const name = food.name.toLowerCase();
  const units: FoodUnit[] = [];

  if (food.category === "Kornvarer" && (name.includes("brød") || name.includes("loff") || name.includes("rundstykke"))) {
    units.push({ label: "skive", grams: 30 });
  }
  if (food.category === "Fett & Olje" || name.includes("smør") || name.includes("margarin")) {
    units.push({ label: "tynt lag", grams: 5 }, { label: "tykt lag", grams: 12 });
  }
  if (food.category === "Meieri" && (name.includes("melk") || name.includes("yoghurt"))) {
    units.push({ label: "dl", grams: 100 }, { label: "glass", grams: 200 });
  }
  if (name.includes("egg")) {
    units.push({ label: "stk", grams: 60 });
  }
  if (food.category === "Frukt" && !name.includes("bær")) {
    units.push({ label: "stk", grams: 120 });
  }
  return units;
}

/** Full list of quick-add units for a food: its own Kassal-derived units first, then category defaults, then universal. */
export function getUnitsForFood(food: FoodItem): FoodUnit[] {
  const own = food.commonUnits ?? [];
  const defaults = categoryDefaults(food);
  const seen = new Set(own.map((u) => u.label));
  const merged = [...own];
  for (const u of [...defaults, ...UNIVERSAL_UNITS]) {
    if (!seen.has(u.label)) {
      merged.push(u);
      seen.add(u.label);
    }
  }
  return merged;
}
