import type { Person } from "../types";

const BG: Record<Person["color"], string> = {
  orange: "linear-gradient(160deg,#F3D9B1,#E8A96A)",
  yellow: "linear-gradient(160deg,#F7DFA0,#F0BE63)",
};

export default function PersonAvatar({ person, size = 56 }: { person: Person; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full ring-4 ring-white shadow-sm"
      style={{ width: size, height: size, background: BG[person.color], fontSize: size * 0.5 }}
    >
      {person.emoji}
    </div>
  );
}
