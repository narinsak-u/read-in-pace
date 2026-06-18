import type * as schema from '../../db/schema';

export type LikeRow = typeof schema.likes.$inferSelect;

export interface LikeRepository {
  isLikedBy(bookId: string, userId: string): Promise<boolean>;
  toggle(
    bookId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }>;
}
