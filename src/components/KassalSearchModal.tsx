import { useState } from "react";
import { X, Search, Plus, Loader2 } from "lucide-react";
import { searchKassalProducts, kassalProductToFoodItem, STORE_OPTIONS, type KassalProduct } from "../services/kassal";
import { useStore } from "../store/useStore";
import StoreSelector from "./StoreSelector";

export default function KassalSearchModal({ onClose }: { onClose: () => void }) {
  const { addFood, activeStore, setActiveStore } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KassalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const storeLabel = STORE_OPTIONS.find((s) => s.code === activeStore)?.label ?? activeStore;

  async function runSearch(q: string, store = activeStore) {
    setQuery(q);
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const products = await searchKassalProducts(q, store);
      setResults(products);
    } catch {
      setError("Fikk ikke kontakt med Kassal.app. Sjekk at proxy-serveren kjører (npm run dev:server) og at token er satt i server/.env.");
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(product: KassalProduct) {
    addFood(kassalProductToFoodItem(product, activeStore));
    setAddedIds((prev) => new Set(prev).add(product.id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-(--color-cream) p-4 safe-bottom">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold">Søk i butikk</h2>
          <button onClick={onClose} className="rounded-full bg-white p-1.5 shadow-sm">
            <X size={18} />
          </button>
        </div>

        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-(--color-ink-soft)">
          Søker hos
        </p>
        <StoreSelector
          activeStore={activeStore}
          onChange={(code) => {
            setActiveStore(code);
            if (query.trim().length >= 3) runSearch(query, code);
          }}
        />

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
          <Search size={18} color="var(--color-ink-soft)" />
          <input
            autoFocus
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder={`Søk hos ${storeLabel}...`}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-(--color-ink-soft)"
          />
          {loading && <Loader2 size={16} className="animate-spin" color="var(--color-ink-soft)" />}
        </div>

        {error && <p className="mt-3 text-[13px] text-(--color-orange-dark)">{error}</p>}

        <div className="mt-3 flex-1 overflow-y-auto">
          {results.length === 0 && !loading && query.trim().length >= 3 && !error && (
            <p className="mt-6 text-center text-[13px] text-(--color-ink-soft)">
              Ingen treff hos {storeLabel} for "{query}"
            </p>
          )}
          <div className="flex flex-col gap-2.5 pb-2">
            {results.map((p) => {
              const added = addedIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-(--color-cream)">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-full w-full object-contain p-0.5" loading="lazy" />
                    ) : (
                      <span className="text-2xl">🛒</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold leading-tight">{p.name}</p>
                    <p className="truncate text-[12px] text-(--color-ink-soft)">
                      {p.brand ? `${p.brand} · ` : ""}
                      {p.current_price ? `${p.current_price} kr` : "Pris ukjent"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={added}
                    className="flex flex-none items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                    style={{ background: added ? "var(--color-sage-dark)" : "var(--color-leaf)" }}
                  >
                    {added ? "Lagt til ✓" : (
                      <>
                        <Plus size={13} strokeWidth={3} /> Legg til
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
