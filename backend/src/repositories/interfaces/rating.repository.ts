import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../db/schema';

export type RatingRow = typeof schema.ratings.$inferSelect;

export interface RatingRepository {
  findUserRating(bookId: string, userId: string): Promise<number | null>;
  upsert(bookId: string, userId: string, rating: number): Promise<void>;
  recordFromComment(
    tx: NodePgDatabase<typeof schema>,
    input: { bookId: string; userId: string; rating: number | null },
  ): Promise<void>;
  getAvgForBook(bookId: string): Promise<number | null>;
}
