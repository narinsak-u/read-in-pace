import { Module, type Provider } from '@nestjs/common';
import { OwnershipPolicy } from './ownership.policy';
import { PoliciesGuard } from './policies.guard';
import {
  CAN_DELETE_BOOK,
  CAN_DELETE_COMMENT,
  CAN_EDIT_BOOK,
} from './policy.types';
import {
  BOOK_REPO,
  COMMENT_REPO,
  type BookRepository,
  type CommentRepository,
} from '../../repositories/tokens';

const ownershipProvider = (token: string, action: string): Provider => ({
  provide: token,
  useFactory: (books: BookRepository, comments: CommentRepository) =>
    new OwnershipPolicy(books, comments, action),
  inject: [BOOK_REPO, COMMENT_REPO],
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
