// Drizzle implementation of BookRepository.
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import { buildPaginated, type Paginated } from '../paginated';
import {
  type BookPricing,
  type BookRepository,
  type BookRow,
  type NewBook,
  type UpdateBook,
} from '../interfaces/book.repository';
import { BOOK_REPO } from '../tokens';

@Injectable()
export class DrizzleBookRepository implements BookRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: string): Promise<BookRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.books)
      .where(eq(schema.books.id, id));
    return row ?? null;
  }

  async findByIdOrSlug(idOrSlug: string): Promise<BookRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.books)
      .where(
        or(eq(schema.books.slug, idOrSlug), eq(schema.books.id, idOrSlug)),
      );
    return row ?? null;
  }

  async findOwner(bookId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ createdBy: schema.books.createdBy })
      .from(schema.books)
      .where(eq(schema.books.id, bookId));
    return row?.createdBy ?? null;
  }

  async findPricingForPurchase(bookIds: string[]): Promise<BookPricing[]> {
    if (bookIds.length === 0) return [];
    return this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        price: schema.books.price,
        category: schema.books.category,
        inStock: schema.books.inStock,
        isAvailable: schema.books.isAvailable,
      })
      .from(schema.books)
      .where(sql`${schema.books.id} = ANY(${bookIds})`);
  }

  async create(data: NewBook, userId: string): Promise<BookRow> {
    const [row] = await this.db
      .insert(schema.books)
      .values({
        ...data,
        totalPages: data.totalPages ?? 300,
        createdBy: userId,
      })
      .returning();
    return row;
  }

  async update(id: string, data: UpdateBook): Promise<BookRow | null> {
    const [row] = await this.db
      .update(schema.books)
      .set(data)
      .where(eq(schema.books.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.books)
      .where(eq(schema.books.id, id))
      .returning({ id: schema.books.id });
    return result.length > 0;
  }

  async incrementStock(bookId: string): Promise<void> {
    await this.db
      .update(schema.books)
      .set({
        inStock: sql`${schema.books.inStock} + 1`,
        isAvailable: true,
      })
      .where(eq(schema.books.id, bookId));
  }

  async decrementStock(bookId: string): Promise<BookRow | null> {
    const [row] = await this.db
      .update(schema.books)
      .set({ inStock: sql`${schema.books.inStock} - 1` })
      .where(and(eq(schema.books.id, bookId), gt(schema.books.inStock, 1)))
      .returning();
    return row ?? null;
  }

  async findFullById(id: string): Promise<BookRow | null> {
    const [row] = await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(eq(schema.books.id, id));
    return row ?? null;
  }

  async findFullByIdOrSlug(idOrSlug: string): Promise<BookRow | null> {
    const [row] = await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(
        sql`${schema.books.slug} = ${idOrSlug} OR ${schema.books.id} = ${idOrSlug}`,
      );
    return row ?? null;
  }

  async findFullPaginated(
    page: number,
    limit: number,
    category?: string,
  ): Promise<Paginated<BookRow>> {
    const offset = (page - 1) * limit;
    const where = category
      ? sql`${schema.books.category} = ${category}`
      : sql`TRUE`;

    const data = (await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.books.createdAt))) as BookRow[];

    const [totalResult] = await this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(schema.books)
      .where(where);

    return buildPaginated(data, Number(totalResult?.value ?? 0), page, limit);
  }

  async findNewArrivals(limit: number): Promise<BookRow[]> {
    return await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .limit(limit)
      .orderBy(desc(schema.books.createdAt));
  }

  async getTrending(limit: number): Promise<BookRow[]> {
    return await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .orderBy(
        desc(
          sql`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
        ),
      )
      .limit(limit);
  }

  async attachToBorrows(
    borrows: Array<{ bookId: string }>,
  ): Promise<Map<string, BookRow>> {
    const ids = [...new Set(borrows.map((b) => b.bookId))];
    if (ids.length === 0) return new Map();
    const rows = (await this.db
      .select(bookWithMeta)
      .from(schema.books)
      .where(sql`${schema.books.id} = ANY(${ids})`)) as BookRow[];
    return new Map(rows.map((r) => [r.id, r]));
  }

  async attachToPurchases(
    purchases: Array<{ bookId: string }>,
  ): Promise<Map<string, BookRow>> {
    return this.attachToBorrows(purchases);
  }
}

const bookWithMeta = {
  id: schema.books.id,
  slug: schema.books.slug,
  title: schema.books.title,
  author: schema.books.author,
  price: schema.books.price,
  cover: schema.books.cover,
  synopsis: schema.books.synopsis,
  category: schema.books.category,
  crop: schema.books.crop,
  shelf: schema.books.shelf,
  year: schema.books.year,
  trending: schema.books.trending,
  inStock: schema.books.inStock,
  isAvailable: schema.books.isAvailable,
  totalPages: schema.books.totalPages,
  createdBy: schema.books.createdBy,
  createdAt: schema.books.createdAt,
  updatedAt: schema.books.updatedAt,
  likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.likes} WHERE ${schema.likes.bookId} = ${schema.books.id})`,
  commentCount: sql<number>`(SELECT COUNT(*) FROM ${schema.comments} WHERE ${schema.comments.bookId} = ${schema.books.id})`,
  avgRating: sql<number>`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
  ratingsCount: sql<number>`(SELECT COUNT(*) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id})`,
} as const;

export const bookRepoProvider = {
  provide: BOOK_REPO,
  useExisting: DrizzleBookRepository,
};
