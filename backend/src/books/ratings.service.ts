// Business logic for ratings: check user's rating and upsert (insert or update) on conflict.
// Uses ON CONFLICT DO UPDATE for idempotent rating submission. Returns new average after upsert.
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { RateBookDto } from './dto/rate-book.dto';

@Injectable()
export class RatingsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async check(bookId: string, userId: string) {
    const [row] = await this.db
      .select({ rating: schema.ratings.rating })
      .from(schema.ratings)
      .where(
        and(
          eq(schema.ratings.bookId, bookId),
          eq(schema.ratings.userId, userId),
        ),
      );
    return { userRating: row?.rating ?? null };
  }

  async upsert(bookId: string, userId: string, dto: RateBookDto) {
    const { rating } = dto;

    await this.db
      .insert(schema.ratings)
      .values({ bookId, userId, rating })
      .onConflictDoUpdate({
        target: [schema.ratings.bookId, schema.ratings.userId],
        set: { rating },
      });

    const [{ avg }] = await this.db
      .select({ avg: sql<number>`AVG(${schema.ratings.rating})` })
      .from(schema.ratings)
      .where(eq(schema.ratings.bookId, bookId));

    return {
      avgRating: avg ? Number(Number(avg).toFixed(1)) : 0,
      userRating: rating,
    };
  }
}
