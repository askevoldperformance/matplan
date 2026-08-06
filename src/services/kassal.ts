import type { FoodItem, Macros } from "../types";
import { emptyMacros } from "../utils/calculations";

export interface KassalNutrition {
  code: string;
  display_name: string;
  amount: number;
  unit: string;
}

export interface KassalCategory {
  id: number;
  depth: number;
  name: string;
}

export interface KassalProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  image: string | null;
  category: KassalCategory[] | null;
  current_price: number | null;
  current_unit_price: number | null;
  weight: number;
  weight_unit: string;
  nutrition: KassalNutrition[];
}

interface KassalListResponse {
  data: KassalProduct[];
}

const API_BASE = "/api/kassal";

export const STORE_OPTIONS: { code: string; label: string }[] = [
  { code: "KIWI", label: "Kiwi" },
  { code: "REMA_1000", label: "Rema 1000" },
  { code: "COOP_EXTRA", label: "Coop Extra" },
  { code: "MENY_NO", label: "Meny" },
  { code: "SPAR_NO", label: "Spar" },
  { code: "JOKER_NO", label: "Joker" },
  { code: "BUNNPRIS", label: "Bunnpris" },
  { code: "EUROPRIS_NO", label: "Europris" },
  { code: "COOP_MEGA", label: "Coop Mega" },
  { code: "COOP_PRIX", label: "Coop Prix" },
  { code: "COOP_OBS", label: "Coop Obs" },
];

const logoCache = new Map<string, string | null>();

/** Fetches a representative store logo for a chain via one physical-store lookup, cached in memory. */
export async function fetchStoreLogo(storeCode: string): Promise<string | null> {
  if (logoCache.has(storeCode)) return logoCache.get(storeCode)!;
  try {
    const res = await fetch(`${API_BASE}/store-logo/${storeCode}`);
    if (!res.ok) throw new Error();
    const json = await res.json();
    const logo = json?.logo ?? null;
    logoCache.set(storeCode, logo);
    return logo;
  } catch {
    logoCache.set(storeCode, null);
    return null;
  }
}

export async function searchKassalProducts(query: string, store = "KIWI", size = 25): Promise<KassalProduct[]> {
  if (query.trim().length < 3) return [];
  const res = await fetch(
    `${API_BASE}/products?search=${encodeURIComponent(query)}&size=${size}&store=${encodeURIComponent(store)}`
  );
  if (!res.ok) throw new Error(`Kassal-søk feilet (${res.status})`);
  const json: KassalListResponse = await res.json();
  return json.data ?? [];
}

// Matches Kassal's free-text nutrition display_name to our fixed Macros shape.
// Kassal doesn't expose a stable `code` enum, so we match on Norwegian labels instead.
function matchNutrition(nutrition: KassalNutrition[], keywords: string[]): number {
  const hit = nutrition.find((n) => {
    const name = n.display_name.toLowerCase();
    return keywords.some((k) => name.includes(k));
  });
  return hit?.amount ?? 0;
}

/**
 * Converts a Kassal product's per-package nutrition table into per-100g/ml values.
 * Kassal generally reports nutrition per 100g already, but we normalize defensively
 * in case a product reports per-package instead.
 */
export function kassalNutritionToPer100(nutrition: KassalNutrition[]): Macros {
  if (!nutrition || nutrition.length === 0) return emptyMacros();
  return {
    kcal: matchNutrition(nutrition, ["energi", "kcal"]),
    protein: matchNutrition(nutrition, ["protein"]),
    fat: matchNutrition(nutrition, ["fett"]) - matchNutrition(nutrition, ["hvorav mettede", "mettet"]),
    saturatedFat: matchNutrition(nutrition, ["hvorav mettede", "mettet"]),
    carbs: matchNutrition(nutrition, ["karbohydrat"]),
    sugar: matchNutrition(nutrition, ["sukkerarter", "sukker"]),
    fiber: matchNutrition(nutrition, ["fiber"]),
    salt: matchNutrition(nutrition, ["salt"]),
  };
}

const PRODUCE_KEYWORDS = ["frukt", "grønt", "grønnsak", "bær"];

function guessCategory(kassalCategories: KassalCategory[] | null): FoodItem["category"] {
  const names = (kassalCategories ?? []).map((c) => c.name.toLowerCase());
  const joined = names.join(" ");
  if (PRODUCE_KEYWORDS.some((k) => joined.includes(k))) {
    return joined.includes("frukt") && !joined.includes("grønt") ? "Frukt" : "Grønnsaker";
  }
  if (joined.includes("kjøtt") || joined.includes("fisk") || joined.includes("sjømat")) return "Kjøtt & Fisk";
  if (joined.includes("meieri") || joined.includes("ost") || joined.includes("melk") || joined.includes("yoghurt"))
    return "Meieri";
  if (joined.includes("brød") || joined.includes("kornvare") || joined.includes("pasta") || joined.includes("ris"))
    return "Kornvarer";
  if (joined.includes("olje") || joined.includes("fett")) return "Fett & Olje";
  if (joined.includes("krydder") || joined.includes("saus")) return "Krydder";
  return "Annet";
}

/** Kiwi Pluss gives 15% cashback on fruit & veg — this is what drives that bonus rate. */
export function isProduceCategory(category: FoodItem["category"]): boolean {
  return category === "Frukt" || category === "Grønnsaker";
}

export function kassalProductToFoodItem(product: KassalProduct, storeCode = "KIWI"): FoodItem {
  const category = guessCategory(product.category);
  const per100 = kassalNutritionToPer100(product.nutrition);
  // Kassal's price is per package; convert to a per-100 price estimate using package weight.
  const weightIn100Units = product.weight > 0 ? product.weight / 100 : 1;
  const pricePerUnit = product.current_price ? Math.round((product.current_price / weightIn100Units) * 100) / 100 : 0;

  // Best-effort "1 unit" estimate from the product's own package weight, on top of the
  // category defaults in utils/units.ts — genuinely just a starting guess, always editable.
  const commonUnits: { label: string; grams: number }[] = [];
  const nameLower = product.name.toLowerCase();
  if (product.weight_unit === "piece" || nameLower.includes(" stk")) {
    commonUnits.push({ label: "stk", grams: product.weight });
  }
  if (category === "Kornvarer" && (nameLower.includes("brød") || nameLower.includes("loff"))) {
    // Assume a standard loaf slices into ~16 — rough estimate, adjust if it's way off for a given product.
    commonUnits.push({ label: "skive", grams: Math.round(product.weight / 16) });
  }

  return {
    id: `kassal-${product.id}`,
    name: product.name,
    category,
    icon: "🛒",
    pricePerUnit,
    per100,
    imageUrl: product.image ?? undefined,
    kassalId: product.id,
    ean: product.ean ?? undefined,
    unitPrice: product.current_price ?? undefined,
    unitPriceLabel: product.current_unit_price ? `${product.current_unit_price} kr/${product.weight_unit === "g" || product.weight_unit === "ml" ? "kg/l" : product.weight_unit}` : undefined,
    storeCode,
    commonUnits: commonUnits.length > 0 ? commonUnits : undefined,
  };
}
