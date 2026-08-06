import { Home, CalendarDays, BookOpen, ShoppingCart, Package } from "lucide-react";

export type Tab = "dag" | "ukeplan" | "oppskrifter" | "produkter" | "handleliste";

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "dag", label: "Min Dag", Icon: Home },
  { id: "ukeplan", label: "Ukeplan", Icon: CalendarDays },
  { id: "oppskrifter", label: "Måltider", Icon: BookOpen },
  { id: "produkter", label: "Produkter", Icon: Package },
  { id: "handleliste", label: "Handleliste", Icon: ShoppingCart },
];

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-md safe-bottom">
      <div className="mx-3 mb-3 flex items-center justify-between rounded-3xl bg-white/95 px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                color={isActive ? "var(--color-sage-dark)" : "var(--color-ink-soft)"}
              />
              <span
                className="text-[10.5px] font-medium"
                style={{ color: isActive ? "var(--color-sage-dark)" : "var(--color-ink-soft)" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
