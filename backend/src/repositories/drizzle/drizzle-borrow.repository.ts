import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  type BorrowRepository,
  type BorrowRow,
} from '../interfaces/borrow.repository';
import { BORROW_REPO } from '../tokens';

@Injectable()
export class DrizzleBorrowRepository implements BorrowRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findActiveBorrow(
    bookId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: schema.borrows.id })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.bookId, bookId),
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );
    return row ?? null;
  }

  async recordBorrow(
    bookId: string,
    userId: string,
    dueAt: Date,
    totalPages: number,
  ): Promise<BorrowRow> {
    const [row] = await this.db
      .insert(schema.borrows)
      .values({
        bookId,
        userId,
        dueAt,
        currentPage: 0,
        totalPages,
      })
      .returning();
    return row;
  }

  async markReturned(borrowId: string): Promise<BorrowRow | null> {
    const [row] = await this.db
      .update(schema.borrows)
      .set({ returnedAt: new Date() })
      .where(eq(schema.borrows.id, borrowId))
      .returning();
    return row ?? null;
  }

  async listActiveByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ borrowIds: string[]; total: number }> {
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      );

    const rows = await this.db
      .select({
        id: schema.borrows.id,
        bookId: schema.borrows.bookId,
        userId: schema.borrows.userId,
        borrowedAt: schema.borrows.borrowedAt,
        returnedAt: schema.borrows.returnedAt,
        dueAt: schema.borrows.dueAt,
        currentPage: schema.borrows.currentPage,
        totalPages: schema.borrows.totalPages,
      })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          isNull(schema.borrows.returnedAt),
        ),
      )
      .orderBy(sql`${schema.borrows.borrowedAt} DESC`)
      .limit(limit)
      .offset(offset);

    return {
      borrowIds: rows.map((r) => r.id),
      total: Number(totalResult?.value ?? 0),
    };
  }
}

export const borrowRepoProvider = {
  provide: BORROW_REPO,
  useExisting: DrizzleBorrowRepository,
};
