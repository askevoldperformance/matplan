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

// Keyword -> unit rules, checked against the food's name (and category as a tiebreaker).
// Grams are realistic per-piece/per-slice estimates for the Norwegian kitchen — always
// editable via the raw gram input if a specific product is way off.
const KEYWORD_UNITS: { keywords: string[]; category?: FoodItem["category"]; unit: FoodUnit }[] = [
  // Sliced on bread
  { keywords: ["brød", "loff", "rundstykke", "baguette"], unit: { label: "skive", grams: 30 } },
  { keywords: ["ost"], category: "Meieri", unit: { label: "skive", grams: 20 } },
  { keywords: ["skinke", "servelat", "salami", "spekeskinke", "kalkunpålegg", "pålegg"], unit: { label: "skive", grams: 15 } },

  // Vegetables people slice/cut rather than weigh
  { keywords: ["agurk"], unit: { label: "skive", grams: 8 } },
  { keywords: ["paprika"], unit: { label: "bit", grams: 18 } },
  { keywords: ["tomat"], unit: { label: "skive", grams: 15 } },
  { keywords: ["løk", "rødløk"], unit: { label: "stk", grams: 110 } },
  { keywords: ["gulrot"], unit: { label: "stk", grams: 70 } },
  { keywords: ["avokado"], unit: { label: "stk", grams: 150 } },

  // Spreads / fats — thin vs. thick layer
  { keywords: ["smør", "margarin", "majones", "leverpostei", "kaviar", "syltetøy"], unit: { label: "tynt lag", grams: 5 } },

  // Liquids
  { keywords: ["melk", "yoghurt", "juice", "saft"], unit: { label: "dl", grams: 100 } },

  // Whole small countable items
  { keywords: ["egg"], unit: { label: "stk", grams: 60 } },
  { keywords: ["banan"], unit: { label: "stk", grams: 120 } },
  { keywords: ["eple", "pære"], unit: { label: "stk", grams: 130 } },
  { keywords: ["kiwi"], unit: { label: "stk", grams: 75 } },
];

function categoryDefaults(food: FoodItem): FoodUnit[] {
  const name = food.name.toLowerCase();
  const units: FoodUnit[] = [];
  const seen = new Set<string>();

  for (const rule of KEYWORD_UNITS) {
    if (rule.category && rule.category !== food.category) continue;
    if (rule.keywords.some((k) => name.includes(k)) && !seen.has(rule.unit.label)) {
      units.push(rule.unit);
      seen.add(rule.unit.label);
    }
  }

  // Extra layer options for spreads specifically (thin AND thick).
  if (units.some((u) => u.label === "tynt lag")) {
    units.push({ label: "tykt lag", grams: 12 });
  }

  // Fallback per broad category when no specific keyword matched anything above.
  if (units.length === 0) {
    if (food.category === "Frukt" && !name.includes("bær")) units.push({ label: "stk", grams: 120 });
    if (food.category === "Meieri" && (name.includes("melk") || name.includes("yoghurt"))) {
      units.push({ label: "dl", grams: 100 }, { label: "glass", grams: 200 });
    }
  }

  return units;
}

/** Full list of quick-add units for a food: its own Kassal-derived units first, then keyword/category defaults, then universal. */
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
