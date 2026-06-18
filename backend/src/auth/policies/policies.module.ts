import { Module, type Provider } from '@nestjs/common';
import { OwnershipPolicy } from './ownership.policy';
import { PoliciesGuard } from './policies.guard';
import {
  CAN_DELETE_BOOK,
  CAN_DELETE_COMMENT,
  CAN_EDIT_BOOK,
} from './policy.types';
import { DrizzleBookRepository } from '../../repositories/drizzle/drizzle-book.repository';
import { DrizzleCommentRepository } from '../../repositories/drizzle/drizzle-comment.repository';

const ownershipProvider = (token: string, action: string): Provider => ({
  provide: token,
  useFactory: (
    books: DrizzleBookRepository,
    comments: DrizzleCommentRepository,
  ) => new OwnershipPolicy(books, comments, action),
  inject: [DrizzleBookRepository, DrizzleCommentRepository],
});

@Module({
  providers: [
    PoliciesGuard,
    ownershipProvider(CAN_EDIT_BOOK, 'edit_book'),
    ownershipProvider(CAN_DELETE_BOOK, 'delete_book'),
    ownershipProvider(CAN_DELETE_COMMENT, 'delete_comment'),
  ],
  exports: [CAN_EDIT_BOOK, CAN_DELETE_BOOK, CAN_DELETE_COMMENT, PoliciesGuard],
})
export class PoliciesModule {}
