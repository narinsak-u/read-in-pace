import { computed, type Ref } from 'vue';
import type { CartItem } from '~/stores/cart';

export interface DiscountBreakdown {
  subtotal: number;
  tierPercent: number;
  tierDiscount: number;
  categoryBonus: number;
  every100Discount: number;
  total: number;
}

interface CategorySubtotal {
  category: string;
  subtotal: number;
  count: number;
}

function getCategorySubtotals(items: CartItem[]): CategorySubtotal[] {
  const map = new Map<string, { subtotal: number; count: number }>();
  for (const item of items) {
    const existing = map.get(item.category) ?? { subtotal: 0, count: 0 };
    existing.subtotal += item.price;
    existing.count += 1;
    map.set(item.category, existing);
  }
  return Array.from(map.entries()).map(([category, { subtotal, count }]) => ({
    category,
    subtotal,
    count,
  }));
}

export function computeDiscount(items: CartItem[]): DiscountBreakdown {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  // Stage 1 — Quantity Tier
  const count = items.length;
  const tierPercent = count >= 4 ? 30 : count === 3 ? 20 : count === 2 ? 10 : 0;
  const tierDiscount = subtotal * (tierPercent / 100);
  let runningTotal = subtotal - tierDiscount;

  // Stage 2 — Category Bonus (on original category subtotals)
  const catSubtotals = getCategorySubtotals(items);
  const categoryBonus = catSubtotals.reduce((sum, cat) => {
    if (cat.count >= 2) {
      return sum + cat.subtotal * 0.1;
    }
    return sum;
  }, 0);
  runningTotal -= categoryBonus;

  // Stage 3 — Every $100
  const every100Discount = Math.floor(runningTotal / 100) * 1;
  runningTotal -= every100Discount;

  // Clamp to zero
  const total = Math.max(0, runningTotal);

  return {
    subtotal,
    tierPercent,
    tierDiscount,
    categoryBonus,
    every100Discount,
    total,
  };
}

export function useDiscount(items: Ref<CartItem[]>) {
  const breakdown = computed(() => computeDiscount(items.value));
  return { breakdown };
}
