import type { FoodItem } from "../types";

export interface FoodUnit {
  label: string;
  grams: number;
}

// Always available on every food, regardless of category — a plain gram entry ("g") is the
// universal fallback, plus the two most common kitchen spoon measures.
const UNIVERSAL_UNITS: FoodUnit[] = [
  { label: "g", grams: 1 },
  { label: "ss", grams: 15 },
  { label: "ts", grams: 5 },
];

interface UnitRule {
  keywords: string[];
  units: FoodUnit[];
}

// Checked against Kassal's own (very specific) leaf category name first, then the product
// name, whichever hint set is passed in — first matching rule wins. Grams are realistic
// per-piece/per-slice estimates for the Norwegian kitchen; always editable via the raw "g"
// unit if a specific product is way off.
const UNIT_RULES: UnitRule[] = [
  { keywords: ["ost"], units: [{ label: "skive", grams: 20 }] },
  { keywords: ["skinke", "servelat", "salami", "spekeskinke", "bacon", "pålegg"], units: [{ label: "skive", grams: 15 }] },
  { keywords: ["brød", "loff", "rundstykke", "baguette"], units: [{ label: "skive", grams: 30 }] },

  // Vegetables/fruit people cut into halves or slices rather than weigh out.
  { keywords: ["agurk"], units: [{ label: "hel", grams: 300 }, { label: "halv", grams: 150 }, { label: "skive", grams: 8 }] },
  { keywords: ["paprika"], units: [{ label: "hel", grams: 150 }, { label: "halv", grams: 75 }, { label: "skive", grams: 15 }] },
  { keywords: ["tomat"], units: [{ label: "hel", grams: 120 }, { label: "halv", grams: 60 }, { label: "skive", grams: 15 }] },
  { keywords: ["løk"], units: [{ label: "hel", grams: 110 }, { label: "halv", grams: 55 }] },
  { keywords: ["gulrot"], units: [{ label: "hel", grams: 70 }, { label: "halv", grams: 35 }] },
  { keywords: ["avokado"], units: [{ label: "hel", grams: 150 }, { label: "halv", grams: 75 }] },
  { keywords: ["eple", "pære"], units: [{ label: "hel", grams: 130 }, { label: "halv", grams: 65 }] },

  { keywords: ["smør", "margarin", "majones", "leverpostei", "kaviar", "syltetøy", "nutella", "peanøttsmør"], units: [{ label: "tynt lag", grams: 5 }, { label: "tykt lag", grams: 12 }] },
  { keywords: ["melk", "yoghurt", "juice", "saft", "fløte", "kefir"], units: [{ label: "dl", grams: 100 }, { label: "glass", grams: 200 }] },
  { keywords: ["egg"], units: [{ label: "stk", grams: 60 }] },
  { keywords: ["banan"], units: [{ label: "stk", grams: 120 }] },
  { keywords: ["kiwi"], units: [{ label: "stk", grams: 75 }] },
];

/** hints = e.g. [Kassal leaf category name, product name] — first rule matching either wins. */
export function deriveSmartUnits(hints: string[]): FoodUnit[] {
  const joined = hints.join(" ").toLowerCase();
  for (const rule of UNIT_RULES) {
    if (rule.keywords.some((k) => joined.includes(k))) return rule.units;
  }
  return [];
}

/** Full list of quick-add units for a food: its own (Kassal-derived) units first, then universal g/ss/ts. */
export function getUnitsForFood(food: FoodItem): FoodUnit[] {
  let own = food.commonUnits && food.commonUnits.length > 0 ? food.commonUnits : deriveSmartUnits([food.name]);

  // Safety net for foods saved before this category was recognized (e.g. cheese added under
  // an old rule set) — fall back to the broad FoodItem.category as a second guess.
  if (own.length === 0 && food.category === "Meieri") {
    const nameLower = food.name.toLowerCase();
    const isLiquid = ["melk", "yoghurt", "juice", "saft", "fløte", "kefir"].some((k) => nameLower.includes(k));
    own = isLiquid ? [{ label: "dl", grams: 100 }, { label: "glass", grams: 200 }] : [{ label: "skive", grams: 20 }];
  }

  const seen = new Set(own.map((u) => u.label));
  const merged = [...own];

  // "1 pakke" — for anything with a known package size, so you can add "2 pakker" of wipes
  // or Skyr Mini directly without having to think in grams or stk at all.
  if (food.packageWeight && food.packageWeight > 0 && !seen.has("pakke")) {
    merged.push({ label: "pakke", grams: food.packageWeight });
    seen.add("pakke");
  }

  for (const u of UNIVERSAL_UNITS) {
    if (!seen.has(u.label)) {
      merged.push(u);
      seen.add(u.label);
    }
  }
  return merged;
}

/**
 * Units for standalone grocery additions ("Egne varer", inline quantity adjustments) — you're
 * always buying a WHOLE product at the store, never a fraction of one. Gram/dl/ss/ts never
 * belong here even though they're valid for meal-ingredient tracking elsewhere; this list is
 * "pakke"/"stk"/whole-item units only, "pakke" first since that's what's wanted most often.
 */
export function getPackageOnlyUnits(food: FoodItem): FoodUnit[] {
  // Strict priority, no redundant options: a multipack (or anything with a known package
  // weight) is bought as that whole package — showing "stk" alongside it would wrongly imply
  // you could buy a single bottle out of a 6-pack separately.
  if (food.packageWeight && food.packageWeight > 0) {
    return [{ label: "pakke", grams: food.packageWeight }];
  }
  if (food.packageSizeUnknown) {
    // Grams value is a placeholder — aggregateGroceryList always treats packageSizeUnknown
    // foods as "buy exactly 1" regardless of the number here.
    return [{ label: "pakke", grams: 1 }];
  }
  const stkUnit = food.commonUnits?.find((u) => u.label === "stk");
  if (stkUnit) return [stkUnit];

  // No package concept at all — likely løsvekt produce. Whole-item units (hel/halv/kg) are
  // still fine here since you genuinely buy a whole cucumber or a kg bag, just never bare g/ss/ts.
  const wholeItemUnits = deriveSmartUnits([food.name]).filter((u) => !["g", "ss", "ts"].includes(u.label));
  if (wholeItemUnits.length > 0) return wholeItemUnits;

  return [{ label: "stk", grams: 1 }];
}
