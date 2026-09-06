export default function ProgressBar({
  value,
  max,
  color = "var(--color-leaf)",
  trackColor = "var(--color-cream-mid)",
  height = 12,
}: {
  value: number;
  max: number;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: trackColor }}>
      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
