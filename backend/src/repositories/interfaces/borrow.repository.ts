import type * as schema from '../../db/schema';

export type BorrowRow = typeof schema.borrows.$inferSelect;

export interface BorrowWithBook {
  borrow: BorrowRow;
  bookId: string;
}

export interface BorrowRepository {
  findActiveBorrow(
    bookId: string,
    userId: string,
  ): Promise<{ id: string } | null>;
  recordBorrow(
    bookId: string,
    userId: string,
    dueAt: Date,
    totalPages: number,
  ): Promise<BorrowRow>;
  markReturned(borrowId: string): Promise<BorrowRow | null>;
  listActiveByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ borrowIds: string[]; total: number }>;
}
