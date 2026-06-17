import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findByBook(bookId: string, currentUserId?: string) {
    const rows = await this.db
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
      .orderBy(asc(schema.comments.createdAt));

    const commentIds = rows.map((c) => c.id);
    const likeCountMap = new Map<string, number>();
    const likedByUserMap = new Map<string, boolean>();

    if (commentIds.length > 0) {
      const likes = await this.db
        .select({
          commentId: schema.commentLikes.commentId,
          userId: schema.commentLikes.userId,
        })
        .from(schema.commentLikes)
        .where(inArray(schema.commentLikes.commentId, commentIds));

      for (const id of commentIds) {
        const commentLikes = likes.filter((l) => l.commentId === id);
        likeCountMap.set(id, commentLikes.length);
        if (currentUserId) {
          likedByUserMap.set(
            id,
            commentLikes.some((l) => l.userId === currentUserId),
          );
        }
      }
    }

    const attachLikes = (c: (typeof rows)[number]) => ({
      ...c,
      likeCount: likeCountMap.get(c.id) ?? 0,
      likedByUser: likedByUserMap.get(c.id) ?? false,
    });

    const topLevel = rows.filter((c) => !c.parentId);
    const replies = rows.filter((c) => c.parentId);

    return topLevel.map((comment) => ({
      ...attachLikes(comment),
      replies: replies
        .filter((r) => r.parentId === comment.id)
        .map(attachLikes),
    }));
  }

  async create(bookId: string, userId: string, dto: CreateCommentDto) {
    if (dto.parentId) {
      const [parent] = await this.db
        .select({ id: schema.comments.id, bookId: schema.comments.bookId })
        .from(schema.comments)
        .where(eq(schema.comments.id, dto.parentId));

      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.bookId !== bookId)
        throw new BadRequestException(
          'Parent comment does not belong to this book',
        );
    }

    if (dto.rating !== undefined && dto.parentId) {
      throw new BadRequestException('Replies cannot include a rating');
    }

    const [comment] = await this.db
      .insert(schema.comments)
      .values({
        bookId,
        userId,
        text: dto.text,
        parentId: dto.parentId ?? null,
        rating: dto.rating ?? null,
      })
      .returning();

    if (dto.rating !== undefined) {
      await this.db
        .insert(schema.ratings)
        .values({ bookId, userId, rating: dto.rating })
        .onConflictDoUpdate({
          target: [schema.ratings.bookId, schema.ratings.userId],
          set: { rating: dto.rating },
        });
    }

    const [withUser] = await this.db
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
      .where(eq(schema.comments.id, comment.id));

    return { ...withUser, likeCount: 0, likedByUser: false };
  }

  async remove(commentId: string, userId: string) {
    const [comment] = await this.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId)
      throw new ForbiddenException('You can only delete your own comments');

    await this.db
      .delete(schema.comments)
      .where(eq(schema.comments.id, commentId));
  }

  async like(commentId: string, userId: string) {
    const [comment] = await this.db
      .select({ id: schema.comments.id })
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));

    if (!comment) throw new NotFoundException('Comment not found');

    await this.db
      .insert(schema.commentLikes)
      .values({ commentId, userId })
      .onConflictDoNothing();

    const likeCount = await this.countLikes(commentId);
    return { liked: true, likeCount };
  }

  async unlike(commentId: string, userId: string) {
    await this.db
      .delete(schema.commentLikes)
      .where(
        and(
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.userId, userId),
        ),
      );

    const likeCount = await this.countLikes(commentId);
    return { liked: false, likeCount };
  }

  private async countLikes(commentId: string): Promise<number> {
    const result = await this.db
      .select({ id: schema.commentLikes.commentId })
      .from(schema.commentLikes)
      .where(eq(schema.commentLikes.commentId, commentId));

    return result.length;
  }
}
