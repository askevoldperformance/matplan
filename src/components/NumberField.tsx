import { useEffect, useState } from "react";

export default function NumberField({
  value,
  onChange,
  className,
  min,
  step,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(String(value));

  // Only resync from the parent if it's actually a different value than what's being typed —
  // otherwise an in-progress edit like "2" (on its way to "23") would get clobbered back to "2".
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") return; // let the field stay visually blank while typing
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        // If they leave it blank or invalid, snap back to the last valid value.
        if (text.trim() === "" || Number.isNaN(Number(text))) setText(String(value));
      }}
      className={className}
    />
  );
}
