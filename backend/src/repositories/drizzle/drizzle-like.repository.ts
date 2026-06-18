import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import { type LikeRepository } from '../interfaces/like.repository';
import { LIKE_REPO } from '../tokens';

@Injectable()
export class DrizzleLikeRepository implements LikeRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async isLikedBy(bookId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ bookId: schema.likes.bookId })
      .from(schema.likes)
      .where(
        and(eq(schema.likes.bookId, bookId), eq(schema.likes.userId, userId)),
      )
      .limit(1);
    return rows.length > 0;
  }

  async toggle(
    bookId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const [existing] = await this.db
      .select()
      .from(schema.likes)
      .where(
        and(eq(schema.likes.bookId, bookId), eq(schema.likes.userId, userId)),
      );

    if (existing) {
      await this.db
        .delete(schema.likes)
        .where(
          and(eq(schema.likes.bookId, bookId), eq(schema.likes.userId, userId)),
        );
    } else {
      await this.db.insert(schema.likes).values({ bookId, userId });
    }

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.likes)
      .where(eq(schema.likes.bookId, bookId));

    return { liked: !existing, likeCount: Number(result?.count ?? 0) };
  }
}

export const likeRepoProvider = {
  provide: LIKE_REPO,
  useExisting: DrizzleLikeRepository,
};
