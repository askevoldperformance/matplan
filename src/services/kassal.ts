import type { FoodItem, Macros } from "../types";
import { emptyMacros } from "../utils/calculations";
import { deriveSmartUnits } from "../utils/units";

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
  description: string | null;
  ingredients: string | null;
  labels: { display_name: string }[] | null;
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

// Kassal's `code` field is a stable, unambiguous identifier (confirmed against real API
// responses: energi_kcal, fett_totalt, mettet_fett, karbohydrater, sukkerarter, kostfiber,
// salt, protein). We match on code first. display_name is NOT safe to substring-match on —
// "Mettet fett", "Enumettet fett", and "Flerumettet fett" all contain "fett"/"mettet", so a
// naive .includes() check picks the wrong row depending on array order.
// Fallback only for the rare product missing a populated `code` — exact (not substring)
// display_name match, so it can't collide with a similarly-worded sibling row.
function findByExactName(nutrition: KassalNutrition[], name: string): number {
  return nutrition.find((n) => n.display_name.toLowerCase() === name)?.amount ?? 0;
}

function nutritionValue(nutrition: KassalNutrition[], code: string, exactNameFallback: string): number {
  const byCode = nutrition.find((n) => n.code === code);
  if (byCode) return byCode.amount;
  return findByExactName(nutrition, exactNameFallback);
}

export function kassalNutritionToPer100(nutrition: KassalNutrition[]): Macros {
  if (!nutrition || nutrition.length === 0) return emptyMacros();
  return {
    kcal: nutritionValue(nutrition, "energi_kcal", "kalorier"),
    protein: nutritionValue(nutrition, "protein", "protein"),
    fat: nutritionValue(nutrition, "fett_totalt", "fett"),
    saturatedFat: nutritionValue(nutrition, "mettet_fett", "mettet fett"),
    carbs: nutritionValue(nutrition, "karbohydrater", "karbohydrater"),
    sugar: nutritionValue(nutrition, "sukkerarter", "sukkerarter"),
    fiber: nutritionValue(nutrition, "kostfiber", "kostfiber"),
    salt: nutritionValue(nutrition, "salt", "salt"),
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

/** The deepest/most specific category Kassal assigned (e.g. "Ost", "Paprika", "Epler") — far more reliable than guessing from the product name. */
function leafCategoryName(categories: KassalCategory[] | null): string {
  if (!categories || categories.length === 0) return "";
  const leaf = categories.reduce((max, c) => (c.depth > max.depth ? c : max), categories[0]);
  return leaf.name;
}

export function kassalProductToFoodItem(product: KassalProduct, storeCode = "KIWI"): FoodItem {
  const category = guessCategory(product.category);
  const per100 = kassalNutritionToPer100(product.nutrition);
  // Kassal's price is per package; convert to a per-100 price estimate using package weight.
  const weightIn100Units = product.weight > 0 ? product.weight / 100 : 1;
  const pricePerUnit = product.current_price ? Math.round((product.current_price / weightIn100Units) * 100) / 100 : 0;

  // Kassal's own leaf category (e.g. "Ost") is checked before the product name — a cheese
  // branded "Norvegia" never says "ost" in its name, but its Kassal category does.
  const leafCat = leafCategoryName(product.category);
  let commonUnits = deriveSmartUnits([leafCat, product.name]);
  if (commonUnits.length === 0 && product.weight_unit === "piece") {
    commonUnits = [{ label: "stk", grams: product.weight }];
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
    packageWeight: product.weight > 0 ? product.weight : undefined,
    description: product.description ?? undefined,
    ingredientsText: product.ingredients ?? undefined,
    labels: product.labels?.map((l) => l.display_name) ?? undefined,
  };
}
