import { useMemo, useState } from "react";
import { Share2, Sparkles, ArrowUp, ArrowDown } from "lucide-react";
import { useStore } from "../../store/useStore";
import { aggregateGroceryList, groupGroceryByCategory, formatGramsOrUnit, calcKiwiBonus } from "../../utils/calculations";
import { getWeekDates, startOfMonth, endOfMonth, isoWeekKey, monthKey, addDays } from "../../utils/dates";
import ScreenHeader from "../ScreenHeader";
import FoodThumb from "../FoodThumb";
import type { GroceryRange } from "../../types";

const RANGE_LABEL: Record<GroceryRange, string> = {
  uke: "Denne uken",
  neste_uke: "Neste uke",
  maned: "Denne måneden",
};

export default function HandlelisteScreen() {
  const {
    weekPlan,
    recipes,
    foods,
    groceryChecked,
    toggleGroceryChecked,
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

  const lines = useMemo(() => aggregateGroceryList(mealsInRange, recipes, foods), [mealsInRange, recipes, foods]);
  const groups = useMemo(() => groupGroceryByCategory(lines), [lines]);
  const orderedCategories = useMemo(() => {
    const known = categoryOrder.filter((c) => groups[c]);
    const unknown = Object.keys(groups).filter((c) => !categoryOrder.includes(c));
    return [...known, ...unknown];
  }, [categoryOrder, groups]);

  const bonus = useMemo(
    () => calcKiwiBonus(lines, kiwiPlussEnabled, trippelTrumfToday),
    [lines, kiwiPlussEnabled, trippelTrumfToday]
  );

  async function handleShare() {
    const text = lines.map((l) => `- ${l.food.name} (${formatGramsOrUnit(l.food, l.totalGrams)})`).join("\n");
    const payload = `Handleliste 🛒 (${RANGE_LABEL[groceryRange]})\n${text}\n\nTotal: ${bonus.totalPrice} kr${
      kiwiPlussEnabled ? ` (etter Kiwi Pluss-bonus: ${bonus.netPrice} kr)` : ""
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
        <div className="flex rounded-full bg-(--color-card) p-1 shadow-sm">
          {(Object.keys(RANGE_LABEL) as GroceryRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setGroceryRange(r)}
              className="flex-1 rounded-full py-2 text-[12.5px] font-semibold"
              style={{
                background: groceryRange === r ? "var(--color-cream-deep)" : "transparent",
                color: groceryRange === r ? "var(--color-ink)" : "var(--color-ink-soft)",
              }}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
          {orderedCategories.map((category, idx) => (
            <div key={category} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-bold">{category}</p>
                <div className="flex gap-1">
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
                  return (
                    <button
                      key={line.food.id}
                      onClick={() => toggleGroceryChecked(periodKey, line.food.id)}
                      className="flex items-center gap-3 text-left"
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
                        className="min-w-0 flex-1 truncate text-[14px]"
                        style={{
                          textDecoration: checked ? "line-through" : "none",
                          color: checked ? "var(--color-ink-soft)" : "var(--color-ink)",
                        }}
                      >
                        {line.food.name} ({formatGramsOrUnit(line.food, line.totalGrams)})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {lines.length === 0 && (
            <p className="py-6 text-center text-[13px] text-(--color-ink-soft)">
              Ingen måltider planlagt i denne perioden ennå.
            </p>
          )}

          {lines.length > 0 && (
            <div className="mt-2 border-t border-(--color-cream-deep) pt-3">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold">Total estimert pris:</p>
                <p className="text-[16px] font-bold">{bonus.totalPrice} kr</p>
              </div>
              {kiwiPlussEnabled && bonus.bonusKr > 0 && (
                <>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[12.5px] text-(--color-leaf)">
                      Kiwi Pluss-bonus ({bonus.produceRatePct}% frukt/grønt, {bonus.standardRatePct}% resten)
                    </p>
                    <p className="text-[13px] font-semibold text-(--color-leaf)">−{bonus.bonusKr} kr</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-[13.5px] font-bold">Pris etter bonus:</p>
                    <p className="text-[16px] font-bold text-(--color-leaf)">{bonus.netPrice} kr</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_4px_16px_rgba(60,50,20,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold">Kiwi Pluss</p>
              <p className="text-[12px] text-(--color-ink-soft)">15% på frukt/grønt, 1% på resten</p>
            </div>
            <button
              onClick={toggleKiwiPluss}
              className="relative h-7 w-12 flex-none rounded-full transition-colors"
              style={{ background: kiwiPlussEnabled ? "var(--color-leaf)" : "#D9D3C4" }}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                style={{ transform: kiwiPlussEnabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={15} color="var(--color-orange)" />
              <p className="text-[14px] font-bold">Trippeltrumf i dag</p>
            </div>
            <button
              onClick={toggleTrippelTrumf}
              disabled={!kiwiPlussEnabled}
              className="relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-40"
              style={{ background: trippelTrumfToday ? "var(--color-orange)" : "#D9D3C4" }}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                style={{ transform: trippelTrumfToday ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-(--color-ink-soft)">
            Trippeltrumf annonseres samme dag i Kiwi-appen — skru på manuelt de dagene det gjelder.
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
