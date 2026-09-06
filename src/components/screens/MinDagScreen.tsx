import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useStore } from "../../store/useStore";
import PersonEditModal from "../PersonEditModal";
import ProgressBar from "../ProgressBar";
import {
  calculateMacroTargets,
  eatenMacrosForPersonDay,
  projectWeightSeries,
  scaleMacros,
  SLOT_LABELS,
} from "../../utils/calculations";
import { formatDayDateLabel, todayISO } from "../../utils/dates";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { Tab } from "../BottomNav";
import type { MealSlot } from "../../types";

export default function MinDagScreen({ goTo }: { goTo: (t: Tab) => void }) {
  const {
    people,
    weekPlan,
    recipes,
    foods,
    selectedDate,
    viewerPersonId,
    ensureMealForSlot,
    addMealItem,
    markMealEaten,
  } = useStore();
  const [projPerson, setProjPerson] = useState(people[0].id);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);

  const dayLabel = formatDayDateLabel(selectedDate);
  const initials = people.map((p) => p.name.charAt(0).toUpperCase()).join("");

  const stats = useMemo(
    () =>
      people.map((p) => {
        const target = calculateMacroTargets(p);
        const eaten = eatenMacrosForPersonDay(p.id, selectedDate, weekPlan, recipes, foods);
        const remaining = Math.max(0, Math.round(target.kcal - eaten.kcal));
        return { person: p, target, eaten, remaining };
      }),
    [people, weekPlan, recipes, foods, selectedDate]
  );

  const nextMeal = useMemo(() => {
    const slotsOrder: MealSlot[] = ["frokost", "lunsj", "middag", "kveldsmat"];
    const todaysMeals = weekPlan.filter((m) => m.date === selectedDate);
    for (const slot of slotsOrder) {
      const m = todaysMeals.find((meal) => meal.slot === slot);
      if (m && !people.every((p) => m.eatenBy[p.id])) {
        const recipe = recipes.find((r) => r.id === m.recipeId);
        return { meal: m, recipe };
      }
    }
    return null;
  }, [weekPlan, recipes, selectedDate, people]);

  // "Sist brukt" quick-log — the viewer's own recently-eaten ad-hoc items, most recent day first.
  const quickLogItems = useMemo(() => {
    if (!viewerPersonId) return [];
    const sorted = [...weekPlan].sort((a, b) => b.date.localeCompare(a.date));
    const seen = new Set<string>();
    const result: { foodId: string; grams: number }[] = [];
    for (const meal of sorted) {
      for (const item of meal.items) {
        if (item.personId !== viewerPersonId || seen.has(item.foodId)) continue;
        seen.add(item.foodId);
        result.push({ foodId: item.foodId, grams: item.grams });
        if (result.length >= 6) break;
      }
      if (result.length >= 6) break;
    }
    return result;
  }, [weekPlan, viewerPersonId]);

  function handleQuickLog(foodId: string, grams: number) {
    if (!viewerPersonId) return;
    const hour = new Date().getHours();
    const slot: MealSlot = hour < 11 ? "frokost" : hour < 15 ? "lunsj" : hour < 20 ? "middag" : "kveldsmat";
    const mealId = ensureMealForSlot(todayISO(), slot, viewerPersonId);
    addMealItem(mealId, { foodId, grams, personId: viewerPersonId });
    markMealEaten(mealId, viewerPersonId);
  }

  const activeProjPerson = people.find((p) => p.id === projPerson)!;
  const series = useMemo(() => projectWeightSeries(activeProjPerson, 90, 5), [activeProjPerson]);
  const projected3mo = series[series.length - 1]?.weightKg ?? activeProjPerson.weightKg;
  const delta = Math.round((projected3mo - activeProjPerson.weightKg) * 10) / 10;
  const weightIsHidden = activeProjPerson.weightHidden && viewerPersonId !== activeProjPerson.id;

  return (
    <div className="pb-28">
      <div className="safe-top flex items-start justify-between px-5 pb-3 pt-4">
        <div>
          <p className="mb-0.5 text-[13px] uppercase tracking-wide text-(--color-ink-soft)">{dayLabel}</p>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-(--color-ink)">Min dag</h1>
        </div>
        <div
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[14px] font-semibold"
          style={{ background: "var(--color-leaf-light)", color: "var(--color-leaf)", border: "1px solid rgba(78,138,82,.18)" }}
        >
          {initials}
        </div>
      </div>

      <div className="px-4">
        {/* Per-person: navn, kcal-stolpe, makro-bokser (1a) */}
        {stats.map(({ person, target, eaten, remaining }) => (
          <div key={person.id} className="mb-4 rounded-[26px] bg-(--color-card) p-[6px] last:mb-0">
            <div className="rounded-[21px] p-[18px] pb-5">
              <button onClick={() => setEditingPerson(person.id)} className="flex w-full items-center gap-3 text-left">
                <span
                  className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[14px] font-semibold"
                  style={{ background: "var(--color-cream-deep)", color: "#8A7A55" }}
                >
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold tracking-tight text-(--color-ink)">{person.name}</span>
                  <span className="block text-[12.5px] text-(--color-ink-soft)">
                    {Math.round(eaten.kcal)} av {target.kcal} kcal
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="block font-display text-[21px] font-bold leading-none tracking-tight text-(--color-leaf)">
                    {remaining}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-(--color-ink-soft)">kcal igjen</span>
                </span>
              </button>

              <div className="mt-4">
                <ProgressBar value={eaten.kcal} max={target.kcal} height={12} />
              </div>

              <div className="mt-3 flex gap-2.5">
                {(
                  [
                    ["protein", "Protein", eaten.protein, target.protein, "var(--color-sage-dark)"],
                    ["karbo", "Karbo", eaten.carbs, target.carbs, "var(--color-yellow)"],
                    ["fett", "Fett", eaten.fat, target.fat, "var(--color-orange)"],
                  ] as const
                ).map(([key, label, val, tgt, color]) => (
                  <div key={key} className="flex-1 rounded-2xl p-2.5" style={{ background: "var(--color-cream-soft)" }}>
                    <p className="text-[10.5px] uppercase tracking-wide text-(--color-ink-soft)">{label}</p>
                    <p className="mt-0.5 text-[14px] font-semibold text-(--color-ink)">{Math.round(val)} g</p>
                    <div className="mt-1.5">
                      <ProgressBar value={val} max={tgt} height={4} color={color} trackColor="var(--color-cream-mid)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Hurtiglogg */}
        <p className="mb-2.5 mt-6 px-1 text-[12px] font-semibold uppercase tracking-wide text-(--color-ink-soft)">
          Hurtiglogg
        </p>
        {quickLogItems.length === 0 ? (
          <p className="text-[12.5px] text-(--color-ink-faint)">
            Logg noe i Matplan, så dukker snarveier til det du spiser ofte opp her.
          </p>
        ) : (
          <div className="sc -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {quickLogItems.map(({ foodId, grams }) => {
              const food = foods.find((f) => f.id === foodId);
              if (!food) return null;
              const kcal = Math.round(scaleMacros(food.per100, grams).kcal);
              return (
                <button
                  key={foodId}
                  onClick={() => handleQuickLog(foodId, grams)}
                  className="flex flex-none flex-col items-start gap-0.5 rounded-[18px] bg-(--color-card) px-4 py-3 active:bg-(--color-cream-soft)"
                >
                  <span className="text-[13.5px] font-semibold text-(--color-ink)">{food.name}</span>
                  <span className="text-[11.5px] font-medium" style={{ color: "var(--color-orange-dark)" }}>
                    +{kcal} kcal
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Neste måltid */}
        {nextMeal && (
          <>
            <p className="mb-2.5 mt-6 px-1 text-[12px] font-semibold uppercase tracking-wide text-(--color-ink-soft)">
              Neste måltid
            </p>
            <button
              onClick={() => goTo("ukeplan")}
              className="flex w-full items-center gap-3.5 rounded-3xl bg-(--color-card) p-4 text-left"
            >
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl border border-dashed border-(--color-ink)/10 bg-(--color-cream-mid) text-2xl">
                {nextMeal.recipe?.icon ?? "🍽️"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-orange-dark)" }}>
                  {SLOT_LABELS[nextMeal.meal.slot]}
                </p>
                <p className="mt-1 truncate text-[15.5px] font-semibold leading-tight text-(--color-ink)">
                  {nextMeal.recipe?.name ?? "Egne varer"}
                </p>
              </div>
            </button>
          </>
        )}

        {/* Vektprognose */}
        <p className="mb-2.5 mt-6 px-1 text-[12px] font-semibold uppercase tracking-wide text-(--color-ink-soft)">
          Vektprognose
        </p>
        <div className="rounded-3xl bg-(--color-card) p-[18px]">
          <div className="mb-4 flex gap-1 rounded-[14px] bg-(--color-cream-deep) p-1">
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setProjPerson(p.id)}
                className="flex-1 rounded-xl py-1.5 text-[13.5px] font-semibold transition-colors"
                style={{
                  background: projPerson === p.id ? "var(--color-card)" : "transparent",
                  color: projPerson === p.id ? "var(--color-ink)" : "var(--color-ink-soft)",
                  boxShadow: projPerson === p.id ? "0 1px 3px rgba(46,42,34,.1)" : "none",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          {weightIsHidden ? (
            <div className="flex items-center gap-2 py-4 text-(--color-ink-soft)">
              <Lock size={16} />
              <p className="text-[13px]">{activeProjPerson.name} har skjult vekten sin.</p>
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[40px] font-bold leading-none tracking-tight text-(--color-ink)">
                    {projected3mo}
                  </span>
                  <span className="pb-0.5 text-[16px] font-semibold text-(--color-ink-soft)">kg</span>
                  <span
                    className="ml-1 rounded-[11px] px-2.5 py-1.5 text-[13px] font-semibold"
                    style={{ background: "var(--color-leaf-light)", color: "#3F7343" }}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta} kg
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-(--color-ink-soft)">estimert om 3 måneder</p>
              </div>
            </div>
          )}
          {!weightIsHidden && (
            <div className="mt-2 h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                  <Line type="monotone" dataKey="weightKg" stroke="var(--color-leaf)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {editingPerson && (
        <PersonEditModal
          person={people.find((p) => p.id === editingPerson)!}
          onClose={() => setEditingPerson(null)}
        />
      )}
    </div>
  );
}
