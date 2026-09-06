import { useEffect, useMemo, useState } from "react";
import { Share2, Sparkles, ArrowUp, ArrowDown, Plus, X, PlusCircle, MinusCircle, Trash2, RotateCcw } from "lucide-react";
import { useStore } from "../../store/useStore";
import {
  aggregateGroceryList,
  groupGroceryByCategory,
  groupGroceryByStore,
  formatGramsOrUnit,
  isTrumfStore,
  type GroceryLine,
} from "../../utils/calculations";
import { getWeekDates, startOfMonth, endOfMonth, isoWeekKey, monthKey, addDays } from "../../utils/dates";
import { STORE_OPTIONS, fetchStoreLogo } from "../../services/kassal";
import { getPackageOnlyUnits } from "../../utils/units";
import ScreenHeader from "../ScreenHeader";
import FoodThumb from "../FoodThumb";
import Toggle from "../Toggle";
import AddGroceryItemPanel from "../AddGroceryItemPanel";
import NumberField from "../NumberField";
import ProgressBar from "../ProgressBar";
import type { GroceryRange } from "../../types";

const RANGE_LABEL: Record<GroceryRange, string> = {
  uke: "Denne uken",
  neste_uke: "Neste uke",
  maned: "Denne måneden",
};

function storeLabelFor(code: string): string {
  if (code === "UKJENT") return "Andre varer";
  return STORE_OPTIONS.find((s) => s.code === code)?.label ?? code;
}

function StoreLogo({ storeCode }: { storeCode: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    if (storeCode === "UKJENT") return;
    fetchStoreLogo(storeCode).then(setLogo);
  }, [storeCode]);
  if (storeCode === "UKJENT") {
    return (
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-(--color-cream-deep) text-[15px]">
        🛒
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
      {logo ? (
        <img src={logo} alt={storeCode} className="h-full w-full object-contain p-1" />
      ) : (
        <span className="text-[10px] font-bold text-(--color-ink-soft)">{storeCode.slice(0, 2)}</span>
      )}
    </div>
  );
}

// Inline "adjust quantity" row — add or subtract a specific amount for a food already on
// the list, without going through meal planning at all.
function AdjustQuantityRow({
  food,
  periodKey,
  onDone,
}: {
  food: GroceryLine["food"];
  periodKey: string;
  onDone: () => void;
}) {
  const addManualGroceryItem = useStore((s) => s.addManualGroceryItem);
  const units = getPackageOnlyUnits(food);
  const [qty, setQty] = useState(1);
  const [unitIdx, setUnitIdx] = useState(0);
  const [sign, setSign] = useState<1 | -1>(1);

  function confirm() {
    const unit = units[unitIdx];
    const grams = (unit ? unit.grams * qty : qty) * sign;
    addManualGroceryItem(periodKey, food.id, grams);
    onDone();
  }

  return (
    <div className="mt-2 rounded-2xl bg-(--color-cream) p-2.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSign(sign === 1 ? -1 : 1)}
          className="flex-none rounded-full px-2.5 py-1.5 text-[13px] font-bold text-white"
          style={{ background: sign === 1 ? "var(--color-leaf)" : "var(--color-orange)" }}
        >
          {sign === 1 ? "+" : "−"}
        </button>
        <NumberField
          min={0.25}
          step={0.25}
          value={qty}
          onChange={setQty}
          className="w-14 rounded-xl bg-white px-2 py-1.5 text-center text-[14px] outline-none"
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
        className="mt-2 w-full rounded-xl py-2 text-[12.5px] font-bold text-white"
        style={{ background: "var(--color-ink)" }}
      >
        Bekreft
      </button>
    </div>
  );
}

