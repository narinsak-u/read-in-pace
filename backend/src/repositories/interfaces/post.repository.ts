import type * as schema from '../../db/schema';

export type PostRow = typeof schema.posts.$inferSelect;
export type NewPost = typeof schema.posts.$inferInsert;

export interface PostWithUser {
  id: string;
  text: string;
  rating: number | null;
  createdAt: Date;
  user: { id: string; name: string; image: string | null };
  likeCount: number;
  replyCount: number;
}

export interface PostRepository {
  feed(limit: number, userId?: string): Promise<PostWithUser[]>;
  create(userId: string, text: string, rating?: number): Promise<PostRow>;
  findById(postId: string): Promise<{ id: string } | null>;
  toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }>;
  isLikedBy(postId: string, userId: string): Promise<boolean>;
  getReplies(postId: string): Promise<
    Array<{
      id: string;
      text: string;
      createdAt: Date;
      user: { id: string; name: string; image: string | null };
    }>
  >;
  createReply(
    postId: string,
    userId: string,
    text: string,
  ): Promise<{
    id: string;
    postId: string;
    userId: string;
    text: string;
    createdAt: Date;
  }>;
}
