import { supabase, HOUSEHOLD_ID } from "./supabaseClient";
import type { FoodItem, HouseholdState, Person, PlannedMeal, Recipe, RecipeIngredient } from "../types";

// ---------- row <-> app type mapping ----------

function rowToPerson(r: any): Person {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    gender: r.gender,
    age: r.age,
    heightCm: r.height_cm,
    weightKg: r.weight_kg,
    activityLevel: r.activity_level,
    goal: r.goal,
    goalRateKgPerWeek: r.goal_rate_kg_per_week,
    color: r.color,
    weightHidden: r.weight_hidden,
    manualTargetKcal: r.manual_target_kcal ?? undefined,
  };
}

function personToRow(p: Person) {
  return {
    id: p.id,
    household_id: HOUSEHOLD_ID,
    name: p.name,
    emoji: p.emoji,
    gender: p.gender,
    age: p.age,
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    activity_level: p.activityLevel,
    goal: p.goal,
    goal_rate_kg_per_week: p.goalRateKgPerWeek,
    color: p.color,
    weight_hidden: p.weightHidden,
    manual_target_kcal: p.manualTargetKcal ?? null,
  };
}

function rowToFood(r: any): FoodItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    icon: r.icon,
    pricePerUnit: Number(r.price_per_unit),
    per100: r.per100,
    imageUrl: r.image_url ?? undefined,
    kassalId: r.kassal_id ?? undefined,
    ean: r.ean ?? undefined,
    unitPrice: r.unit_price ?? undefined,
    unitPriceLabel: r.unit_price_label ?? undefined,
    isFavorite: r.is_favorite ?? false,
    storeCode: r.store_code ?? undefined,
    commonUnits: r.common_units ?? undefined,
    packageWeight: r.package_weight ?? undefined,
    description: r.description ?? undefined,
    ingredientsText: r.ingredients_text ?? undefined,
    labels: r.labels ?? undefined,
  };
}

function foodToRow(f: FoodItem) {
  return {
    id: f.id,
    household_id: HOUSEHOLD_ID,
    name: f.name,
    category: f.category,
    icon: f.icon,
    price_per_unit: f.pricePerUnit,
    per100: f.per100,
    image_url: f.imageUrl ?? null,
    kassal_id: f.kassalId ?? null,
    ean: f.ean ?? null,
    unit_price: f.unitPrice ?? null,
    unit_price_label: f.unitPriceLabel ?? null,
    is_favorite: f.isFavorite ?? false,
    store_code: f.storeCode ?? null,
    common_units: f.commonUnits ?? null,
    package_weight: f.packageWeight ?? null,
    description: f.description ?? null,
    ingredients_text: f.ingredientsText ?? null,
    labels: f.labels ?? null,
  };
}

function recipeToRow(r: Recipe) {
  return { id: r.id, household_id: HOUSEHOLD_ID, name: r.name, icon: r.icon, base_portions: r.basePortions };
}

function plannedMealToRow(m: PlannedMeal) {
  return {
    id: m.id,
    household_id: HOUSEHOLD_ID,
    date: m.date,
    slot: m.slot,
    recipe_id: m.recipeId ?? null,
    person_id: m.personId ?? null,
    person_portions: m.personPortions,
    items: m.items ?? [],
    eaten_by: m.eatenBy,
  };
}

function rowToPlannedMeal(r: any): PlannedMeal {
  return {
    id: r.id,
    date: r.date,
    slot: r.slot,
    recipeId: r.recipe_id ?? undefined,
    personId: r.person_id ?? null,
    personPortions: r.person_portions ?? {},
    items: r.items ?? [],
    eatenBy: r.eaten_by ?? {},
  };
}

// ---------- load ----------

export async function loadHouseholdFromSupabase(): Promise<
  (HouseholdState & { kiwiPlussEnabled: boolean; trippelTrumfToday: boolean }) | null
> {
  if (!supabase) return null;

  const [peopleRes, foodsRes, recipesRes, ingredientsRes, mealsRes, categoryRes, settingsRes, groceryRes, manualRes] =
    await Promise.all([
      supabase.from("people").select("*"),
      supabase.from("foods").select("*"),
      supabase.from("recipes").select("*"),
      supabase.from("recipe_ingredients").select("*"),
      supabase.from("planned_meals").select("*"),
      supabase.from("category_order").select("*").eq("household_id", HOUSEHOLD_ID).maybeSingle(),
      supabase.from("household_settings").select("*").eq("household_id", HOUSEHOLD_ID).maybeSingle(),
      supabase.from("grocery_checked").select("*"),
      supabase.from("manual_grocery_items").select("*"),
    ]);

  if (peopleRes.error || foodsRes.error || recipesRes.error) {
    console.error("Supabase load error", peopleRes.error ?? foodsRes.error ?? recipesRes.error);
    return null;
  }

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
  for (const row of ingredientsRes.data ?? []) {
    const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
    list.push({ foodId: row.food_id, grams: Number(row.grams) });
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  const recipes: Recipe[] = (recipesRes.data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    basePortions: Number(r.base_portions),
    ingredients: ingredientsByRecipe.get(r.id) ?? [],
  }));

  const groceryChecked: Record<string, boolean> = {};
  for (const row of groceryRes.data ?? []) {
    groceryChecked[`${row.iso_week}:${row.food_id}`] = row.checked;
  }

  return {
    people: (peopleRes.data ?? []).map(rowToPerson),
    foods: (foodsRes.data ?? []).map(rowToFood),
    recipes,
    weekPlan: (mealsRes.data ?? []).map(rowToPlannedMeal),
    manualGroceryItems: (manualRes.data ?? []).map((r: any) => ({
      id: r.id,
      periodKey: r.period_key,
      foodId: r.food_id,
      grams: Number(r.grams),
    })),
    groceryChecked,
    categoryOrder: categoryRes.data?.categories ?? [],
    kiwiPlussEnabled: settingsRes.data?.kiwi_pluss_enabled ?? true,
    trippelTrumfToday: settingsRes.data?.trippel_trumf_today ?? false,
  };
}

