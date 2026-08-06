import type { FoodItem } from "../types";

export default function FoodThumb({ food, size = 56 }: { food: Pick<FoodItem, "imageUrl" | "icon" | "name">; size?: number }) {
  if (food.imageUrl) {
    return (
      <div
        className="flex flex-none items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
        style={{ width: size, height: size }}
      >
        <img src={food.imageUrl} alt={food.name} className="h-full w-full object-contain p-1" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-2xl bg-(--color-cream)"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {food.icon}
    </div>
  );
}
