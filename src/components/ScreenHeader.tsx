import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div
      className="safe-top flex items-center justify-between px-5 pb-5 pt-4"
      style={{ background: "var(--color-sage)" }}
    >
      <div className="flex min-w-8 items-center">
        {onBack && (
          <button onClick={onBack} className="-ml-1 rounded-full p-1 active:bg-black/5">
            <ChevronLeft size={26} color="var(--color-ink)" strokeWidth={2.4} />
          </button>
        )}
      </div>
      <h1 className="font-display text-[22px] font-bold tracking-tight text-(--color-ink)">{title}</h1>
      <div className="flex min-w-8 justify-end">{right}</div>
    </div>
  );
}
