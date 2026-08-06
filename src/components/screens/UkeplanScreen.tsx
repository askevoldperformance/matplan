import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Minus, Plus, X } from "lucide-react";
import { useStore } from "../../store/useStore";
import {
  SLOT_LABELS,
  eatenMacrosForPersonDay,
  recipePersonMacros,
  mealAppliesToPerson,
  mealItemMacros,
} from "../../utils/calculations";
import { addDays, formatDayLabel } from "../../utils/dates";
import PersonAvatar from "../PersonAvatar";
import FoodThumb from "../FoodThumb";
import AddMealItemPanel from "../AddMealItemPanel";

const SLOT_ORDER = ["frokost", "lunsj", "middag", "kveldsmat"] as const;

export default function UkeplanScreen() {
  const {
    people,
    weekPlan,
    recipes,
    foods,
    selectedDate,
    setSelectedDate,
    toggleEaten,
    updateMealPortion,
    removeMealItem,
    ensureMealForSlot,
  } = useStore();
  const [activePersonId, setActivePersonId] = useState(people[0].id);
  const [editMode, setEditMode] = useState(false);
  const [addingToMealId, setAddingToMealId] = useState<string | null>(null);

  const person = people.find((p) => p.id === activePersonId)!;
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const foodMap = new Map(foods.map((f) => [f.id, f]));

  const todaysMeals = useMemo(
    () =>
      weekPlan
        .filter((m) => m.date === selectedDate && mealAppliesToPerson(m, person.id))
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot as any) - SLOT_ORDER.indexOf(b.slot as any)),
    [weekPlan, selectedDate, person]
  );

  const dailyNutrition = useMemo(
    () => eatenMacrosForPersonDay(person.id, selectedDate, weekPlan, recipes, foods),
    [person, selectedDate, weekPlan, recipes, foods]
  );

  function handleAddProductToSlot(slot: (typeof SLOT_ORDER)[number]) {
    const mealId = ensureMealForSlot(selectedDate, slot, person.id);
    setAddingToMealId(mealId);
  }

  return (
    <div className="pb-28">
      <div className="safe-top flex items-center justify-between px-5 pb-5 pt-4" style={{ background: "var(--color-sage)" }}>
        <h1 className="font-display text-[22px] font-bold tracking-tight">Ukeplan</h1>
        <PersonAvatar person={person} size={40} />
      </div>

      <div className="-mt-2 px-4">
        <div className="flex rounded-full bg-(--color-card) p-1 shadow-sm">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePersonId(p.id)}
              className="flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors"
              style={{
                background: activePersonId === p.id ? "var(--color-cream-deep)" : "transparent",
                color: activePersonId === p.id ? "var(--color-ink)" : "var(--color-ink-soft)",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="rounded-full p-2 active:bg-black/5">
            <ChevronLeft size={22} />
          </button>
          <h2 className="font-display text-[18px] font-bold">{formatDayLabel(selectedDate)}</h2>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="rounded-full p-2 active:bg-black/5">
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {SLOT_ORDER.map((slot) => {
            const mealsForSlot = todaysMeals.filter((m) => m.slot === slot);
            const addingMeal = addingToMealId ? weekPlan.find((m) => m.id === addingToMealId) : null;
            const showEmptySlotPanel = mealsForSlot.length === 0 && addingMeal?.slot === slot && addingMeal?.date === selectedDate;
            if (mealsForSlot.length === 0) {
              return (
                <div key={slot} className="rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
                  <p className="text-[15px] font-bold">{SLOT_LABELS[slot]}</p>
                  <p className="text-[12.5px] text-(--color-ink-soft)">Ingenting planlagt</p>
                  {editMode && !showEmptySlotPanel && (
                    <button
                      onClick={() => handleAddProductToSlot(slot)}
                      className="mt-2 text-[12.5px] font-semibold text-(--color-orange-dark)"
                    >
                      + Legg til produkt
                    </button>
                  )}
                  {showEmptySlotPanel && addingToMealId && (
                    <AddMealItemPanel mealId={addingToMealId} personId={person.id} onDone={() => setAddingToMealId(null)} />
                  )}
                </div>
              );
            }
            return mealsForSlot.map((m) => {
              const recipe = m.recipeId ? recipeMap.get(m.recipeId) : undefined;
              const eaten = m.eatenBy[person.id];
              const factor = m.personPortions[person.id] ?? 1;
              const recipeMacros = recipe ? recipePersonMacros(recipe, foods, factor) : null;
              const myItems = m.items.filter((it) => it.personId === person.id);
              return (
                <div
                  key={m.id}
                  className="rounded-3xl p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]"
                  style={{ background: eaten ? "var(--color-leaf-light)" : "var(--color-card)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white text-2xl">
                      {recipe?.icon ?? "🍴"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold">
                        {SLOT_LABELS[m.slot]}
                        {m.personId && <span className="ml-1.5 text-[10.5px] font-semibold text-(--color-orange-dark)">(kun {person.name})</span>}
                      </p>
                      <p className="truncate text-[13px] text-(--color-ink-soft)">{recipe?.name ?? (myItems.length === 0 ? "Egne varer" : "")}</p>
                      {editMode && recipe && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => updateMealPortion(m.id, person.id, Math.max(0.25, factor - 0.1))}
                            className="rounded-full bg-white p-1 shadow-sm active:scale-95"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-14 text-center text-[12px] font-semibold">{Math.round(recipeMacros?.kcal ?? 0)} kcal</span>
                          <button
                            onClick={() => updateMealPortion(m.id, person.id, factor + 0.1)}
                            className="rounded-full bg-white p-1 shadow-sm active:scale-95"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleEaten(m.id, person.id)}
                      className="flex flex-none items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors"
                      style={{
                        background: eaten ? "var(--color-leaf)" : "transparent",
                        color: eaten ? "white" : "var(--color-ink-soft)",
                        border: eaten ? "none" : "1.5px solid #D9D3C4",
                      }}
                    >
                      {eaten && <Check size={14} strokeWidth={3} />}
                      Spist
                    </button>
                  </div>

                  {myItems.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-(--color-cream-deep) pt-3">
                      {myItems.map((it) => {
                        const food = foodMap.get(it.foodId);
                        if (!food) return null;
                        const macros = mealItemMacros(it, foods);
                        return (
                          <div key={it.id} className="flex items-center gap-2">
                            <FoodThumb food={food} size={28} />
                            <span className="flex-1 truncate text-[12.5px]">
                              {food.name} · {Math.round(it.grams)}g · {Math.round(macros.kcal)} kcal
                            </span>
                            {editMode && (
                              <button onClick={() => removeMealItem(m.id, it.id)} className="p-1">
                                <X size={13} color="var(--color-ink-soft)" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {editMode && (
                    <button
                      onClick={() => setAddingToMealId(addingToMealId === m.id ? null : m.id)}
                      className="mt-2 text-[12.5px] font-semibold text-(--color-orange-dark)"
                    >
                      + Legg til produkt
                    </button>
                  )}
                  {addingToMealId === m.id && (
                    <AddMealItemPanel mealId={m.id} personId={person.id} onDone={() => setAddingToMealId(null)} />
                  )}
                </div>
              );
            });
          })}
        </div>

        <div className="mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
          <p className="mb-2 text-center text-[13px] font-semibold text-(--color-ink-soft)">
            Dagens Næring ({person.name}):
          </p>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-[18px] font-bold">{Math.round(dailyNutrition.kcal)}</p>
              <p className="text-[11px] text-(--color-ink-soft)">kcal</p>
            </div>
            <div>
              <p className="text-[18px] font-bold">{Math.round(dailyNutrition.protein)}g</p>
              <p className="text-[11px] text-(--color-ink-soft)">Protein</p>
            </div>
            <div>
              <p className="text-[18px] font-bold">{Math.round(dailyNutrition.carbs)}g</p>
              <p className="text-[11px] text-(--color-ink-soft)">Karbo</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditMode((v) => !v)}
          className="mt-4 w-full rounded-2xl py-3.5 text-center text-[14px] font-bold tracking-wide text-white shadow-[0_6px_16px_rgba(232,130,74,0.35)]"
          style={{ background: editMode ? "var(--color-sage-dark)" : "var(--color-orange)" }}
        >
          {editMode ? "FERDIG" : "REDIGER PLAN"}
        </button>
      </div>
    </div>
  );
}
