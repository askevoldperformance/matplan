import { create } from "zustand";
import type { FoodItem, GroceryRange, HouseholdState, Person, PlannedMeal, Recipe } from "../types";
import { createInitialState } from "../data/seed";
import { todayISO } from "../utils/dates";
import { autoPortionFactor } from "../utils/calculations";
import {
  loadHouseholdFromSupabase,
  seedSupabaseIfEmpty,
  syncCategoryOrder,
  syncFood,
  syncGroceryChecked,
  syncPerson,
  syncPlannedMeal,
  syncRecipe,
  syncSettings,
} from "../lib/householdSync";
import { supabaseConfigured } from "../lib/supabaseClient";

const VIEWER_STORAGE_KEY = "matplan.viewerPersonId";
const STORE_STORAGE_KEY = "matplan.activeStore";

interface StoreActions {
  loaded: boolean;
  loadHousehold: () => Promise<void>;

  toggleEaten: (mealId: string, personId: string) => void;
  toggleGroceryChecked: (periodKey: string, foodId: string) => void;
  updatePerson: (personId: string, patch: Partial<Person>) => void;
  addFood: (food: FoodItem) => void;
  updateFood: (foodId: string, patch: Partial<FoodItem>) => void;
  toggleFavorite: (foodId: string) => void;
  addRecipe: (recipe: Recipe) => void;
  updateMealPortion: (mealId: string, personId: string, factor: number) => void;
  addMealToPlan: (recipeId: string, date: string, slot: PlannedMeal["slot"], personScope: string | null) => void;
  addMealItem: (mealId: string, item: { foodId: string; grams: number; personId: string }) => void;
  removeMealItem: (mealId: string, itemId: string) => void;
  ensureMealForSlot: (date: string, slot: PlannedMeal["slot"], personScope: string | null) => string;

  selectedDate: string;
  setSelectedDate: (date: string) => void;

  groceryRange: GroceryRange;
  setGroceryRange: (range: GroceryRange) => void;

  moveCategory: (category: string, direction: "up" | "down") => void;

  kiwiPlussEnabled: boolean;
  trippelTrumfToday: boolean;
  toggleKiwiPluss: () => void;
  toggleTrippelTrumf: () => void;

  viewerPersonId: string | null;
  setViewerPersonId: (id: string) => void;

  activeStore: string;
  setActiveStore: (code: string) => void;
}

export type StoreState = HouseholdState & StoreActions;

