import { useStore } from "../store/useStore";
import PersonAvatar from "./PersonAvatar";

export default function ViewerPicker() {
  const { people, setViewerPersonId } = useStore();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-(--color-cream) px-8">
      <h1 className="font-display text-center text-[22px] font-bold">Hvem er du?</h1>
      <p className="text-center text-[13px] text-(--color-ink-soft)">
        Velges én gang per telefon — avgjør hvem "deg" er, blant annet for skjult vekt.
      </p>
      <div className="flex gap-6">
        {people.map((p) => (
          <button key={p.id} onClick={() => setViewerPersonId(p.id)} className="flex flex-col items-center gap-2">
            <PersonAvatar person={p} size={72} />
            <span className="font-semibold">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
