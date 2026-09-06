import { useMemo, useState } from "react";
import { Check, ChevronRight, Plus, Search } from "lucide-react";
import { useStore } from "../../store/useStore";
import { recipePersonMacros, SLOT_LABELS } from "../../utils/calculations";
import { getWeekDates, formatDayLabel, todayISO, addDays } from "../../utils/dates";
import ScreenHeader from "../ScreenHeader";
import FoodThumb from "../FoodThumb";
import KassalSearchModal from "../KassalSearchModal";
import RecipeBuilderModal from "../RecipeBuilderModal";
import type { MealSlot } from "../../types";

export default function OppskrifterScreen() {
  const { recipes, foods, people, addMealToPlan } = useStore();
  const [query, setQuery] = useState("");
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
  const [portionPersonId, setPortionPersonId] = useState(people[0].id);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addDate, setAddDate] = useState(todayISO());
  const [addSlot, setAddSlot] = useState<MealSlot>("middag");
  const [addScope, setAddScope] = useState<string | null>(null); // null = begge
  const [justAdded, setJustAdded] = useState(false);
  const [showKassalSearch, setShowKassalSearch] = useState(false);
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);

  const openRecipe = recipes.find((r) => r.id === openRecipeId);
  const portionPerson = people.find((p) => p.id === portionPersonId)!;
  const foodMap = new Map(foods.map((f) => [f.id, f]));

  const macros = useMemo(
    () => (openRecipe ? recipePersonMacros(openRecipe, foods, 1) : null),
    [openRecipe, foods]
  );

  if (openRecipe && macros) {
    return (
      <div className="pb-28">
        <ScreenHeader title="Måltider" onBack={() => setOpenRecipeId(null)} />
        {showKassalSearch && <KassalSearchModal onClose={() => setShowKassalSearch(false)} />}
        <div className="px-4 pt-4">
          <div className="rounded-3xl p-5" style={{ background: "var(--color-cream-deep)" }}>
            <p className="text-center font-display text-[20px] font-bold">{openRecipe.name}</p>
            <div className="mt-1 flex justify-center">
              <div className="flex rounded-full bg-white/70 p-1">
                {people.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPortionPersonId(p.id)}
                    className="rounded-full px-3 py-1 text-[12px] font-semibold"
                    style={{
                      background: portionPersonId === p.id ? "white" : "transparent",
                      color: "var(--color-ink)",
                    }}
                  >
                    {p.name}'s porsjon
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {openRecipe.ingredients.map((ing, i) => {
                const food = foodMap.get(ing.foodId);
                if (!food) return null;
                const grams = Math.round(ing.grams / openRecipe.basePortions);
                return (
                  <div key={i} className="relative rounded-2xl bg-white p-3 text-center shadow-sm">
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-(--color-leaf)">
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                    <div className="mx-auto">
                      <FoodThumb food={food} size={56} />
                    </div>
                    <p className="mt-2 text-[13px] font-bold leading-tight">{food.name}</p>
                    <p className="text-[12px] text-(--color-ink-soft)">({grams}g)</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-white p-3">
              <p className="mb-2 text-center text-[12px] font-semibold text-(--color-ink-soft)">
                Næring ({portionPerson.name}):
              </p>
              <div className="flex justify-around text-center">
                {(
                  [
                    ["kcal", Math.round(macros.kcal), ""],
                    ["Protein", Math.round(macros.protein), "g"],
                    ["Karbo", Math.round(macros.carbs), "g"],
                    ["Fett", Math.round(macros.fat), "g"],
                  ] as const
                ).map(([label, value, unit]) => (
                  <div key={label}>
                    <p className="text-[16px] font-bold">
                      {value}
                      {unit}
                    </p>
                    <p className="text-[10.5px] text-(--color-ink-soft)">{label === "kcal" ? "kcal" : label}</p>
                  </div>
                ))}
              </div>
            </div>

            {!showAddPicker ? (
              <button
                onClick={() => setShowAddPicker(true)}
                className="mt-4 w-full rounded-2xl py-3.5 text-center text-[14px] font-bold tracking-wide text-white shadow-[0_6px_16px_rgba(78,138,82,0.35)]"
                style={{ background: "var(--color-leaf)" }}
              >
                LEGG TIL UKEPLAN
              </button>
            ) : (
              <div className="mt-4 rounded-2xl bg-white p-3">
                <p className="mb-2 text-[12px] font-semibold text-(--color-ink-soft)">Velg dag og måltid:</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[...getWeekDates(todayISO()), ...getWeekDates(addDays(todayISO(), 7))].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAddDate(d)}
                      className="flex-none rounded-full px-3 py-1.5 text-[12px] font-semibold"
                      style={{
                        background: addDate === d ? "var(--color-sage)" : "var(--color-cream)",
                      }}
                    >
                      {formatDayLabel(d).slice(0, 3)} {d.slice(8, 10)}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  {(Object.keys(SLOT_LABELS) as MealSlot[]).map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setAddSlot(slot)}
                      className="flex-1 rounded-full px-2 py-1.5 text-[12px] font-semibold"
                      style={{
                        background: addSlot === slot ? "var(--color-sage)" : "var(--color-cream)",
                      }}
                    >
                      {SLOT_LABELS[slot]}
                    </button>
                  ))}
                </div>
                <p className="mb-1 mt-3 text-[12px] font-semibold text-(--color-ink-soft)">Gjelder:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddScope(null)}
                    className="flex-1 rounded-full px-2 py-1.5 text-[12px] font-semibold"
                    style={{ background: addScope === null ? "var(--color-sage)" : "var(--color-cream)" }}
                  >
                    Begge
                  </button>
                  {people.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAddScope(p.id)}
                      className="flex-1 rounded-full px-2 py-1.5 text-[12px] font-semibold"
                      style={{ background: addScope === p.id ? "var(--color-sage)" : "var(--color-cream)" }}
                    >
                      Bare {p.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    addMealToPlan(openRecipe.id, addDate, addSlot, addScope);
                    setShowAddPicker(false);
                    setJustAdded(true);
                    setTimeout(() => setJustAdded(false), 2000);
                  }}
                  className="mt-3 w-full rounded-2xl py-3 text-center text-[14px] font-bold text-white"
                  style={{ background: "var(--color-orange)" }}
                >
                  Bekreft
                </button>
              </div>
            )}
            {justAdded && (
              <p className="mt-2 text-center text-[12.5px] font-semibold text-(--color-leaf)">
                Lagt til i ukeplanen ✓
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <ScreenHeader
        title="Måltider"
        right={
          <button onClick={() => setShowKassalSearch(true)} className="rounded-full bg-white/70 p-2 active:bg-white">
            <Search size={18} color="var(--color-ink)" />
          </button>
        }
      />
      {showKassalSearch && <KassalSearchModal onClose={() => setShowKassalSearch(false)} />}
      {showRecipeBuilder && <RecipeBuilderModal onClose={() => setShowRecipeBuilder(false)} />}
      <div className="px-4 pt-4">
        <div className="mb-3.5 flex items-center gap-2.5 rounded-[18px] bg-(--color-card) px-4" style={{ minHeight: 50 }}>
          <Search size={16} color="var(--color-ink-faint)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk i dine måltider"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-(--color-ink-faint)"
          />
        </div>
        <button
          onClick={() => setShowRecipeBuilder(true)}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[13.5px] font-bold text-white"
          style={{ background: "var(--color-leaf)" }}
        >
          <Plus size={15} strokeWidth={3} /> Nytt måltid
        </button>
        <div className="flex flex-col gap-3">
          {recipes
            .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
            .map((r) => {
            const m = recipePersonMacros(r, foods, 1);
            return (
              <button
                key={r.id}
                onClick={() => setOpenRecipeId(r.id)}
                className="flex items-center gap-3.5 rounded-[22px] bg-(--color-card) p-3.5 text-left"
              >
                <div className="flex h-[70px] w-[70px] flex-none items-center justify-center rounded-2xl border border-dashed border-(--color-ink)/10 bg-(--color-cream-mid) text-3xl">
                  {r.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-semibold leading-tight text-(--color-ink)">{r.name}</p>
                  <p className="mt-1 text-[12.5px] text-(--color-ink-soft)">{r.ingredients.length} ingredienser</p>
                  <div className="mt-2 flex gap-1.5">
                    <span
                      className="rounded-[9px] px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: "var(--color-leaf-light)", color: "#3F7343" }}
                    >
                      måltid
                    </span>
                    <span
                      className="rounded-[9px] px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: "var(--color-orange-light)", color: "var(--color-orange-text)" }}
                    >
                      {Math.round(m.kcal)} kcal
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} color="var(--color-ink-faint)" />
              </button>
            );
          })}
          {recipes.length === 0 && (
            <p className="mt-6 text-center text-[13px] text-(--color-ink-soft)">
              Ingen måltider ennå. Trykk "Nytt måltid" for å bygge ditt første.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
