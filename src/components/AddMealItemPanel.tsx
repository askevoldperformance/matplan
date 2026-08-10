import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useStore } from "../store/useStore";
import { getUnitsForFood } from "../utils/units";
import FoodThumb from "./FoodThumb";
import KassalSearchModal from "./KassalSearchModal";
import NumberField from "./NumberField";
import type { FoodItem } from "../types";

export default function AddMealItemPanel({
  mealId,
  personId,
  onDone,
}: {
  mealId: string;
  personId: string;
  onDone: () => void;
}) {
  const { foods, addMealItem } = useStore();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [showKassalSearch, setShowKassalSearch] = useState(false);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }, [foods, query]);

  const units = picked ? getUnitsForFood(picked) : [];

  function confirm() {
    if (!picked) return;
    const unit = units[unitIdx];
    const grams = unit ? unit.grams * qty : qty;
    addMealItem(mealId, { foodId: picked.id, grams, personId });
    onDone();
  }

  return (
    <div className="mt-2 rounded-2xl bg-(--color-cream) p-3">
      {showKassalSearch && <KassalSearchModal onClose={() => setShowKassalSearch(false)} />}

      {!picked ? (
        <>
          <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2">
            <Search size={15} color="var(--color-ink-soft)" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk i dine matvarer..."
              className="flex-1 bg-transparent text-[13px] outline-none"
            />
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {matches.map((f) => (
              <button
                key={f.id}
                onClick={() => setPicked(f)}
                className="flex items-center gap-2 rounded-xl bg-white p-2 text-left"
              >
                <FoodThumb food={f} size={32} />
                <span className="truncate text-[13px] font-semibold">{f.name}</span>
              </button>
            ))}
            {query.trim().length >= 2 && matches.length === 0 && (
              <p className="px-1 text-[12px] text-(--color-ink-soft)">Ingen treff i dine matvarer.</p>
            )}
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
            <FoodThumb food={picked} size={36} />
            <span className="flex-1 truncate text-[13.5px] font-bold">{picked.name}</span>
            <button onClick={() => setPicked(null)} className="text-[12px] text-(--color-ink-soft) underline">
              Bytt
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <NumberField
              min={0.25}
              step={0.25}
              value={qty}
              onChange={setQty}
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
            onClick={confirm}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white"
            style={{ background: "var(--color-leaf)" }}
          >
            <Plus size={14} strokeWidth={3} /> Legg til
          </button>
        </>
      )}
    </div>
  );
}
