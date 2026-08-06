import { useEffect, useState } from "react";
import { STORE_OPTIONS, fetchStoreLogo } from "../services/kassal";

export default function StoreSelector({
  activeStore,
  onChange,
}: {
  activeStore: string;
  onChange: (code: string) => void;
}) {
  const [logos, setLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    STORE_OPTIONS.forEach((s) => {
      fetchStoreLogo(s.code).then((logo) => setLogos((prev) => ({ ...prev, [s.code]: logo })));
    });
  }, []);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {STORE_OPTIONS.map((s) => {
        const active = activeStore === s.code;
        const logo = logos[s.code];
        return (
          <button
            key={s.code}
            onClick={() => onChange(s.code)}
            className="flex flex-none flex-col items-center gap-1"
          >
            <div
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white ring-2 transition-all"
              style={{ borderColor: "transparent", boxShadow: active ? "0 0 0 2px var(--color-orange)" : "none" }}
            >
              {logo ? (
                <img src={logo} alt={s.label} className="h-full w-full object-contain p-1.5" loading="lazy" />
              ) : (
                <span className="text-[11px] font-bold text-(--color-ink-soft)">
                  {s.label.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span
              className="max-w-[52px] truncate text-[10px] font-semibold"
              style={{ color: active ? "var(--color-orange-dark)" : "var(--color-ink-soft)" }}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
