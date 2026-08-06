import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useStore } from "../../store/useStore";
import ProgressRing from "../ProgressRing";
import PersonAvatar from "../PersonAvatar";
import PersonEditModal from "../PersonEditModal";
import {
  calculateMacroTargets,
  eatenMacrosForPersonDay,
  projectWeightSeries,
  SLOT_LABELS,
} from "../../utils/calculations";
import { formatDayDateLabel } from "../../utils/dates";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { Tab } from "../BottomNav";
import type { MealSlot } from "../../types";

export default function MinDagScreen({ goTo }: { goTo: (t: Tab) => void }) {
  const { people, weekPlan, recipes, foods, selectedDate, viewerPersonId } = useStore();
  const [projPerson, setProjPerson] = useState(people[0].id);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);

  const dayLabel = formatDayDateLabel(selectedDate);

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

  const activeProjPerson = people.find((p) => p.id === projPerson)!;
  const series = useMemo(() => projectWeightSeries(activeProjPerson, 90, 5), [activeProjPerson]);
  const projected3mo = series[series.length - 1]?.weightKg ?? activeProjPerson.weightKg;
  const delta = Math.round((projected3mo - activeProjPerson.weightKg) * 10) / 10;
  const weightIsHidden = activeProjPerson.weightHidden && viewerPersonId !== activeProjPerson.id;

  return (
    <div className="pb-28">
      <div className="safe-top flex items-center justify-between px-5 pb-6 pt-4" style={{ background: "var(--color-sage)" }}>
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Min Dag</h1>
          <p className="text-[13px] capitalize text-(--color-ink)/70">{dayLabel}</p>
        </div>
      </div>

      <div className="-mt-2 grid grid-cols-2 gap-3 px-4">
        {stats.map(({ person, target, remaining }) => (
          <div key={person.id} className="rounded-3xl bg-(--color-card) p-4 shadow-[0_6px_20px_rgba(60,50,20,0.08)]">
            <button onClick={() => setEditingPerson(person.id)} className="flex w-full flex-col items-center gap-2">
              <PersonAvatar person={person} size={48} />
              <span className="font-display text-[15px] font-semibold">{person.name}</span>
            </button>
            <ProgressRing value={Math.max(0, target.kcal - remaining)} max={target.kcal} size={104} stroke={9}>
              <span className="text-[20px] font-bold leading-none">{Math.round(target.kcal - remaining)}</span>
              <span className="text-[11px] text-(--color-ink-soft)">{target.kcal} kcal</span>
            </ProgressRing>
            <div className="text-center">
              <p className="text-[11px] text-(--color-ink-soft)">Gjenstår:</p>
              <p className="text-[13px] font-semibold text-(--color-leaf)">{remaining} kcal</p>
            </div>
          </div>
        ))}
      </div>

      {nextMeal && (
        <button
          onClick={() => goTo("ukeplan")}
          className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-3xl p-4 text-left shadow-[0_6px_20px_rgba(60,50,20,0.1)]"
          style={{ background: "linear-gradient(100deg,#F3C877,#EE9A61)" }}
        >
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-(--color-ink)/70">Neste Måltid</p>
            <p className="font-display text-[16px] font-bold text-(--color-ink)">
              {SLOT_LABELS[nextMeal.meal.slot]} · {nextMeal.recipe?.name}
            </p>
          </div>
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/60 text-2xl">
            {nextMeal.recipe?.icon}
          </div>
        </button>
      )}

      <div className="mx-4 mt-4 rounded-3xl bg-(--color-card) p-4 shadow-[0_6px_20px_rgba(60,50,20,0.08)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold">Vektprognose</h2>
          <div className="flex rounded-full bg-(--color-cream-deep) p-1">
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setProjPerson(p.id)}
                className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
                style={{
                  background: projPerson === p.id ? "var(--color-card)" : "transparent",
                  color: projPerson === p.id ? "var(--color-ink)" : "var(--color-ink-soft)",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        {weightIsHidden ? (
          <div className="flex items-center gap-2 py-4 text-(--color-ink-soft)">
            <Lock size={16} />
            <p className="text-[13px]">{activeProjPerson.name} har skjult vekten sin.</p>
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[24px] font-bold">
                {projected3mo} kg{" "}
                <span className="text-[13px] font-semibold text-(--color-leaf)">
                  ({delta > 0 ? "+" : ""}
                  {delta} kg)
                </span>
              </p>
              <p className="text-[12px] text-(--color-ink-soft)">om 3 mnd</p>
            </div>
            <div className="h-14 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                  <Line type="monotone" dataKey="weightKg" stroke="var(--color-leaf)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
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