// ---------- writes (fire-and-forget, errors just logged) ----------

function warn(label: string) {
  return (err: any) => err && console.error(`Supabase write failed (${label})`, err);
}

export function syncPerson(p: Person) {
  supabase?.from("people").upsert(personToRow(p)).then(({ error }) => warn("person")(error));
}

export function syncFood(f: FoodItem) {
  supabase?.from("foods").upsert(foodToRow(f)).then(({ error }) => warn("food")(error));
}

export function syncRecipe(r: Recipe) {
  supabase
    ?.from("recipes")
    .upsert(recipeToRow(r))
    .then(async ({ error }) => {
      warn("recipe")(error);
      if (error) return;
      await supabase?.from("recipe_ingredients").delete().eq("recipe_id", r.id);
      if (r.ingredients.length > 0) {
        await supabase
          ?.from("recipe_ingredients")
          .insert(r.ingredients.map((ing) => ({ recipe_id: r.id, food_id: ing.foodId, grams: ing.grams })))
          .then(({ error: e2 }) => warn("recipe_ingredients")(e2));
      }
    });
}

export function syncPlannedMeal(m: PlannedMeal) {
  supabase?.from("planned_meals").upsert(plannedMealToRow(m)).then(({ error }) => warn("planned_meal")(error));
}

export function syncCategoryOrder(categories: string[]) {
  supabase
    ?.from("category_order")
    .upsert({ household_id: HOUSEHOLD_ID, categories })
    .then(({ error }) => warn("category_order")(error));
}

export function syncSettings(settings: { kiwiPlussEnabled: boolean; trippelTrumfToday: boolean }) {
  supabase
    ?.from("household_settings")
    .upsert({
      household_id: HOUSEHOLD_ID,
      kiwi_pluss_enabled: settings.kiwiPlussEnabled,
      trippel_trumf_today: settings.trippelTrumfToday,
    })
    .then(({ error }) => warn("household_settings")(error));
}

export function syncGroceryChecked(periodKey: string, foodId: string, checked: boolean) {
  supabase
    ?.from("grocery_checked")
    .upsert({ household_id: HOUSEHOLD_ID, food_id: foodId, iso_week: periodKey, checked })
    .then(({ error }) => warn("grocery_checked")(error));
}

export function syncManualGroceryItem(item: { id: string; periodKey: string; foodId: string; grams: number }) {
  supabase
    ?.from("manual_grocery_items")
    .upsert({
      id: item.id,
      household_id: HOUSEHOLD_ID,
      period_key: item.periodKey,
      food_id: item.foodId,
      grams: item.grams,
    })
    .then(({ error }) => warn("manual_grocery_items")(error));
}

export function deleteManualGroceryItem(id: string) {
  supabase?.from("manual_grocery_items").delete().eq("id", id).then(({ error }) => warn("manual_grocery_items delete")(error));
}

export async function loadSettings(): Promise<{ kiwiPlussEnabled: boolean; trippelTrumfToday: boolean } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("household_settings")
    .select("*")
    .eq("household_id", HOUSEHOLD_ID)
    .maybeSingle();
  if (!data) return null;
  return { kiwiPlussEnabled: data.kiwi_pluss_enabled, trippelTrumfToday: data.trippel_trumf_today };
}

/** One-time push of local seed data into an empty Supabase project. */
export async function seedSupabaseIfEmpty(initial: HouseholdState) {
  if (!supabase) return;
  const { count } = await supabase.from("people").select("id", { count: "exact", head: true });
  if (count && count > 0) return; // already seeded

  await supabase.from("people").insert(initial.people.map(personToRow));
  await supabase.from("foods").insert(initial.foods.map(foodToRow));
  await supabase.from("recipes").insert(initial.recipes.map(recipeToRow));
  for (const r of initial.recipes) {
    if (r.ingredients.length === 0) continue;
    await supabase.from("recipe_ingredients").insert(r.ingredients.map((ing) => ({ recipe_id: r.id, food_id: ing.foodId, grams: ing.grams })));
  }
  await supabase.from("planned_meals").insert(initial.weekPlan.map(plannedMealToRow));
  await supabase.from("category_order").upsert({ household_id: HOUSEHOLD_ID, categories: initial.categoryOrder });
  await supabase.from("household_settings").upsert({ household_id: HOUSEHOLD_ID, kiwi_pluss_enabled: true, trippel_trumf_today: false });
}
