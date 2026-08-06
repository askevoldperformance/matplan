import { useEffect, useMemo, useState } from "react";
import { Search, Star, X, Plus, Loader2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { searchKassalProducts, kassalProductToFoodItem, STORE_OPTIONS, type KassalProduct } from "../../services/kassal";
import ScreenHeader from "../ScreenHeader";
import FoodThumb from "../FoodThumb";
import StoreSelector from "../StoreSelector";
import type { FoodItem } from "../../types";

export default function ProdukterScreen() {
  const { foods, toggleFavorite, addFood, activeStore, setActiveStore } = useStore();
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [detailFood, setDetailFood] = useState<FoodItem | null>(null);

  const [remoteResults, setRemoteResults] = useState<KassalProduct[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const storeLabel = STORE_OPTIONS.find((s) => s.code === activeStore)?.label ?? activeStore;

  const localMatches = useMemo(() => {
    return foods
      .filter((f) => (onlyFavorites ? f.isFavorite : true))
      .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [foods, query, onlyFavorites]);

  // Live remote search: debounced, re-runs automatically when store or query changes.
  useEffect(() => {
    if (query.trim().length < 3) {
      setRemoteResults([]);
      setRemoteError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setRemoteLoading(true);
      setRemoteError(null);
      try {
        const products = await searchKassalProducts(query, activeStore);
        setRemoteResults(products);
      } catch {
        setRemoteError("Fikk ikke kontakt med Kassal.app. Sjekk at proxy-serveren kjører (npm run dev:server) og at token er satt i server/.env.");
      } finally {
        setRemoteLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, activeStore]);

  function handleAddRemote(product: KassalProduct) {
    addFood(kassalProductToFoodItem(product, activeStore));
    setAddedIds((prev) => new Set(prev).add(product.id));
  }

  return (
    <div className="pb-28">
      <ScreenHeader title="Produkter" />

      <div className="px-4 pt-4">
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-(--color-ink-soft)">
          Søker hos
        </p>
        <StoreSelector activeStore={activeStore} onChange={setActiveStore} />

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-(--color-card) px-3 py-2.5 shadow-sm">
          <Search size={17} color="var(--color-ink-soft)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Søk hos ${storeLabel} eller i dine egne matvarer...`}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-(--color-ink-soft)"
          />
          {remoteLoading && <Loader2 size={16} className="animate-spin" color="var(--color-ink-soft)" />}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setOnlyFavorites(false)}
            className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
            style={{
              background: !onlyFavorites ? "var(--color-sage)" : "var(--color-card)",
              color: "var(--color-ink)",
            }}
          >
            Alle
          </button>
          <button
            onClick={() => setOnlyFavorites(true)}
            className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
            style={{
              background: onlyFavorites ? "var(--color-sage)" : "var(--color-card)",
              color: "var(--color-ink)",
            }}
          >
            <Star size={12} strokeWidth={2.5} /> Favoritter
          </button>
        </div>

        {remoteError && <p className="mt-3 text-[13px] text-(--color-orange-dark)">{remoteError}</p>}

        {remoteResults.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[12.5px] font-bold text-(--color-ink-soft)">Fra {storeLabel}:</p>
            <div className="flex flex-col gap-2.5">
              {remoteResults.map((p) => {
                const added = addedIds.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-(--color-cream)">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-contain p-0.5" loading="lazy" />
                      ) : (
                        <span className="text-xl">🛒</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold leading-tight">{p.name}</p>
                      <p className="truncate text-[11.5px] text-(--color-ink-soft)">
                        {p.brand ? `${p.brand} · ` : ""}
                        {p.current_price ? `${p.current_price} kr` : "Pris ukjent"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddRemote(p)}
                      disabled={added}
                      className="flex flex-none items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                      style={{ background: added ? "var(--color-sage-dark)" : "var(--color-leaf)" }}
                    >
                      {added ? "Lagt til ✓" : (
                        <>
                          <Plus size={12} strokeWidth={3} /> Legg til
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {localMatches.length > 0 && query.trim().length >= 3 && (
            <p className="text-[12.5px] font-bold text-(--color-ink-soft)">Dine lagrede matvarer:</p>
          )}
          {localMatches.map((food) => (
            <button
              key={food.id}
              onClick={() => setDetailFood(food)}
              className="flex items-center gap-3 rounded-3xl bg-(--color-card) p-3 text-left shadow-[0_4px_16px_rgba(60,50,20,0.06)]"
            >
              <FoodThumb food={food} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold leading-tight">{food.name}</p>
                <p className="text-[12px] text-(--color-ink-soft)">
                  {Math.round(food.per100.kcal)} kcal/100g
                  {food.unitPrice ? ` · ${food.unitPrice} kr` : ""}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(food.id);
                }}
                className="flex-none p-1"
              >
                <Star
                  size={20}
                  strokeWidth={2}
                  fill={food.isFavorite ? "var(--color-orange)" : "none"}
                  color={food.isFavorite ? "var(--color-orange)" : "var(--color-ink-soft)"}
                />
              </button>
            </button>
          ))}
          {localMatches.length === 0 && remoteResults.length === 0 && !remoteLoading && (
            <p className="mt-8 text-center text-[13px] text-(--color-ink-soft)">
              {query.trim().length >= 3
                ? `Ingen treff, verken lagret eller hos ${storeLabel}.`
                : "Skriv minst 3 tegn for å søke."}
            </p>
          )}
        </div>
      </div>

      {detailFood && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl bg-(--color-cream) p-5 safe-bottom">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-bold">{detailFood.name}</h2>
              <button onClick={() => setDetailFood(null)} className="rounded-full bg-white p-1.5 shadow-sm">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <FoodThumb food={detailFood} size={72} />
              <div>
                {detailFood.unitPrice && <p className="text-[16px] font-bold">{detailFood.unitPrice} kr</p>}
                {detailFood.unitPriceLabel && (
                  <p className="text-[12px] text-(--color-ink-soft)">{detailFood.unitPriceLabel}</p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-3">
              <p className="mb-2 text-[12px] font-semibold text-(--color-ink-soft)">Næring per 100g:</p>
              <div className="flex justify-around text-center">
                {(
                  [
                    ["kcal", Math.round(detailFood.per100.kcal), ""],
                    ["Protein", Math.round(detailFood.per100.protein), "g"],
                    ["Karbo", Math.round(detailFood.per100.carbs), "g"],
                    ["Fett", Math.round(detailFood.per100.fat), "g"],
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
          </div>
        </div>
      )}
    </div>
  );
}
