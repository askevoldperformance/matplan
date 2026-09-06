import { Home, CalendarDays, BookOpen, ShoppingCart, Package } from "lucide-react";

export type Tab = "dag" | "ukeplan" | "oppskrifter" | "produkter" | "handleliste";

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "dag", label: "Min dag", Icon: Home },
  { id: "ukeplan", label: "Matplan", Icon: CalendarDays },
  { id: "oppskrifter", label: "Måltider", Icon: BookOpen },
  { id: "produkter", label: "Produkter", Icon: Package },
  { id: "handleliste", label: "Liste", Icon: ShoppingCart },
];

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-md px-3.5 pb-2 pt-5 safe-bottom"
      style={{ background: "linear-gradient(180deg, rgba(251,243,226,0), var(--color-cream) 40%)" }}
    >
      <div className="flex rounded-[26px] bg-(--color-card) p-2 shadow-[0_2px_6px_rgba(46,42,34,0.06),0_16px_34px_-22px_rgba(46,42,34,0.4)]">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[19px] py-2.5 transition-colors"
              style={{ background: isActive ? "var(--color-leaf-light)" : "transparent", minHeight: 58 }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.3 : 1.8} color={isActive ? "var(--color-leaf)" : "var(--color-ink-faint)"} />
              <span className="text-[10px] font-semibold" style={{ color: isActive ? "var(--color-leaf)" : "var(--color-ink-faint)" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
