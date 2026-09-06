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
import {
  addDays,
  addMonths,
  dayOfMonth,
  formatDayLabel,
  formatMonthLabel,
  getMonthGridDates,
  getWeekDates,
  isSameMonth,
  todayISO,
  weekNumber,
} from "../../utils/dates";
import PersonAvatar from "../PersonAvatar";
import FoodThumb from "../FoodThumb";
import AddMealItemPanel from "../AddMealItemPanel";
import type { PlannedMeal } from "../../types";

const SLOT_ORDER = ["frokost", "lunsj", "middag", "kveldsmat"] as const;
type ViewMode = "dag" | "uke" | "maned";

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
    addMealToPlan,
    removeMeal,
    removeMealsInRange,
    copyWeek,
  } = useStore();
  const [activePersonId, setActivePersonId] = useState(people[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("dag");
  const [editMode, setEditMode] = useState(false);
  const [addingToMealId, setAddingToMealId] = useState<string | null>(null);

  const person = people.find((p) => p.id === activePersonId)!;
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const foodMap = new Map(foods.map((f) => [f.id, f]));

  function jumpToDay(date: string) {
    setSelectedDate(date);
    setViewMode("dag");
  }

  return (
    <div className="pb-28">
      <div className="safe-top flex items-center justify-between px-5 pb-3 pt-4">
        <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-(--color-ink)">Matplan</h1>
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

        <div className="mt-3 flex rounded-full bg-(--color-card) p-1 shadow-sm">
          {([
            ["dag", "Dag"],
            ["uke", "Uke"],
            ["maned", "Måned"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors"
              style={{
                background: viewMode === mode ? "var(--color-sage)" : "transparent",
                color: "var(--color-ink)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {viewMode === "dag" && (
          <DagView
            person={person}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            weekPlan={weekPlan}
            recipes={recipes}
            foods={foods}
            recipeMap={recipeMap}
            foodMap={foodMap}
            editMode={editMode}
            setEditMode={setEditMode}
            addingToMealId={addingToMealId}
            setAddingToMealId={setAddingToMealId}
            toggleEaten={toggleEaten}
            updateMealPortion={updateMealPortion}
            removeMealItem={removeMealItem}
            ensureMealForSlot={ensureMealForSlot}
            addMealToPlan={addMealToPlan}
            removeMeal={removeMeal}
          />
        )}

        {viewMode === "uke" && (
          <UkeView
            person={person}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            weekPlan={weekPlan}
            recipeMap={recipeMap}
            onSelectDay={jumpToDay}
            removeMealsInRange={removeMealsInRange}
            copyWeek={copyWeek}
          />
        )}

        {viewMode === "maned" && (
          <ManedView
            person={person}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            weekPlan={weekPlan}
            onSelectDay={jumpToDay}
            removeMealsInRange={removeMealsInRange}
          />
        )}
      </div>
    </div>
  );
}

// ---------- Dag ----------

function DagView({
  person,
  selectedDate,
  setSelectedDate,
  weekPlan,
  recipes,
  foods,
  recipeMap,
  foodMap,
  editMode,
  setEditMode,
  addingToMealId,
  setAddingToMealId,
  toggleEaten,
  updateMealPortion,
  removeMealItem,
  ensureMealForSlot,
  addMealToPlan,
  removeMeal,
}: any) {
  const [pickingMealSlot, setPickingMealSlot] = useState<string | null>(null);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const todaysMeals = useMemo(
    () =>
      weekPlan
        .filter((m: PlannedMeal) => m.date === selectedDate && mealAppliesToPerson(m, person.id))
        .sort((a: PlannedMeal, b: PlannedMeal) => SLOT_ORDER.indexOf(a.slot as any) - SLOT_ORDER.indexOf(b.slot as any)),
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
    <>
      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-(--color-card) p-1.5">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--color-cream-soft) text-(--color-ink-soft) active:bg-(--color-cream-mid)"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-display text-[15px] font-semibold text-(--color-ink)">{formatDayLabel(selectedDate)}</h2>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--color-cream-soft) text-(--color-ink-soft) active:bg-(--color-cream-mid)"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {SLOT_ORDER.map((slot) => {
          const mealsForSlot = todaysMeals.filter((m: PlannedMeal) => m.slot === slot);
          const addingMeal = addingToMealId ? weekPlan.find((m: PlannedMeal) => m.id === addingToMealId) : null;
          const showEmptySlotPanel = mealsForSlot.length === 0 && addingMeal?.slot === slot && addingMeal?.date === selectedDate;
          if (mealsForSlot.length === 0) {
            const isPicking = pickingMealSlot === slot;
            return (
              <div key={slot} className="rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
                <p className="text-[15px] font-bold">{SLOT_LABELS[slot]}</p>
                <p className="text-[12.5px] text-(--color-ink-soft)">Ingenting planlagt</p>
                {editMode && !showEmptySlotPanel && !isPicking && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      onClick={() => setPickingMealSlot(slot)}
                      className="text-[12.5px] font-semibold text-(--color-leaf)"
                    >
                      + Legg til måltid
                    </button>
                    <button
                      onClick={() => handleAddProductToSlot(slot)}
                      className="text-[12.5px] font-semibold text-(--color-orange-dark)"
                    >
                      + Legg til produkt
                    </button>
                  </div>
                )}
                {isPicking && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl bg-(--color-cream) p-2">
                    {recipes.length === 0 && (
                      <p className="p-2 text-[12.5px] text-(--color-ink-soft)">
                        Ingen lagrede måltider ennå — lag ett under Måltider-fanen først.
                      </p>
                    )}
                    {recipes.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          addMealToPlan(r.id, selectedDate, slot, null);
                          setPickingMealSlot(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl p-2 text-left active:bg-white"
                      >
                        <span className="text-[20px]">{r.icon}</span>
                        <span className="truncate text-[13px] font-semibold">{r.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setPickingMealSlot(null)}
                      className="mt-1 w-full rounded-xl py-1.5 text-center text-[12px] font-semibold text-(--color-ink-soft)"
                    >
                      Avbryt
                    </button>
                  </div>
                )}
                {showEmptySlotPanel && addingToMealId && (
                  <AddMealItemPanel mealId={addingToMealId} personId={person.id} onDone={() => setAddingToMealId(null)} />
                )}
              </div>
            );
          }
          return mealsForSlot.map((m: PlannedMeal) => {
            const recipe = m.recipeId ? recipeMap.get(m.recipeId) : undefined;
            const eaten = m.eatenBy[person.id];
            const factor = m.personPortions[person.id] ?? 1;
            const recipeMacros = recipe ? recipePersonMacros(recipe, foods, factor) : null;
            const myItems = m.items.filter((it: any) => it.personId === person.id);
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

                {editMode && (
                  <div className="mt-2 flex gap-3 border-t border-(--color-cream-deep) pt-2">
                    {recipe && (
                      <button
                        onClick={() => setSwappingMealId(swappingMealId === m.id ? null : m.id)}
                        className="text-[12px] font-semibold text-(--color-leaf)"
                      >
                        Bytt måltid
                      </button>
                    )}
                    <button
                      onClick={() => removeMeal(m.id)}
                      className="text-[12px] font-semibold text-(--color-orange-dark)"
                    >
                      Fjern
                    </button>
                  </div>
                )}
                {swappingMealId === m.id && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl bg-(--color-cream) p-2">
                    {recipes.map((r: any) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          removeMeal(m.id);
                          addMealToPlan(r.id, m.date, m.slot, m.personId ?? null);
                          setSwappingMealId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl p-2 text-left active:bg-white"
                      >
                        <span className="text-[20px]">{r.icon}</span>
                        <span className="truncate text-[13px] font-semibold">{r.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setSwappingMealId(null)}
                      className="mt-1 w-full rounded-xl py-1.5 text-center text-[12px] font-semibold text-(--color-ink-soft)"
                    >
                      Avbryt
                    </button>
                  </div>
                )}

                {myItems.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-(--color-cream-deep) pt-3">
                    {myItems.map((it: any) => {
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
        onClick={() => setEditMode((v: boolean) => !v)}
        className="mt-4 w-full rounded-2xl py-3.5 text-center text-[14px] font-bold tracking-wide text-white shadow-[0_6px_16px_rgba(232,130,74,0.35)]"
        style={{ background: editMode ? "var(--color-sage-dark)" : "var(--color-orange)" }}
      >
        {editMode ? "FERDIG" : "REDIGER PLAN"}
      </button>
    </>
  );
}

// ---------- Uke ----------

function UkeView({ person, selectedDate, setSelectedDate, weekPlan, recipeMap, onSelectDay, removeMealsInRange, copyWeek }: any) {
  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const today = todayISO();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [showCopyPicker, setShowCopyPicker] = useState(false);

  function handleClearWeek() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    removeMealsInRange(dates);
    setConfirmingClear(false);
  }

  function handleCopyTo(weeksAhead: number) {
    copyWeek(dates[0], addDays(dates[0], weeksAhead * 7));
    setShowCopyPicker(false);
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-(--color-card) p-1.5">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--color-cream-soft) text-(--color-ink-soft) active:bg-(--color-cream-mid)"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-display text-[15px] font-semibold text-(--color-ink)">Uke {weekNumber(selectedDate)}</h2>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--color-cream-soft) text-(--color-ink-soft) active:bg-(--color-cream-mid)"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setShowCopyPicker((v) => !v)}
          className="rounded-full bg-(--color-card) px-3 py-1.5 text-[12.5px] font-semibold text-(--color-leaf)"
        >
          Kopier denne uken til...
        </button>
        <button
          onClick={handleClearWeek}
          className="rounded-full bg-(--color-card) px-3 py-1.5 text-[12.5px] font-semibold text-(--color-orange-dark)"
        >
          {confirmingClear ? "Trykk igjen for å bekrefte" : "Tøm uken"}
        </button>
      </div>
      {showCopyPicker && (
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => handleCopyTo(n)}
              className="flex-1 rounded-full bg-(--color-card) py-2 text-[12.5px] font-semibold"
            >
              +{n} uke{n > 1 ? "r" : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {dates.map((date: string) => {
          const mealsToday = weekPlan
            .filter((m: PlannedMeal) => m.date === date && mealAppliesToPerson(m, person.id))
            .sort((a: PlannedMeal, b: PlannedMeal) => SLOT_ORDER.indexOf(a.slot as any) - SLOT_ORDER.indexOf(b.slot as any));
          return (
            <button
              key={date}
              onClick={() => onSelectDay(date)}
              className="rounded-3xl bg-(--color-card) p-4 text-left shadow-[0_4px_16px_rgba(60,50,20,0.06)]"
              style={date === today ? { boxShadow: "0 0 0 2px var(--color-orange)" } : undefined}
            >
              <p className="mb-1.5 text-[14px] font-bold">
                {formatDayLabel(date)} <span className="text-(--color-ink-soft)">{dayOfMonth(date)}.</span>
              </p>
              {mealsToday.length === 0 ? (
                <p className="text-[12.5px] text-(--color-ink-soft)">Ingenting planlagt</p>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {mealsToday.map((m: PlannedMeal) => {
                    const recipe = m.recipeId ? recipeMap.get(m.recipeId) : undefined;
                    return (
                      <span key={m.id} className="text-[12.5px] text-(--color-ink-soft)">
                        {SLOT_LABELS[m.slot]}: {recipe?.name ?? "Egne varer"}
                        {m.personId && " ·"}
                      </span>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------- Måned ----------

function ManedView({ person, selectedDate, setSelectedDate, weekPlan, onSelectDay, removeMealsInRange }: any) {
  const gridDates = useMemo(() => getMonthGridDates(selectedDate), [selectedDate]);
  const today = todayISO();
  const weekdayHeaders = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const [confirmingClear, setConfirmingClear] = useState(false);

  const mealCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of weekPlan) {
      if (!mealAppliesToPerson(m, person.id)) continue;
      counts[m.date] = (counts[m.date] ?? 0) + 1;
    }
    return counts;
  }, [weekPlan, person]);

  function handleClearMonth() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    const monthDates = gridDates.filter((d: string) => isSameMonth(d, selectedDate));
    removeMealsInRange(monthDates);
    setConfirmingClear(false);
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-(--color-card) p-1.5">
        <button
          onClick={() => setSelectedDate(addMonths(selectedDate, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--color-cream-soft) text-(--color-ink-soft) active:bg-(--color-cream-mid)"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-display text-[15px] font-semibold text-(--color-ink)">{formatMonthLabel(selectedDate)}</h2>
        <button
          onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-(--color-cream-soft) text-(--color-ink-soft) active:bg-(--color-cream-mid)"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <button
        onClick={handleClearMonth}
        className="mt-3 rounded-full bg-(--color-card) px-3 py-1.5 text-[12.5px] font-semibold text-(--color-orange-dark)"
      >
        {confirmingClear ? "Trykk igjen for å bekrefte" : "Tøm måneden"}
      </button>

      <div className="mt-4 rounded-3xl bg-(--color-card) p-3 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayHeaders.map((d) => (
            <p key={d} className="text-[10.5px] font-semibold text-(--color-ink-soft)">
              {d}
            </p>
          ))}
          {gridDates.map((date) => {
            const inMonth = isSameMonth(date, selectedDate);
            const count = mealCountByDate[date] ?? 0;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => onSelectDay(date)}
                className="flex flex-col items-center gap-0.5 rounded-xl py-1.5"
                style={{
                  opacity: inMonth ? 1 : 0.35,
                  background: isToday ? "var(--color-cream-deep)" : "transparent",
                }}
              >
                <span className="text-[13px] font-semibold">{dayOfMonth(date)}</span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: count > 0 ? "var(--color-leaf)" : "transparent" }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-center text-[12px] text-(--color-ink-soft)">
        Trykk en dag for å planlegge. Grønn prikk = måltid planlagt for {person.name}.
      </p>
    </>
  );
}
