export interface StockInfo {
  inStock: number;
  slug: string;
}

export interface StockActions {
  isBorrowed: boolean;
  canBuy: boolean;
  canBorrow: boolean;
  unavailable: boolean;
  isPurchased: boolean;
  ownedCount: number;
}

export function stockActions(
  book: StockInfo,
  borrowedSlugs: Set<string>,
  purchasedCounts?: Map<string, number>,
): StockActions {
  const isBorrowed = borrowedSlugs.has(book.slug);
  const ownedCount = purchasedCounts?.get(book.slug) ?? 0;
  const isPurchased = ownedCount > 0;
  const canBuy = book.inStock > 1;
  const canBorrow = book.inStock > 0 && !isBorrowed;
  const unavailable = book.inStock < 1 && !isBorrowed;
  return { isBorrowed, canBuy, canBorrow, unavailable, isPurchased, ownedCount };
}
