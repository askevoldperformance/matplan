import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { getUnitsForFood } from "../utils/units";
import FoodThumb from "./FoodThumb";
import KassalSearchModal from "./KassalSearchModal";
import type { Recipe, RecipeIngredient } from "../types";

export default function RecipeBuilderModal({ onClose }: { onClose: () => void }) {
  const { foods, addRecipe } = useStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🍽️");
  const [basePortions, setBasePortions] = useState(2);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  const [pickerQuery, setPickerQuery] = useState("");
  const [pickedFoodId, setPickedFoodId] = useState<string | null>(null);
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [showKassalSearch, setShowKassalSearch] = useState(false);

  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const pickedFood = pickedFoodId ? foodMap.get(pickedFoodId) : null;
  const units = pickedFood ? getUnitsForFood(pickedFood) : [];
  const matches = foods.filter((f) => f.name.toLowerCase().includes(pickerQuery.toLowerCase())).slice(0, 8);

  function addIngredient() {
    if (!pickedFood) return;
    const unit = units[unitIdx];
    const grams = unit ? unit.grams * qty : qty;
    setIngredients((prev) => [...prev, { foodId: pickedFood.id, grams }]);
    setPickedFoodId(null);
    setPickerQuery("");
    setQty(1);
    setUnitIdx(0);
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function save() {
    if (!name.trim() || ingredients.length === 0) return;
    const recipe: Recipe = {
      id: `r-${Date.now()}`,
      name: name.trim(),
      icon,
      basePortions,
      ingredients,
    };
    addRecipe(recipe);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      {showKassalSearch && <KassalSearchModal onClose={() => setShowKassalSearch(false)} />}
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-3xl bg-(--color-cream) p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold">Nytt måltid</h2>
          <button onClick={onClose} className="rounded-full bg-white p-1.5 shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-2">
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 2))}
              className="w-14 rounded-xl bg-white px-2 py-2.5 text-center text-[20px] outline-none"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Navn på måltidet..."
              className="flex-1 rounded-xl bg-white px-3 py-2.5 text-[14px] outline-none"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-(--color-ink-soft)">Grunnoppskrift for</span>
            <input
              type="number"
              min={1}
              value={basePortions}
              onChange={(e) => setBasePortions(Math.max(1, Number(e.target.value)))}
              className="w-16 rounded-xl bg-white px-2 py-1.5 text-center text-[14px] outline-none"
            />
            <span className="text-[12.5px] font-semibold text-(--color-ink-soft)">porsjoner</span>
          </div>

          {ingredients.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {ingredients.map((ing, i) => {
                const food = foodMap.get(ing.foodId);
                if (!food) return null;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-2xl bg-white p-2.5">
                    <FoodThumb food={food} size={32} />
                    <span className="flex-1 truncate text-[13px] font-semibold">
                      {food.name} · {Math.round(ing.grams)}g
                    </span>
                    <button onClick={() => removeIngredient(i)} className="p-1">
                      <Trash2 size={15} color="var(--color-orange-dark)" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-(--color-cream-deep) p-3">
            <p className="mb-2 text-[12.5px] font-bold">Legg til ingrediens</p>
            {!pickedFood ? (
              <>
                <input
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Søk i dine matvarer..."
                  className="w-full rounded-xl bg-white px-3 py-2 text-[13px] outline-none"
                />
                <div className="mt-2 flex flex-col gap-1.5">
                  {matches.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setPickedFoodId(f.id)}
                      className="flex items-center gap-2 rounded-xl bg-white p-2 text-left"
                    >
                      <FoodThumb food={f} size={28} />
                      <span className="truncate text-[13px] font-semibold">{f.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowKassalSearch(true)}
                  className="mt-2 text-[12px] font-semibold text-(--color-orange-dark) underline"
                >
                  Ikke i listen? Søk i butikk
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <FoodThumb food={pickedFood} size={32} />
                  <span className="flex-1 truncate text-[13px] font-bold">{pickedFood.name}</span>
                  <button onClick={() => setPickedFoodId(null)} className="text-[12px] text-(--color-ink-soft) underline">
                    Bytt
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-16 rounded-xl bg-white px-2 py-1.5 text-center text-[14px] outline-none"
                  />
                  <div className="flex flex-1 gap-1.5 overflow-x-auto">
                    {units.map((u, i) => (
                      <button
                        key={u.label}
                        onClick={() => setUnitIdx(i)}
                        className="flex-none rounded-full px-3 py-1.5 text-[12px] font-semibold"
                        style={{ background: unitIdx === i ? "var(--color-sage)" : "white" }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addIngredient}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white"
                  style={{ background: "var(--color-leaf)" }}
                >
                  <Plus size={14} strokeWidth={3} /> Legg til i måltidet
                </button>
              </>
            )}
          </div>
        </div>

        <button
          onClick={save}
          disabled={!name.trim() || ingredients.length === 0}
          className="mt-4 w-full rounded-2xl py-3.5 text-center text-[14px] font-bold text-white disabled:opacity-40"
          style={{ background: "var(--color-orange)" }}
        >
          LAGRE MÅLTID
        </button>
      </div>
    </div>
  );
}
