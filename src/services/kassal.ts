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
  { code: "MENY_NO", label: "Meny" },
  { code: "SPAR_NO", label: "Spar" },
  { code: "JOKER_NO", label: "Joker" },
  { code: "COOP_NO", label: "Coop" },
  { code: "BUNNPRIS", label: "Bunnpris" },
  { code: "EUROPRIS_NO", label: "Europris" },
];

const logoCache = new Map<string, string | null>();

// Coop's physical stores are tagged per sub-chain (COOP_EXTRA, COOP_MEGA, ...), never as the
// COOP_NO umbrella code products actually use — so the physical-store lookup below finds
// nothing for it. Kassal's logo URLs follow a predictable /logos/{Name}.svg pattern; this one
// is confirmed directly from a real product response, so it's hardcoded rather than guessed.
const KNOWN_LOGO_OVERRIDES: Record<string, string> = {
  COOP_NO: "https://kassal.app/logos/Coop.svg",
};

/** Fetches a representative store logo for a chain via one physical-store lookup, cached in memory. */
export async function fetchStoreLogo(storeCode: string): Promise<string | null> {
  if (KNOWN_LOGO_OVERRIDES[storeCode]) return KNOWN_LOGO_OVERRIDES[storeCode];
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

export interface BulkPriceResult {
  ean: string;
  stores: { store: string; current_price: number | null }[];
}

export async function fetchBulkPrices(eans: string[]): Promise<BulkPriceResult[]> {
  if (eans.length === 0) return [];
  const res = await fetch(`${API_BASE}/prices-bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eans, days: 7, aggregation: "min" }),
  });
  if (!res.ok) throw new Error(`Pris-oppdatering feilet (${res.status})`);
  const json = await res.json();
  return (json.data ?? []).map((item: any) => ({
    ean: item.ean,
    stores: (item.stores ?? []).map((s: any) => ({ store: s.store, current_price: s.current_price })),
  }));
}

export interface StorePriceComparison {
  storeCode: string;
  storeName: string;
  price: number;
}

/** All known store prices for one EAN — used to check if a saved product is cheaper elsewhere. */
export async function fetchPriceComparison(ean: string): Promise<StorePriceComparison[]> {
  const res = await fetch(`${API_BASE}/products/ean/${ean}`);
  if (!res.ok) throw new Error(`Prissammenligning feilet (${res.status})`);
  const json = await res.json();
  const products = json?.data?.products ?? [];
  return products
    .map((p: any) => ({
      storeCode: p.store?.[0]?.code ?? "UKJENT",
      storeName: p.store?.[0]?.name ?? "Ukjent",
      price: p.current_price?.[0]?.price,
    }))
    .filter((s: any) => typeof s.price === "number");
}

export async function fetchKassalProductById(id: number): Promise<KassalProduct> {
  const res = await fetch(`${API_BASE}/products/id/${id}`);
  if (!res.ok) throw new Error(`Kunne ikke hente produkt (${res.status})`);
  const json = await res.json();
  return json.data;
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

/** Parses "4x110g" / "4 x 110 g" style multipack names — e.g. Skyr Mini sold as one pack of several single-serve cups. */
function parseMultipack(name: string): { count: number; unitGrams: number } | null {
  const match = name.match(/(\d+)\s*[xX×]\s*(\d+)\s*(g|ml)/);
  if (!match) return null;
  return { count: Number(match[1]), unitGrams: Number(match[2]) };
}

/**
 * Kassal frequently leaves the structured `weight`/`weight_unit` fields null and only states
 * the package size inside the product name itself ("Skyr Mini Jordbær 90g pose"). This is the
 * fallback for exactly that case — checked before falling back further to a 1x guess.
 */
function parsePackageWeightFromName(name: string): number | null {
  const kg = name.match(/(\d+[.,]?\d*)\s*kg\b/i);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);
  const l = name.match(/(\d+[.,]?\d*)\s*l\b/i);
  if (l) return Math.round(parseFloat(l[1].replace(",", ".")) * 1000);
  const g = name.match(/(\d+[.,]?\d*)\s*g\b/i);
  if (g) return Math.round(parseFloat(g[1].replace(",", ".")));
  const ml = name.match(/(\d+[.,]?\d*)\s*ml\b/i);
  if (ml) return Math.round(parseFloat(ml[1].replace(",", ".")));
  return null;
}

/** "100stk" style count-only packs (wipes, plasters, etc.) — sold and priced as one whole pack, not by weight. */
function parseStkCountFromName(name: string): number | null {
  const match = name.match(/(\d+)\s*stk\b/i);
  return match ? Number(match[1]) : null;
}

/** Parses ml/l volume specifically (not g/kg) — used only for pant detection, since pant applies to liquid containers, not solid weight. */
function parseVolumeMl(name: string): number | null {
  const l = name.match(/(\d+[.,]?\d*)\s*l\b/i);
  if (l) return Math.round(parseFloat(l[1].replace(",", ".")) * 1000);
  const ml = name.match(/(\d+[.,]?\d*)\s*ml\b/i);
  if (ml) return Math.round(parseFloat(ml[1].replace(",", ".")));
  return null;
}

const DRINK_KEYWORDS = [
  "brus", "cola", "fanta", "sprite", "pepsi", "solo", "farris", "imsdal", "øl", "pilsner",
  "cider", "energidrikk", "red bull", "redbull", "monster", "juice", "nectar", "saft", "iste",
];

/** Norwegian bottle/can deposit (pant) — 3 kr for 1–1.5l, 2 kr for ≤0.5l. Only for drink containers. */
function computePant(name: string): number | undefined {
  const nameLower = name.toLowerCase();
  if (!DRINK_KEYWORDS.some((k) => nameLower.includes(k))) return undefined;
  const ml = parseVolumeMl(name);
  if (!ml) return undefined;
  if (ml >= 1000) return 3;
  if (ml <= 500) return 2;
  return undefined; // ambiguous middle range (e.g. 0.7l) — skip rather than guess wrong
}

export function kassalProductToFoodItem(product: KassalProduct, storeCode = "KIWI"): FoodItem {
  const category = guessCategory(product.category);
  const per100 = kassalNutritionToPer100(product.nutrition);
  const isLosvekt = product.name.toLowerCase().includes("løsvekt");

  const stkCount = parseStkCountFromName(product.name);
  const parsedWeight = product.weight > 0 ? product.weight : parsePackageWeightFromName(product.name);

  let packageWeight: number | undefined;
  let packageSizeUnknown = false;
  let pricePerUnit = 0;
  let forcedCommonUnits: { label: string; grams: number }[] | undefined;

  if (stkCount && stkCount > 1) {
    // Count-only pack (e.g. "100stk" wipes) — 1 "stk" = 1 internal unit, the whole pack = stkCount units.
    // Reuses the same gram-based package-rounding machinery everywhere else, just with "stk" as the unit.
    packageWeight = stkCount;
    pricePerUnit = product.current_price ? Math.round((product.current_price * 100) / stkCount * 100) / 100 : 0;
    forcedCommonUnits = [{ label: "stk", grams: 1 }];
  } else {
    const weightIn100Units = parsedWeight && parsedWeight > 0 ? parsedWeight / 100 : 1;
    pricePerUnit = product.current_price ? Math.round((product.current_price / weightIn100Units) * 100) / 100 : 0;
    if (isLosvekt) {
      packageWeight = undefined; // buy by weight freely, no fixed package to round up to
    } else if (parsedWeight && parsedWeight > 0) {
      packageWeight = parsedWeight;
    } else {
      // Truly can't determine package size (Kassal gave no structured weight AND the name
      // doesn't state one). Whatever this is, you still can't buy a fraction of it — so the
      // grocery list must always round to "buy 1 whole item", never a bogus per-gram estimate.
      packageSizeUnknown = true;
    }
  }

  // Kassal's own leaf category (e.g. "Ost") is checked before the product name — a cheese
  // branded "Norvegia" never says "ost" in its name, but its Kassal category does.
  const leafCat = leafCategoryName(product.category);
  const multipack = parseMultipack(product.name);
  let commonUnits = forcedCommonUnits ?? deriveSmartUnits([leafCat, product.name]);
  if (!forcedCommonUnits && multipack && !commonUnits.some((u) => u.label === "stk")) {
    commonUnits = [{ label: "stk", grams: multipack.unitGrams }, ...commonUnits];
  }
  if (!forcedCommonUnits && commonUnits.length === 0 && product.weight_unit === "piece") {
    commonUnits = [{ label: "stk", grams: product.weight }];
  }
  if (isLosvekt && !commonUnits.some((u) => u.label === "kg")) {
    commonUnits = [...commonUnits, { label: "kg", grams: 1000 }];
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
    // Løsvekt items (poteter, løk sold by weight) have no fixed package to round up to —
    // buy exactly what's needed, not a rounded-up "pack".
    packageWeight,
    packageSizeUnknown,
    pant: computePant(product.name),
    description: product.description ?? undefined,
    ingredientsText: product.ingredients ?? undefined,
    labels: product.labels?.map((l) => l.display_name) ?? undefined,
  };
}
