// BorrowsService — borrow and return workflows, user borrow list.
// Owns the `FOR UPDATE` row lock and the 14-day due-date constant.
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  BOOK_REPO,
  BORROW_REPO,
  type BookRepository,
  type BorrowRepository,
  type BorrowRow,
} from '../repositories/tokens';
import { buildPaginated, type Paginated } from '../repositories/paginated';

const BORROW_PERIOD_DAYS = 14;

export interface BorrowWithBook {
  borrow: BorrowRow;
  book: unknown;
}

@Injectable()
export class BorrowsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(BOOK_REPO) private readonly books: BookRepository,
    @Inject(BORROW_REPO) private readonly borrows: BorrowRepository,
  ) {}

  async borrow(bookId: string, userId: string): Promise<BorrowRow> {
    return this.db.transaction(async (tx) => {
      const [book] = await tx
        .select({
          id: schema.books.id,
          isAvailable: schema.books.isAvailable,
          inStock: schema.books.inStock,
          totalPages: schema.books.totalPages,
        })
        .from(schema.books)
        .where(eq(schema.books.id, bookId))
        .for('update');

      if (!book) throw new NotFoundException('Book not found');
      if (!book.isAvailable) {
        throw new BadRequestException(
          'Book is currently not available for borrowing',
        );
      }

      const [active] = await tx
        .select({ id: schema.borrows.id })
        .from(schema.borrows)
        .where(
          and(
            eq(schema.borrows.bookId, bookId),
            eq(schema.borrows.userId, userId),
            isNull(schema.borrows.returnedAt),
          ),
        );

      if (active) {
        throw new BadRequestException('Book already borrowed');
      }

      const remaining = book.inStock - 1;
      await tx
        .update(schema.books)
        .set({
          inStock: remaining,
          isAvailable: remaining > 1,
        })
        .where(eq(schema.books.id, bookId));

      const [borrow] = await tx
        .insert(schema.borrows)
        .values({
          bookId,
          userId,
          dueAt: new Date(
            Date.now() + BORROW_PERIOD_DAYS * 24 * 60 * 60 * 1000,
          ),
          currentPage: 0,
          totalPages: book.totalPages,
        })
        .returning();

      return borrow;
    });
  }

  async returnBook(bookId: string, userId: string): Promise<BorrowRow | null> {
    const active = await this.borrows.findActiveBorrow(bookId, userId);
    if (!active) {
      throw new BadRequestException('No active borrow to return');
    }
    await this.books.incrementStock(bookId);
    return this.borrows.markReturned(active.id);
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<BorrowWithBook>> {
    const { borrowIds, total } = await this.borrows.listActiveByUser(
      userId,
      page,
      limit,
    );
    const borrowMap = new Map<string, BorrowRow>();
    if (borrowIds.length > 0) {
      const rows = await this.db
        .select()
        .from(schema.borrows)
        .where(sql`${schema.borrows.id} = ANY(${borrowIds})`);
      for (const r of rows) borrowMap.set(r.id, r);
    }
    const bookMap = await this.books.attachToBorrows(
      [...borrowMap.values()].map((b) => ({ bookId: b.bookId })),
    );
    const data: BorrowWithBook[] = borrowIds.flatMap((id) => {
      const borrow = borrowMap.get(id);
      const book = borrow ? bookMap.get(borrow.bookId) : undefined;
      if (!borrow || !book) return [];
      return [{ borrow, book }];
    });
    return buildPaginated(data, total, page, limit);
  }
}
