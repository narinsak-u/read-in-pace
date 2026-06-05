import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findByBook(bookId: string) {
    return this.db
      .select({
        id: schema.comments.id,
        bookId: schema.comments.bookId,
        userId: schema.comments.userId,
        text: schema.comments.text,
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
      .orderBy(desc(schema.comments.createdAt));
  }

  async create(bookId: string, userId: string, text: string) {
    const [comment] = await this.db
      .insert(schema.comments)
      .values({ bookId, userId, text })
      .returning();
    return comment;
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
}
