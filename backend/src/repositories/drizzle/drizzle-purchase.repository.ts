import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  type PurchaseRepository,
  type PurchaseRow,
} from '../interfaces/purchase.repository';
import { PURCHASE_REPO } from '../tokens';

@Injectable()
export class DrizzlePurchaseRepository implements PurchaseRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findExisting(
    bookId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: schema.purchases.id })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.bookId, bookId),
          eq(schema.purchases.userId, userId),
        ),
      );
    return row ?? null;
  }

  async record(bookId: string, userId: string): Promise<PurchaseRow> {
    const [row] = await this.db
      .insert(schema.purchases)
      .values({ bookId, userId })
      .returning();
    return row;
  }

  async listForUser(
    userId: string,
  ): Promise<Array<{ row: PurchaseRow; bookId: string }>> {
    const rows = await this.db
      .select({
        id: schema.purchases.id,
        bookId: schema.purchases.bookId,
        userId: schema.purchases.userId,
        purchasedAt: schema.purchases.purchasedAt,
      })
      .from(schema.purchases)
      .where(eq(schema.purchases.userId, userId))
      .orderBy(sql`${schema.purchases.purchasedAt} DESC`);
    return rows.map((r) => ({ row: r, bookId: r.bookId }));
  }
}

export const purchaseRepoProvider = {
  provide: PURCHASE_REPO,
  useExisting: DrizzlePurchaseRepository,
};
