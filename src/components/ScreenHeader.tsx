import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function ScreenHeader({
  title,
  eyebrow,
  onBack,
  right,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="safe-top px-5 pb-2 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-8 items-center pt-1">
          {onBack && (
            <button onClick={onBack} className="-ml-1 rounded-full p-1 active:bg-black/5">
              <ChevronLeft size={26} color="var(--color-ink)" strokeWidth={2.4} />
            </button>
          )}
        </div>
        <div className="flex-1">
          {eyebrow && (
            <p className="mb-0.5 text-[13px] uppercase tracking-wide text-(--color-ink-soft)">{eyebrow}</p>
          )}
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-(--color-ink)">
            {title}
          </h1>
        </div>
        <div className="flex min-w-8 justify-end pt-1">{right}</div>
      </div>
    </div>
  );
}