export const useStore = create<StoreState>((set, get) => ({
  ...createInitialState(),
  loaded: !supabaseConfigured, // if no Supabase, local seed is already "loaded"
  selectedDate: todayISO(),
  groceryRange: "uke",
  kiwiPlussEnabled: true,
  trippelTrumfToday: false,
  viewerPersonId: typeof localStorage !== "undefined" ? localStorage.getItem(VIEWER_STORAGE_KEY) : null,
  activeStore: (typeof localStorage !== "undefined" && localStorage.getItem(STORE_STORAGE_KEY)) || "KIWI",

  loadHousehold: async () => {
    if (!supabaseConfigured) {
      set({ loaded: true });
      return;
    }
    const initial = createInitialState();
    await seedSupabaseIfEmpty(initial);
    const remote = await loadHouseholdFromSupabase();
    if (remote) {
      set({
        ...remote,
        loaded: true,
        categoryOrder: remote.categoryOrder.length ? remote.categoryOrder : initial.categoryOrder,
      });
    } else {
      set({ ...initial, loaded: true });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setGroceryRange: (range) => set({ groceryRange: range }),

  setViewerPersonId: (id) => {
    localStorage.setItem(VIEWER_STORAGE_KEY, id);
    set({ viewerPersonId: id });
  },

  setActiveStore: (code) => {
    localStorage.setItem(STORE_STORAGE_KEY, code);
    set({ activeStore: code });
  },

  toggleEaten: (mealId, personId) =>
    set((state) => {
      const weekPlan = state.weekPlan.map((m) =>
        m.id === mealId ? { ...m, eatenBy: { ...m.eatenBy, [personId]: !m.eatenBy[personId] } } : m
      );
      const updated = weekPlan.find((m) => m.id === mealId);
      if (updated) syncPlannedMeal(updated);
      return { weekPlan };
    }),

  toggleGroceryChecked: (periodKey, foodId) =>
    set((state) => {
      const key = `${periodKey}:${foodId}`;
      const nextVal = !state.groceryChecked[key];
      syncGroceryChecked(periodKey, foodId, nextVal);
      return { groceryChecked: { ...state.groceryChecked, [key]: nextVal } };
    }),

  updatePerson: (personId, patch) =>
    set((state) => {
      const people = state.people.map((p) => (p.id === personId ? { ...p, ...patch } : p));
      const updated = people.find((p) => p.id === personId);
      if (updated) syncPerson(updated);
      return { people };
    }),

  addFood: (food) =>
    set((state) => {
      syncFood(food);
      return { foods: [...state.foods, food] };
    }),

  updateFood: (foodId, patch) =>
    set((state) => {
      const foods = state.foods.map((f) => (f.id === foodId ? { ...f, ...patch } : f));
      const updated = foods.find((f) => f.id === foodId);
      if (updated) syncFood(updated);
      return { foods };
    }),

  toggleFavorite: (foodId) =>
    set((state) => {
      const foods = state.foods.map((f) => (f.id === foodId ? { ...f, isFavorite: !f.isFavorite } : f));
      const updated = foods.find((f) => f.id === foodId);
      if (updated) syncFood(updated);
      return { foods };
    }),

  addRecipe: (recipe) =>
    set((state) => {
      syncRecipe(recipe);
      return { recipes: [...state.recipes, recipe] };
    }),

  updateMealPortion: (mealId, personId, factor) =>
    set((state) => {
      const weekPlan = state.weekPlan.map((m) =>
        m.id === mealId ? { ...m, personPortions: { ...m.personPortions, [personId]: factor } } : m
      );
      const updated = weekPlan.find((m) => m.id === mealId);
      if (updated) syncPlannedMeal(updated);
      return { weekPlan };
    }),

  addMealToPlan: (recipeId, date, slot, personScope) =>
    set((state) => {
      const scopedPeople = personScope ? state.people.filter((p) => p.id === personScope) : state.people;
      const recipe = state.recipes.find((r) => r.id === recipeId);
      const portions: Record<string, number> = {};
      const eaten: Record<string, boolean> = {};
      for (const p of scopedPeople) {
        portions[p.id] = recipe ? autoPortionFactor(p, recipe, slot, state.foods) : 1;
        eaten[p.id] = false;
      }
      const newMeal: PlannedMeal = {
        id: `m-${Date.now()}`,
        date,
        slot,
        recipeId,
        personId: personScope,
        personPortions: portions,
        items: [],
        eatenBy: eaten,
      };
      syncPlannedMeal(newMeal);
      return { weekPlan: [...state.weekPlan, newMeal] };
    }),

  ensureMealForSlot: (date, slot, personScope) => {
    const state = get();
    const existing = state.weekPlan.find(
      (m) => m.date === date && m.slot === slot && (m.personId ?? null) === personScope
    );
    if (existing) return existing.id;
    const newMeal: PlannedMeal = {
      id: `m-${Date.now()}`,
      date,
      slot,
      personId: personScope,
      personPortions: {},
      items: [],
      eatenBy: {},
    };
    syncPlannedMeal(newMeal);
    set((s) => ({ weekPlan: [...s.weekPlan, newMeal] }));
    return newMeal.id;
  },

  addMealItem: (mealId, item) =>
    set((state) => {
      const weekPlan = state.weekPlan.map((m) =>
        m.id === mealId ? { ...m, items: [...m.items, { id: `mi-${Date.now()}`, ...item }] } : m
      );
      const updated = weekPlan.find((m) => m.id === mealId);
      if (updated) syncPlannedMeal(updated);
      return { weekPlan };
    }),

  removeMealItem: (mealId, itemId) =>
    set((state) => {
      const weekPlan = state.weekPlan.map((m) =>
        m.id === mealId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m
      );
      const updated = weekPlan.find((m) => m.id === mealId);
      if (updated) syncPlannedMeal(updated);
      return { weekPlan };
    }),

  moveCategory: (category, direction) =>
    set((state) => {
      const order = [...state.categoryOrder];
      const idx = order.indexOf(category);
      if (idx === -1) return {};
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= order.length) return {};
      [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
      syncCategoryOrder(order);
      return { categoryOrder: order };
    }),

  toggleKiwiPluss: () =>
    set((state) => {
      const next = { kiwiPlussEnabled: !state.kiwiPlussEnabled, trippelTrumfToday: state.trippelTrumfToday };
      syncSettings(next);
      return next;
    }),

  toggleTrippelTrumf: () =>
    set((state) => {
      const next = { kiwiPlussEnabled: state.kiwiPlussEnabled, trippelTrumfToday: !state.trippelTrumfToday };
      syncSettings(next);
      return next;
    }),
}));
