import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../store/useStore";
import { ACTIVITY_LABEL, calculateTargetKcal, calculateTDEE } from "../utils/calculations";
import type { ActivityLevel, Person } from "../types";
import PersonAvatar from "./PersonAvatar";
import Toggle from "./Toggle";
import NumberField from "./NumberField";

export default function PersonEditModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const updatePerson = useStore((s) => s.updatePerson);
  const [form, setForm] = useState({
    age: person.age,
    heightCm: person.heightCm,
    weightKg: person.weightKg,
    activityLevel: person.activityLevel,
    goal: person.goal,
    goalRateKgPerWeek: person.goalRateKgPerWeek,
    manualTargetKcal: person.manualTargetKcal ?? calculateTargetKcal(person),
    weightHidden: person.weightHidden,
  });

  // Recalculated live as age/height/weight/activity change, so the helper text always
  // reflects what the formula would suggest right now — independent of the manual override below.
  const calculatedTdee = useMemo(
    () =>
      Math.round(
        calculateTDEE({
          ...person,
          age: form.age,
          heightCm: form.heightCm,
          weightKg: form.weightKg,
          activityLevel: form.activityLevel,
        })
      ),
    [person, form.age, form.heightCm, form.weightKg, form.activityLevel]
  );

  function save() {
    updatePerson(person.id, form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-(--color-cream) p-5 safe-bottom">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PersonAvatar person={person} size={44} />
            <h2 className="font-display text-[18px] font-bold">{person.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-white p-1.5 shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Alder">
            <NumberField
              value={form.age}
              onChange={(n) => setForm({ ...form, age: n })}
              className="w-full rounded-xl bg-white px-3 py-2.5 text-[14px] outline-none"
            />
          </Field>
          <Field label="Høyde (cm)">
            <NumberField
              value={form.heightCm}
              onChange={(n) => setForm({ ...form, heightCm: n })}
              className="w-full rounded-xl bg-white px-3 py-2.5 text-[14px] outline-none"
            />
          </Field>
          <Field label="Vekt (kg)">
            <NumberField
              step={0.1}
              value={form.weightKg}
              onChange={(n) => setForm({ ...form, weightKg: n })}
              className="w-full rounded-xl bg-white px-3 py-2.5 text-[14px] outline-none"
            />
          </Field>
          <Field label="Aktivitetsnivå">
            <select
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
              className="w-full rounded-xl bg-white px-3 py-2.5 text-[14px] outline-none"
            >
              {Object.entries(ACTIVITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Dagsmål (kcal)">
            <NumberField
              value={form.manualTargetKcal}
              onChange={(n) => setForm({ ...form, manualTargetKcal: n })}
              className="w-full rounded-xl bg-white px-3 py-2.5 text-[14px] outline-none"
            />
            <p className="mt-1 text-[11.5px] text-(--color-ink-soft)">
              Beregnet vedlikeholdsbehov ut fra vekt/høyde/aktivitet: {calculatedTdee} kcal. Vektprognosen
              regnes automatisk ut fra forskjellen mellom dette dagsmålet og det beregnede behovet — du
              trenger ikke fylle inn noe "endring per uke" separat.
            </p>
          </Field>

          <div className="flex items-center justify-between rounded-2xl bg-white p-3.5">
            <div>
              <p className="text-[14px] font-bold">Skjul vekt for partner</p>
              <p className="text-[11.5px] text-(--color-ink-soft)">Bare et UI-valg, ingen faktisk pålogging</p>
            </div>
            <Toggle on={form.weightHidden} onChange={() => setForm({ ...form, weightHidden: !form.weightHidden })} activeColor="var(--color-sage-dark)" />
          </div>
        </div>

        <button
          onClick={save}
          className="mt-5 w-full rounded-2xl py-3.5 text-center text-[14px] font-bold text-white"
          style={{ background: "var(--color-orange)" }}
        >
          LAGRE
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold text-(--color-ink-soft)">{label}</span>
      {children}
    </label>
  );
}
