export interface StockInfo {
  inStock: number;
  slug: string;
}

export interface StockActions {
  isBorrowed: boolean;
  canBuy: boolean;
  canBorrow: boolean;
  unavailable: boolean;
}

export function stockActions(
  book: StockInfo,
  borrowedSlugs: Set<string>,
): StockActions {
  const isBorrowed = borrowedSlugs.has(book.slug);
  const canBuy = book.inStock > 1;
  const canBorrow = book.inStock > 0 && !isBorrowed;
  const unavailable = book.inStock < 1 && !isBorrowed;
  return { isBorrowed, canBuy, canBorrow, unavailable };
}
