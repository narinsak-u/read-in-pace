import { Global, Module } from '@nestjs/common';
import { DrizzleBookRepository } from './drizzle/drizzle-book.repository';
import { DrizzleCommentRepository } from './drizzle/drizzle-comment.repository';
import { DrizzleRatingRepository } from './drizzle/drizzle-rating.repository';
import { DrizzleLikeRepository } from './drizzle/drizzle-like.repository';
import { DrizzleBorrowRepository } from './drizzle/drizzle-borrow.repository';
import { DrizzlePurchaseRepository } from './drizzle/drizzle-purchase.repository';
import { DrizzlePostRepository } from './drizzle/drizzle-post.repository';
import { DrizzleGoalRepository } from './drizzle/drizzle-goal.repository';

@Global()
@Module({
  providers: [
    DrizzleBookRepository,
    DrizzleCommentRepository,
    DrizzleRatingRepository,
    DrizzleLikeRepository,
    DrizzleBorrowRepository,
    DrizzlePurchaseRepository,
    DrizzlePostRepository,
    DrizzleGoalRepository,
  ],
  exports: [
    DrizzleBookRepository,
    DrizzleCommentRepository,
    DrizzleRatingRepository,
    DrizzleLikeRepository,
    DrizzleBorrowRepository,
    DrizzlePurchaseRepository,
    DrizzlePostRepository,
    DrizzleGoalRepository,
  ],
})
export class RepositoriesModule {}
