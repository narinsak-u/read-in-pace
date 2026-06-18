// OwnershipPolicy — one implementation, many bindings (one per ownership-gated action).
// Loads the resource via the appropriate repository and verifies the user is the owner.
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleBookRepository } from '../../repositories/drizzle/drizzle-book.repository';
import { DrizzleCommentRepository } from '../../repositories/drizzle/drizzle-comment.repository';
import { Policy, PolicyContext } from './policy.types';

@Injectable()
export class OwnershipPolicy implements Policy {
  constructor(
    private readonly books: DrizzleBookRepository,
    private readonly comments: DrizzleCommentRepository,
    public readonly action: string,
  ) {}

  async check(ctx: PolicyContext): Promise<boolean> {
    switch (this.action) {
      case 'edit_book':
      case 'delete_book': {
        const bookId = ctx.params['id'];
        if (!bookId) throw new NotFoundException('Book id missing');
        const owner = await this.books.findOwner(bookId);
        if (!owner) throw new NotFoundException('Book not found');
        if (owner !== ctx.user.id) {
          throw new ForbiddenException(
            `You can only ${this.action.replace('_', ' ')} your own books`,
          );
        }
        return true;
      }
      case 'delete_comment': {
        const commentId = ctx.params['commentId'] ?? ctx.params['id'];
        if (!commentId) throw new NotFoundException('Comment id missing');
        const comment = await this.comments.findRaw(commentId);
        if (!comment) throw new NotFoundException('Comment not found');
        if (comment.userId !== ctx.user.id) {
          throw new ForbiddenException('You can only delete your own comments');
        }
        return true;
      }
      default:
        throw new Error(`Unknown ownership action: ${this.action}`);
    }
  }
}
