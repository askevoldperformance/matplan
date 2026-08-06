import { X, Plus } from "lucide-react";
import { kassalNutritionToPer100, type KassalProduct } from "../services/kassal";

export default function KassalProductPreview({
  product,
  added,
  onAdd,
  onClose,
}: {
  product: KassalProduct;
  added: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  const per100 = kassalNutritionToPer100(product.nutrition);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-(--color-cream) p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-bold leading-tight">{product.name}</h2>
          <button onClick={onClose} className="flex-none rounded-full bg-white p-1.5 shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-white">
            {product.image ? (
              <img src={product.image} alt={product.name} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-2xl">🛒</span>
            )}
          </div>
          <div>
            {product.current_price != null && <p className="text-[16px] font-bold">{product.current_price} kr</p>}
            {product.brand && <p className="text-[12px] text-(--color-ink-soft)">{product.brand}</p>}
            {product.labels && product.labels.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {product.labels.map((l) => (
                  <span key={l.display_name} className="rounded-full bg-(--color-leaf-light) px-2 py-0.5 text-[10.5px] font-semibold text-(--color-leaf)">
                    {l.display_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {(product.description || product.ingredients) && (
          <div className="mt-3 rounded-2xl bg-white p-3">
            {product.description && (
              <>
                <p className="mb-1 text-[11.5px] font-semibold text-(--color-ink-soft)">Om produktet:</p>
                <p className="text-[12.5px] leading-snug">{product.description}</p>
              </>
            )}
            {product.ingredients && (
              <>
                <p className="mb-1 mt-2 text-[11.5px] font-semibold text-(--color-ink-soft)">Ingredienser:</p>
                <p className="text-[12px] leading-snug text-(--color-ink-soft)">{product.ingredients}</p>
              </>
            )}
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-white p-3">
          <p className="mb-2 text-[12px] font-semibold text-(--color-ink-soft)">Næring per 100g:</p>
          <div className="flex justify-around text-center">
            {(
              [
                ["kcal", Math.round(per100.kcal), ""],
                ["Protein", Math.round(per100.protein), "g"],
                ["Karbo", Math.round(per100.carbs), "g"],
                ["Fett", Math.round(per100.fat), "g"],
              ] as const
            ).map(([label, value, unit]) => (
              <div key={label}>
                <p className="text-[16px] font-bold">
                  {value}
                  {unit}
                </p>
                <p className="text-[10.5px] text-(--color-ink-soft)">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onAdd}
          disabled={added}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[14px] font-bold text-white disabled:opacity-60"
          style={{ background: added ? "var(--color-sage-dark)" : "var(--color-leaf)" }}
        >
          {added ? "Lagt til ✓" : (
            <>
              <Plus size={15} strokeWidth={3} /> Legg til
            </>
          )}
        </button>
      </div>
    </div>
  );
}
