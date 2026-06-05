import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

@Injectable()
export class TransactionsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async borrow(bookId: string, userId: string) {
    const active = await this.db
      .select()
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.bookId, bookId),
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );

    if (active.length > 0) {
      throw new ConflictException('Book already borrowed');
    }

    const [borrow] = await this.db
      .insert(schema.borrows)
      .values({ bookId, userId })
      .returning();
    return borrow;
  }

  async returnBook(bookId: string, userId: string) {
    const [active] = await this.db
      .select()
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.bookId, bookId),
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );

    if (!active) {
      throw new BadRequestException('No active borrow to return');
    }

    const [borrow] = await this.db
      .update(schema.borrows)
      .set({ returnedAt: new Date() })
      .where(eq(schema.borrows.id, active.id))
      .returning();
    return borrow;
  }

  async buy(bookId: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.bookId, bookId),
          eq(schema.purchases.userId, userId),
        ),
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [purchase] = await this.db
      .insert(schema.purchases)
      .values({ bookId, userId })
      .returning();
    return purchase;
  }

  async getUserBorrows(userId: string) {
    return this.db
      .select({
        borrow: {
          id: schema.borrows.id,
          bookId: schema.borrows.bookId,
          userId: schema.borrows.userId,
          borrowedAt: schema.borrows.borrowedAt,
          returnedAt: schema.borrows.returnedAt,
        },
        book: {
          id: schema.books.id,
          title: schema.books.title,
          author: schema.books.author,
          price: schema.books.price,
          cover: schema.books.cover,
          synopsis: schema.books.synopsis,
          category: schema.books.category,
          trending: schema.books.trending,
        },
      })
      .from(schema.borrows)
      .innerJoin(schema.books, eq(schema.borrows.bookId, schema.books.id))
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      )
      .orderBy(sql`${schema.borrows.borrowedAt} DESC`);
  }

  async getUserPurchases(userId: string) {
    return this.db
      .select({
        purchase: {
          id: schema.purchases.id,
          bookId: schema.purchases.bookId,
          userId: schema.purchases.userId,
          purchasedAt: schema.purchases.purchasedAt,
        },
        book: {
          id: schema.books.id,
          title: schema.books.title,
          author: schema.books.author,
          price: schema.books.price,
          cover: schema.books.cover,
          synopsis: schema.books.synopsis,
          category: schema.books.category,
          trending: schema.books.trending,
        },
      })
      .from(schema.purchases)
      .innerJoin(schema.books, eq(schema.purchases.bookId, schema.books.id))
      .where(eq(schema.purchases.userId, userId))
      .orderBy(sql`${schema.purchases.purchasedAt} DESC`);
  }
}
