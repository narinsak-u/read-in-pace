import type * as schema from '../../db/schema';

export type PurchaseRow = typeof schema.purchases.$inferSelect;

export interface PurchaseRepository {
  findExisting(bookId: string, userId: string): Promise<{ id: string } | null>;
  record(bookId: string, userId: string): Promise<PurchaseRow>;
  listForUser(
    userId: string,
  ): Promise<Array<{ row: PurchaseRow; bookId: string }>>;
}
