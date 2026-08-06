export default function Toggle({
  on,
  onChange,
  disabled,
  activeColor = "var(--color-leaf)",
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="relative box-content h-7 w-12 flex-none rounded-full border-0 p-0 outline-none transition-colors disabled:opacity-40"
      style={{ background: on ? activeColor : "#D9D3C4" }}
    >
      <span
        className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(20px)" : "translateX(0px)" }}
      />
    </button>
  );
}