export default function HandlelisteScreen() {
  const {
    weekPlan,
    recipes,
    foods,
    manualGroceryItems,
    removeManualGroceryItem,
    groceryChecked,
    toggleGroceryChecked,
    groceryExcluded,
    toggleGroceryExcluded,
    categoryOrder,
    moveCategory,
    kiwiPlussEnabled,
    trippelTrumfToday,
    toggleKiwiPluss,
    toggleTrippelTrumf,
    selectedDate,
    groceryRange,
    setGroceryRange,
  } = useStore();
  const [toast, setToast] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [adjustingFoodId, setAdjustingFoodId] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);

  const { rangeDates, periodKey } = useMemo(() => {
    if (groceryRange === "uke") {
      const dates = getWeekDates(selectedDate);
      return { rangeDates: dates, periodKey: isoWeekKey(dates[0]) };
    }
    if (groceryRange === "neste_uke") {
      const dates = getWeekDates(addDays(selectedDate, 7));
      return { rangeDates: dates, periodKey: isoWeekKey(dates[0]) };
    }
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const dates: string[] = [];
    let d = start;
    while (d <= end) {
      dates.push(d);
      d = addDays(d, 1);
    }
    return { rangeDates: dates, periodKey: monthKey(selectedDate) };
  }, [groceryRange, selectedDate]);

  const mealsInRange = useMemo(
    () => weekPlan.filter((m) => rangeDates.includes(m.date)),
    [weekPlan, rangeDates]
  );

  const manualItemsThisPeriod = useMemo(
    () => manualGroceryItems.filter((i) => i.periodKey === periodKey),
    [manualGroceryItems, periodKey]
  );

  const allLines = useMemo(
    () => aggregateGroceryList(mealsInRange, recipes, foods, manualItemsThisPeriod),
    [mealsInRange, recipes, foods, manualItemsThisPeriod]
  );

  const isExcluded = (foodId: string) => !!groceryExcluded[`${periodKey}:${foodId}`];
  const lines = useMemo(() => allLines.filter((l) => !isExcluded(l.food.id)), [allLines, groceryExcluded, periodKey]);
  const excludedLines = useMemo(() => allLines.filter((l) => isExcluded(l.food.id)), [allLines, groceryExcluded, periodKey]);

  const storeGroups = useMemo(
    () => groupGroceryByStore(lines, kiwiPlussEnabled, trippelTrumfToday),
    [lines, kiwiPlussEnabled, trippelTrumfToday]
  );

  const grandTotal = useMemo(
    () => storeGroups.reduce((sum, g) => sum + g.bonus.totalPrice, 0),
    [storeGroups]
  );
  const grandBonus = useMemo(
    () => storeGroups.reduce((sum, g) => sum + g.bonus.bonusKr, 0),
    [storeGroups]
  );

  const totalItemCount = lines.length;
  const checkedCount = useMemo(
    () => lines.filter((l) => groceryChecked[`${periodKey}:${l.food.id}`]).length,
    [lines, groceryChecked, periodKey]
  );

  async function handleShare() {
    const text = storeGroups
      .map((g) => {
        const header = `${storeLabelFor(g.storeCode)}:`;
        const items = g.lines
          .map((l) =>
            l.packagesToBuy
              ? `- ${l.food.name} (${l.packagesToBuy} × ${formatGramsOrUnit(l.food, l.food.packageWeight!)})`
              : `- ${l.food.name} (${formatGramsOrUnit(l.food, l.totalGrams)})`
          )
          .join("\n");
        return `${header}\n${items}`;
      })
      .join("\n\n");
    const payload = `Handleliste 🛒 (${RANGE_LABEL[groceryRange]})\n\n${text}\n\nTotal: ${grandTotal} kr${
      grandBonus > 0 ? ` (etter Trumf-bonus: ${grandTotal - grandBonus} kr)` : ""
    }`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Handleliste", text: payload });
        return;
      } catch {
        /* user cancelled, fall through */
      }
    }
    await navigator.clipboard.writeText(payload).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  return (
    <div className="pb-28">
      <ScreenHeader title="Handleliste" />
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          {(Object.keys(RANGE_LABEL) as GroceryRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setGroceryRange(r)}
              className="rounded-[14px] px-3.5 py-1.5 text-[13.5px] font-semibold"
              style={{
                background: groceryRange === r ? "var(--color-sage)" : "var(--color-card)",
                color: groceryRange === r ? "#FFFFFF" : "var(--color-ink-soft)",
                border: `1px solid ${groceryRange === r ? "var(--color-sage)" : "rgba(46,42,34,.08)"}`,
              }}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {storeGroups.length === 0 && (
          <p className="mt-6 py-6 text-center text-[13px] text-(--color-ink-soft)">
            Ingen måltider eller varer i denne perioden ennå.
          </p>
        )}

        {storeGroups.length > 0 && (
          <div className="mt-4 rounded-[22px] bg-(--color-card) p-[18px]">
            <div className="flex items-baseline justify-between">
              <p className="text-[14.5px] font-semibold text-(--color-ink)">
                {checkedCount} av {totalItemCount} krysset av
              </p>
              <p className="font-display text-[17px] font-bold text-(--color-ink)">
                {grandBonus > 0 ? grandTotal - grandBonus : grandTotal} kr
              </p>
            </div>
            <div className="mt-3">
              <ProgressBar value={checkedCount} max={totalItemCount} height={10} color="var(--color-leaf)" />
            </div>
          </div>
        )}

        {storeGroups.map((group) => {
          const groups = groupGroceryByCategory(group.lines);
          const orderedCategories = categoryOrder.filter((c) => groups[c]).concat(Object.keys(groups).filter((c) => !categoryOrder.includes(c)));
          return (
            <div key={group.storeCode} className="mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
              <div className="mb-3 flex items-center gap-2.5 border-b border-(--color-cream-deep) pb-3">
                <StoreLogo storeCode={group.storeCode} />
                <p className="flex-1 text-[15px] font-bold">{storeLabelFor(group.storeCode)}</p>
                <p className="text-[13px] font-semibold text-(--color-ink-soft)">{group.bonus.totalPrice} kr</p>
              </div>

              {orderedCategories.map((category, idx) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="mb-2 grid grid-cols-[44px_1fr_44px] items-center">
                    <span />
                    <p className="text-center text-[13px] font-bold">{category}</p>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => moveCategory(category, "up")}
                        disabled={idx === 0}
                        className="rounded-full bg-(--color-cream) p-1 disabled:opacity-30"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveCategory(category, "down")}
                        disabled={idx === orderedCategories.length - 1}
                        className="rounded-full bg-(--color-cream) p-1 disabled:opacity-30"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {groups[category].map((line) => {
                      const checked = !!groceryChecked[`${periodKey}:${line.food.id}`];
                      const isAdjusting = adjustingFoodId === line.food.id;
                      return (
                        <div key={line.food.id}>
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => toggleGroceryChecked(periodKey, line.food.id)}
                              className="flex flex-1 items-center gap-3 text-left"
                            >
                              <span
                                className="flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors"
                                style={{
                                  borderColor: checked ? "var(--color-leaf)" : "#D9D3C4",
                                  background: checked ? "var(--color-leaf)" : "transparent",
                                }}
                              >
                                {checked && <span className="text-[11px] leading-none text-white">✓</span>}
                              </span>
                              <FoodThumb food={line.food} size={32} />
                              <span
                                className="min-w-0 flex-1 text-[14px]"
                                style={{
                                  textDecoration: checked ? "line-through" : "none",
                                  color: checked ? "var(--color-ink-soft)" : "var(--color-ink)",
                                }}
                              >
                                <span className="block truncate">{line.food.name}</span>
                                <span className="block text-[11.5px] text-(--color-ink-soft)">
                                  {line.food.packageSizeUnknown
                                    ? `Kjøp 1 pakke (trenger ca ${formatGramsOrUnit(line.food, line.neededGrams)})`
                                    : line.packagesToBuy
                                      ? `Kjøp ${line.packagesToBuy} × ${formatGramsOrUnit(line.food, line.food.packageWeight!)} (trenger ${formatGramsOrUnit(line.food, line.neededGrams)})`
                                      : formatGramsOrUnit(line.food, line.totalGrams)}
                                  {line.pantTotal ? ` · +${line.pantTotal} kr pant` : ""}
                                </span>
                              </span>
                            </button>
                            <button
                              onClick={() => setAdjustingFoodId(isAdjusting ? null : line.food.id)}
                              className="flex-none p-1"
                              title="Juster mengde"
                            >
                              {isAdjusting ? (
                                <MinusCircle size={17} color="var(--color-ink-soft)" />
                              ) : (
                                <PlusCircle size={17} color="var(--color-ink-soft)" />
                              )}
                            </button>
                            <button
                              onClick={() => toggleGroceryExcluded(periodKey, line.food.id)}
                              className="flex-none p-1"
                              title="Fjern helt fra listen"
                            >
                              <Trash2 size={16} color="var(--color-orange-dark)" />
                            </button>
                          </div>
                          {isAdjusting && (
                            <AdjustQuantityRow
                              food={line.food}
                              periodKey={periodKey}
                              onDone={() => setAdjustingFoodId(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {(() => {
                const pantTotal = group.lines.reduce((sum, l) => sum + (l.pantTotal ?? 0), 0);
                const showBonus = kiwiPlussEnabled && group.bonus.bonusKr > 0;
                const showPant = pantTotal > 0;
                if (!showBonus && !showPant) return null;
                return (
                  <div className="mt-1 flex gap-2.5 border-t border-(--color-cream-deep) pt-3">
                    {showBonus && (
                      <div className="flex-1 rounded-2xl p-2.5" style={{ background: "var(--color-cream-soft)" }}>
                        <p className="text-[10.5px] uppercase tracking-wide text-(--color-ink-soft)">Trumf-bonus</p>
                        <p className="mt-0.5 text-[14.5px] font-semibold text-(--color-leaf)">−{group.bonus.bonusKr} kr</p>
                      </div>
                    )}
                    {showPant && (
                      <div className="flex-1 rounded-2xl p-2.5" style={{ background: "var(--color-cream-soft)" }}>
                        <p className="text-[10.5px] uppercase tracking-wide text-(--color-ink-soft)">Pant</p>
                        <p className="mt-0.5 text-[14.5px] font-semibold text-(--color-ink)">{pantTotal} kr</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              {kiwiPlussEnabled && !isTrumfStore(group.storeCode) && group.storeCode !== "UKJENT" && (
                <p className="pt-2 text-[11px] text-(--color-ink-soft)">Ingen Trumf-bonus hos {storeLabelFor(group.storeCode)}.</p>
              )}
            </div>
          );
        })}

        {excludedLines.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowExcluded((v) => !v)}
              className="text-[12.5px] font-semibold text-(--color-ink-soft) underline"
            >
              {showExcluded ? "Skjul" : "Vis"} fjernede varer ({excludedLines.length})
            </button>
            {showExcluded && (
              <div className="mt-2 flex flex-col gap-2">
                {excludedLines.map((line) => (
                  <div key={line.food.id} className="flex items-center gap-2 rounded-2xl bg-(--color-card) p-2.5">
                    <FoodThumb food={line.food} size={28} />
                    <span className="flex-1 truncate text-[13px] text-(--color-ink-soft)">{line.food.name}</span>
                    <button
                      onClick={() => toggleGroceryExcluded(periodKey, line.food.id)}
                      className="flex flex-none items-center gap-1 rounded-full bg-(--color-leaf-light) px-2.5 py-1 text-[11.5px] font-semibold text-(--color-leaf)"
                    >
                      <RotateCcw size={12} /> Legg tilbake
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {storeGroups.length > 0 && (
          <p className="mt-2 text-center text-[11.5px] text-(--color-ink-faint)">
            {grandBonus > 0
              ? `${grandTotal} kr før bonus, ${grandTotal - grandBonus} kr etter`
              : `${grandTotal} kr totalt`}
          </p>
        )}

        <div className="mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
          <p className="text-[14px] font-bold">Egne varer</p>
          <p className="mb-3 text-[12px] text-(--color-ink-soft)">
            Ting som ikke hører til noe måltid — f.eks. noe til barna. Telles med i totalen over.
          </p>
          {manualItemsThisPeriod.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {manualItemsThisPeriod.map((item) => {
                const food = foods.find((f) => f.id === item.foodId);
                if (!food) return null;
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-2xl bg-(--color-cream) p-2">
                    <FoodThumb food={food} size={30} />
                    <span className="flex-1 truncate text-[13px] font-semibold">
                      {food.name} · {formatGramsOrUnit(food, item.grams)}
                    </span>
                    <button onClick={() => removeManualGroceryItem(item.id)} className="p-1">
                      <X size={14} color="var(--color-orange-dark)" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {!showAddItem ? (
            <button
              onClick={() => setShowAddItem(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[13px] font-bold text-white"
              style={{ background: "var(--color-leaf)" }}
            >
              <Plus size={14} strokeWidth={3} /> Legg til vare
            </button>
          ) : (
            <AddGroceryItemPanel periodKey={periodKey} onDone={() => setShowAddItem(false)} />
          )}
        </div>

        <div className="mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold">Trumf-medlem</p>
              <p className="text-[12px] text-(--color-ink-soft)">
                Bonus regnes bare på Kiwi, Meny, Joker og Spar — ikke der Trumf ikke finnes
              </p>
            </div>
            <Toggle on={kiwiPlussEnabled} onChange={toggleKiwiPluss} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={15} color="var(--color-orange)" />
              <p className="text-[14px] font-bold">Trippeltrumf i dag</p>
            </div>
            <Toggle on={trippelTrumfToday} onChange={toggleTrippelTrumf} disabled={!kiwiPlussEnabled} activeColor="var(--color-orange)" />
          </div>
          <p className="mt-2 text-[11.5px] text-(--color-ink-soft)">
            Trippeltrumf annonseres samme dag i appene — skru på manuelt de dagene det gjelder.
          </p>
        </div>

        <button
          onClick={handleShare}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-bold tracking-wide text-white shadow-[0_6px_16px_rgba(232,130,74,0.35)]"
          style={{ background: "var(--color-orange)" }}
        >
          <Share2 size={16} strokeWidth={2.4} />
          DEL MED SAMBOER
        </button>
        {toast && (
          <p className="mt-2 text-center text-[12.5px] font-semibold text-(--color-leaf)">
            Handlelisten er kopiert ✓
          </p>
        )}
      </div>
    </div>
  );
}
