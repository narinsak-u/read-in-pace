import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  type CommentRepository,
  type CommentRow,
  type CommentWithUser,
  type NewComment,
} from '../interfaces/comment.repository';
import { COMMENT_REPO } from '../tokens';

@Injectable()
export class DrizzleCommentRepository implements CommentRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByBook(bookId: string): Promise<CommentWithUser[]> {
    return this.db
      .select({
        id: schema.comments.id,
        bookId: schema.comments.bookId,
        userId: schema.comments.userId,
        parentId: schema.comments.parentId,
        text: schema.comments.text,
        rating: schema.comments.rating,
        createdAt: schema.comments.createdAt,
        updatedAt: schema.comments.updatedAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.comments)
      .innerJoin(schema.user, eq(schema.comments.userId, schema.user.id))
      .where(eq(schema.comments.bookId, bookId))
      .orderBy(schema.comments.createdAt);
  }

  async findById(commentId: string): Promise<CommentWithUser | null> {
    const [row] = await this.db
      .select({
        id: schema.comments.id,
        bookId: schema.comments.bookId,
        userId: schema.comments.userId,
        parentId: schema.comments.parentId,
        text: schema.comments.text,
        rating: schema.comments.rating,
        createdAt: schema.comments.createdAt,
        updatedAt: schema.comments.updatedAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.comments)
      .innerJoin(schema.user, eq(schema.comments.userId, schema.user.id))
      .where(eq(schema.comments.id, commentId));
    return row ?? null;
  }

  async findRaw(commentId: string): Promise<CommentRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));
    return row ?? null;
  }

  async create(data: NewComment): Promise<CommentRow> {
    const [row] = await this.db
      .insert(schema.comments)
      .values(data)
      .returning();
    return row;
  }

  async delete(commentId: string): Promise<void> {
    await this.db
      .delete(schema.comments)
      .where(eq(schema.comments.id, commentId));
  }

  async countLikesFor(commentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (commentIds.length === 0) return map;
    const rows = await this.db
      .select({ commentId: schema.commentLikes.commentId })
      .from(schema.commentLikes)
      .where(inArray(schema.commentLikes.commentId, commentIds));
    for (const id of commentIds) {
      map.set(id, rows.filter((r) => r.commentId === id).length);
    }
    return map;
  }

  async likedSetFor(
    commentIds: string[],
    userId: string,
  ): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    if (commentIds.length === 0) return map;
    const rows = await this.db
      .select({ commentId: schema.commentLikes.commentId })
      .from(schema.commentLikes)
      .where(
        and(
          inArray(schema.commentLikes.commentId, commentIds),
          eq(schema.commentLikes.userId, userId),
        ),
      );
    const liked = new Set(rows.map((r) => r.commentId));
    for (const id of commentIds) {
      map.set(id, liked.has(id));
    }
    return map;
  }

  async like(
    commentId: string,
    userId: string,
  ): Promise<{ liked: true; likeCount: number }> {
    await this.db
      .insert(schema.commentLikes)
      .values({ commentId, userId })
      .onConflictDoNothing();
    const count = (await this.countLikesFor([commentId])).get(commentId) ?? 0;
    return { liked: true, likeCount: count };
  }

  async unlike(
    commentId: string,
    userId: string,
  ): Promise<{ liked: false; likeCount: number }> {
    await this.db
      .delete(schema.commentLikes)
      .where(
        and(
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.userId, userId),
        ),
      );
    const count = (await this.countLikesFor([commentId])).get(commentId) ?? 0;
    return { liked: false, likeCount: count };
  }
}

export const commentRepoProvider = {
  provide: COMMENT_REPO,
  useExisting: DrizzleCommentRepository,
};
