import type * as schema from '../../db/schema';

export type CommentRow = typeof schema.comments.$inferSelect;
export type NewComment = typeof schema.comments.$inferInsert;

export interface CommentWithUser {
  id: string;
  bookId: string;
  userId: string;
  parentId: string | null;
  text: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; image: string | null };
}

export interface CommentRepository {
  findByBook(bookId: string): Promise<CommentWithUser[]>;
  findById(commentId: string): Promise<CommentWithUser | null>;
  findRaw(commentId: string): Promise<CommentRow | null>;
  create(data: NewComment): Promise<CommentRow>;
  delete(commentId: string): Promise<void>;
  countLikesFor(commentIds: string[]): Promise<Map<string, number>>;
  likedSetFor(
    commentIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>>;
  like(
    commentId: string,
    userId: string,
  ): Promise<{ liked: true; likeCount: number }>;
  unlike(
    commentId: string,
    userId: string,
  ): Promise<{ liked: false; likeCount: number }>;
}
