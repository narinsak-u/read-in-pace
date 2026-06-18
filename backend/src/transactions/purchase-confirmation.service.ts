// PurchaseConfirmationService — verifies Stripe session, records purchases atomically,
// and lists a user's purchase history.
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { STRIPE } from './stripe.provider';
import * as schema from '../db/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import {
  BOOK_REPO,
  PURCHASE_REPO,
  type BookRepository,
  type PurchaseRepository,
} from '../repositories/tokens';
import type StripeConstructor from 'stripe';

type StripeClient = ReturnType<typeof StripeConstructor>;

@Injectable()
export class PurchaseConfirmationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(STRIPE) private readonly stripe: StripeClient,
    @Inject(BOOK_REPO) private readonly books: BookRepository,
    @Inject(PURCHASE_REPO) private readonly purchases: PurchaseRepository,
  ) {}

  async confirm(sessionId: string, userId: string): Promise<unknown> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== 'paid' ||
      session.metadata?.userId !== userId
    ) {
      throw new BadRequestException('Invalid purchase confirmation');
    }

    const bookCount = Number(session.metadata.bc);
    if (bookCount > 0) {
      const bookIds: string[] = [];
      for (let i = 0; i < bookCount; i++) {
        bookIds.push(session.metadata[`b${i}`]);
      }
      return this.recordBatchPurchases(bookIds, userId);
    }

    const bookId = session.metadata.bookId;
    if (!bookId) {
      throw new BadRequestException('No book IDs found in session metadata');
    }
    return this.recordSinglePurchase(bookId, userId);
  }

  private async recordSinglePurchase(bookId: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const existing = await this.purchases.findExisting(bookId, userId);
      if (existing) return existing;

      const purchase = await this.purchases.record(bookId, userId);

      await tx
        .update(schema.books)
        .set({ inStock: sql`${schema.books.inStock} - 1` })
        .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)));

      return purchase;
    });
  }

  private async recordBatchPurchases(bookIds: string[], userId: string) {
    return this.db.transaction(async (tx) => {
      const inserted: string[] = [];
      for (const bookId of bookIds) {
        const existing = await this.purchases.findExisting(bookId, userId);
        if (existing) continue;
        await this.purchases.record(bookId, userId);
        inserted.push(bookId);
      }
      for (const bookId of inserted) {
        await tx
          .update(schema.books)
          .set({ inStock: sql`${schema.books.inStock} - 1` })
          .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)));
      }
      return inserted;
    });
  }

  async listForUser(userId: string) {
    const rows = await this.purchases.listForUser(userId);
    const bookMap = await this.books.attachToPurchases(
      rows.map((r) => ({ bookId: r.bookId })),
    );
    return rows.flatMap(({ row, bookId }) => {
      const book = bookMap.get(bookId);
      if (!book) return [];
      return [{ purchase: row, book }];
    });
  }
}
