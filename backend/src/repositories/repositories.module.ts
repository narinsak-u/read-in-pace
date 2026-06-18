import { Global, Module } from '@nestjs/common';
import {
  DrizzleBookRepository,
  bookRepoProvider,
} from './drizzle/drizzle-book.repository';
import {
  DrizzleCommentRepository,
  commentRepoProvider,
} from './drizzle/drizzle-comment.repository';
import {
  DrizzleRatingRepository,
  ratingRepoProvider,
} from './drizzle/drizzle-rating.repository';
import {
  DrizzleLikeRepository,
  likeRepoProvider,
} from './drizzle/drizzle-like.repository';
import {
  DrizzleBorrowRepository,
  borrowRepoProvider,
} from './drizzle/drizzle-borrow.repository';
import {
  DrizzlePurchaseRepository,
  purchaseRepoProvider,
} from './drizzle/drizzle-purchase.repository';
import {
  DrizzlePostRepository,
  postRepoProvider,
} from './drizzle/drizzle-post.repository';
import {
  DrizzleGoalRepository,
  goalRepoProvider,
} from './drizzle/drizzle-goal.repository';

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
    bookRepoProvider,
    commentRepoProvider,
    ratingRepoProvider,
    likeRepoProvider,
    borrowRepoProvider,
    purchaseRepoProvider,
    postRepoProvider,
    goalRepoProvider,
  ],
  exports: [
    bookRepoProvider,
    commentRepoProvider,
    ratingRepoProvider,
    likeRepoProvider,
    borrowRepoProvider,
    purchaseRepoProvider,
    postRepoProvider,
    goalRepoProvider,
  ],
})
export class RepositoriesModule {}
