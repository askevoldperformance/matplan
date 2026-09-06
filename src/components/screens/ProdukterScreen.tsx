import { useEffect, useMemo, useState } from "react";
import { Search, Star, X, Plus, Loader2, RefreshCw } from "lucide-react";
import { useStore } from "../../store/useStore";
import { searchKassalProducts, kassalProductToFoodItem, fetchKassalProductById, fetchPriceComparison, STORE_OPTIONS, type KassalProduct } from "../../services/kassal";
import ScreenHeader from "../ScreenHeader";
import FoodThumb from "../FoodThumb";
import StoreSelector from "../StoreSelector";
import KassalProductPreview from "../KassalProductPreview";
import type { FoodItem } from "../../types";

function storeLabelFromCode(code?: string): string {
  if (!code) return "ukjent butikk";
  return STORE_OPTIONS.find((s) => s.code === code)?.label ?? code;
}

export default function ProdukterScreen() {
  const { foods, toggleFavorite, addFood, updateFood, clearAllFoods, activeStore, setActiveStore } = useStore();
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);

  function handleClearAllFoods() {
    if (!confirmingClearAll) {
      setConfirmingClearAll(true);
      setTimeout(() => setConfirmingClearAll(false), 4000);
      return;
    }
    clearAllFoods();
    setConfirmingClearAll(false);
  }
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [detailFood, setDetailFood] = useState<FoodItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<KassalProduct | null>(null);

  const [checkingPrices, setCheckingPrices] = useState(false);
  const [priceCheckError, setPriceCheckError] = useState<string | null>(null);
  const [betterPrices, setBetterPrices] = useState<
    { food: FoodItem; betterStoreCode: string; betterStoreName: string; betterPrice: number; diff: number }[]
  >([]);

  const [remoteResults, setRemoteResults] = useState<KassalProduct[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const storeLabel = STORE_OPTIONS.find((s) => s.code === activeStore)?.label ?? activeStore;

  const localMatches = useMemo(() => {
    if (onlyFavorites) {
      return foods
        .filter((f) => f.isFavorite)
        .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    if (query.trim().length < 3) return [];
    return foods
      .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [foods, query, onlyFavorites]);

  // Live remote search: debounced, re-runs automatically when store or query changes.
  // Skipped entirely while viewing Favoritter — that view is about what's already saved.
  useEffect(() => {
    if (onlyFavorites || query.trim().length < 3) {
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
  }, [query, activeStore, onlyFavorites]);

  function handleAddRemote(product: KassalProduct) {
    addFood(kassalProductToFoodItem(product, activeStore));
    setAddedIds((prev) => new Set(prev).add(product.id));
  }

  async function handleRefreshFromStore(food: FoodItem) {
    if (!food.kassalId) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await fetchKassalProductById(food.kassalId);
      const mapped = kassalProductToFoodItem(fresh, food.storeCode ?? activeStore);
      updateFood(food.id, { ...mapped, id: food.id, isFavorite: food.isFavorite });
      setDetailFood({ ...mapped, id: food.id, isFavorite: food.isFavorite });
    } catch {
      setRefreshError("Fikk ikke oppdatert produktet. Prøv igjen om litt.");
    } finally {
      setRefreshing(false);
    }
  }

  const FAV_PRICE_CHECK_KEY = "matplan.lastFavPriceCheck";

  // Quiet daily check of just your favorites (the "usual staples") — no button needed,
  // shows up as the same banner below if anything's meaningfully cheaper elsewhere right now.
  useEffect(() => {
    const last = localStorage.getItem(FAV_PRICE_CHECK_KEY);
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (last && Date.now() - Number(last) < oneDayMs) return;
    const favCandidates = foods.filter((f) => f.isFavorite && f.ean && f.storeCode && f.unitPrice);
    if (favCandidates.length === 0) return;
    (async () => {
      try {
        const results = await checkPricesFor(favCandidates);
        if (results.length > 0) setBetterPrices(results);
        localStorage.setItem(FAV_PRICE_CHECK_KEY, String(Date.now()));
      } catch {
        // silent — this is a background convenience check, not worth surfacing an error for
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods.length]);

  async function checkPricesFor(candidates: FoodItem[]) {
    const results: typeof betterPrices = [];
    // Sequential rather than Promise.all — this isn't worth hammering Kassal with a burst
    // of parallel requests, whether it's a manual check or the quiet daily auto-check.
    for (const food of candidates) {
      try {
        const comparisons = await fetchPriceComparison(food.ean!);
        const cheaperElsewhere = comparisons
          .filter((c) => c.storeCode !== food.storeCode)
          .sort((a, b) => a.price - b.price)[0];
        if (!cheaperElsewhere) continue;
        const diff = Math.round((food.unitPrice! - cheaperElsewhere.price) * 100) / 100;
        const diffPct = diff / food.unitPrice!;
        // Only worth surfacing if the difference is meaningful — 1-3 kr doesn't matter.
        if (diff >= 5 || diffPct >= 0.15) {
          results.push({
            food,
            betterStoreCode: cheaperElsewhere.storeCode,
            betterStoreName: cheaperElsewhere.storeName,
            betterPrice: cheaperElsewhere.price,
            diff,
          });
        }
      } catch {
        // one product failing shouldn't kill the whole check
      }
    }
    return results.sort((a, b) => b.diff - a.diff);
  }

  async function handleCheckBetterPrices() {
    setCheckingPrices(true);
    setPriceCheckError(null);
    setBetterPrices([]);
    try {
      const candidates = foods.filter((f) => f.ean && f.storeCode && f.unitPrice);
      setBetterPrices(await checkPricesFor(candidates));
    } catch {
      setPriceCheckError("Fikk ikke sjekket priser. Prøv igjen om litt.");
    } finally {
      setCheckingPrices(false);
    }
  }

  return (
    <div className="pb-28">
      <ScreenHeader title="Produkter" />

      <div className="px-4 pt-4">
        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-(--color-ink-soft)">
          Søker hos
        </p>
        <StoreSelector activeStore={activeStore} onChange={setActiveStore} />

        <div className="mt-3 flex items-center gap-2.5 rounded-[18px] bg-(--color-card) px-4" style={{ minHeight: 50 }}>
          <Search size={16} color="var(--color-ink-faint)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Søk hos ${storeLabel} eller i dine egne matvarer...`}
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-(--color-ink-faint)"
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
        <p className="mt-1.5 text-[11px] text-(--color-ink-soft)">
          "Alle" = alt du har lagret. "Favoritter" = kun det du har stjernemerket ({"\u2606"}-ikonet på hver vare).
        </p>
        <button
          onClick={handleClearAllFoods}
          className="mt-2 text-[11.5px] font-semibold text-(--color-orange-dark) underline"
        >
          {confirmingClearAll ? "Trykk igjen for å bekrefte — sletter ALT" : "Slett alle lagrede produkter"}
        </button>

        <div
          className="mt-4 rounded-[22px] p-[18px]"
          style={{ background: "linear-gradient(135deg, var(--color-sage), var(--color-sage-dark))" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[15.5px] font-semibold text-white">Bedre pris et annet sted?</p>
              <p className="mt-1 max-w-[210px] text-[12.5px] leading-[1.45] text-white/85">
                Vi sammenligner dine lagrede produkter — kun vesentlige forskjeller vises.
              </p>
            </div>
            <button
              onClick={handleCheckBetterPrices}
              disabled={checkingPrices}
              className="flex-none rounded-[14px] px-[22px] text-[14px] font-semibold text-(--color-ink) disabled:opacity-60"
              style={{ background: "var(--color-cream)", minHeight: 44 }}
            >
              {checkingPrices ? <Loader2 size={15} className="animate-spin" /> : "Sjekk priser"}
            </button>
          </div>
          {priceCheckError && <p className="mt-2 text-[12.5px] text-white">{priceCheckError}</p>}
          {betterPrices.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {betterPrices.map(({ food, betterStoreName, betterPrice, diff }) => (
                <div key={food.id} className="flex items-center gap-2.5 rounded-2xl bg-(--color-cream) p-2.5">
                  <FoodThumb food={food} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold leading-tight">{food.name}</p>
                    <p className="text-[11.5px] text-(--color-ink-soft)">
                      {food.unitPrice} kr hos {storeLabelFromCode(food.storeCode)} → {betterPrice} kr hos {betterStoreName}
                    </p>
                  </div>
                  <span className="flex-none text-[13px] font-bold text-(--color-leaf)">−{diff} kr</span>
                </div>
              ))}
            </div>
          )}
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
                    <button onClick={() => setPreviewProduct(p)} className="flex flex-1 items-center gap-3 text-left">
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
                    </button>
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
              {onlyFavorites
                ? "Ingen favoritter ennå. Stjernemerk et produkt for å legge det her."
                : query.trim().length >= 3
                  ? `Ingen treff, verken lagret eller hos ${storeLabel}.`
                  : "Skriv minst 3 tegn for å søke."}
            </p>
          )}
        </div>
      </div>

      {detailFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-(--color-cream) p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display flex-1 text-[17px] font-bold leading-tight">{detailFood.name}</h2>
              <button onClick={() => setDetailFood(null)} className="flex-none rounded-full bg-white p-1.5 shadow-sm">
                <X size={18} />
              </button>
            </div>
            {refreshError && <p className="mb-2 text-[12px] text-(--color-orange-dark)">{refreshError}</p>}
            {detailFood.kassalId && (
              <button
                onClick={() => handleRefreshFromStore(detailFood)}
                disabled={refreshing}
                className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-(--color-cream-deep) py-2 text-[12.5px] font-semibold disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Oppdaterer..." : "Oppdater fra butikk"}
              </button>
            )}
            <div className="flex items-center gap-4">
              <FoodThumb food={detailFood} size={72} />
              <div>
                {detailFood.unitPrice && <p className="text-[16px] font-bold">{detailFood.unitPrice} kr</p>}
                {detailFood.unitPriceLabel && (
                  <p className="text-[12px] text-(--color-ink-soft)">{detailFood.unitPriceLabel}</p>
                )}
                {detailFood.labels && detailFood.labels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {detailFood.labels.map((l) => (
                      <span key={l} className="rounded-full bg-(--color-leaf-light) px-2 py-0.5 text-[10.5px] font-semibold text-(--color-leaf)">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {(detailFood.description || detailFood.ingredientsText) && (
              <div className="mt-3 rounded-2xl bg-white p-3">
                {detailFood.description && (
                  <>
                    <p className="mb-1 text-[11.5px] font-semibold text-(--color-ink-soft)">Om produktet:</p>
                    <p className="text-[12.5px] leading-snug">{detailFood.description}</p>
                  </>
                )}
                {detailFood.ingredientsText && (
                  <>
                    <p className="mb-1 mt-2 text-[11.5px] font-semibold text-(--color-ink-soft)">Ingredienser:</p>
                    <p className="text-[12px] leading-snug text-(--color-ink-soft)">{detailFood.ingredientsText}</p>
                  </>
                )}
              </div>
            )}
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

      {previewProduct && (
        <KassalProductPreview
          product={previewProduct}
          added={addedIds.has(previewProduct.id)}
          onAdd={() => handleAddRemote(previewProduct)}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  );
}
