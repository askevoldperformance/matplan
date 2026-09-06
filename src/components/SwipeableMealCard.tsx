import { useRef, useState } from "react";
import type { ReactNode } from "react";

const OPEN_X = -148;

export default function SwipeableMealCard({
  children,
  onSwap,
  onDelete,
}: {
  children: ReactNode;
  onSwap: () => void;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    startXRef.current = e.clientX - dx;
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const next = Math.min(0, Math.max(OPEN_X, e.clientX - startXRef.current));
    setDx(next);
  }
  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    setDx(dx < OPEN_X / 2 ? OPEN_X : 0);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl" style={{ background: "var(--color-orange)" }}>
      <div className="absolute inset-0 flex items-center justify-end">
        <button
          onClick={() => {
            onSwap();
            setDx(0);
          }}
          className="flex h-full w-[74px] flex-none flex-col items-center justify-center gap-1 text-white"
        >
          <span className="text-[17px]">⇄</span>
          <span className="text-[12.5px] font-semibold">Bytt</span>
        </button>
        <button
          onClick={() => {
            onDelete();
            setDx(0);
          }}
          style={{ background: "var(--color-orange-dark)" }}
          className="flex h-full w-[74px] flex-none flex-col items-center justify-center gap-1 text-white"
        >
          <span className="text-[17px]">✕</span>
          <span className="text-[12.5px] font-semibold">Slett</span>
        </button>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform .3s cubic-bezier(.32,.72,0,1)",
          touchAction: "pan-y",
        }}
        className="relative rounded-3xl bg-(--color-card) p-4"
      >
        {children}
      </div>
    </div>
  );
}
