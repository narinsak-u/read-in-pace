// Drizzle implementation of BookReadModel.
// SINGLE home of the meta-subquery projection (likeCount, commentCount,
// avgRating, ratingsCount). All cross-table book reads go through here.
import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import { buildPaginated, type Paginated } from '../paginated';
import {
  type BookReadModel,
  type BookRow,
} from '../interfaces/book.repository';
import { BOOK_READ_MODEL } from '../tokens';

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

@Injectable()
export class DrizzleBookReadModel implements BookReadModel {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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

export const bookReadModelProvider = {
  provide: BOOK_READ_MODEL,
  useExisting: DrizzleBookReadModel,
};
