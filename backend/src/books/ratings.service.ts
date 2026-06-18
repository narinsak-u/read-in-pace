// Business logic for ratings: check user's rating and upsert on conflict.
// Returns the new average after upsert.
import { Inject, Injectable } from '@nestjs/common';
import { RATING_REPO, type RatingRepository } from '../repositories/tokens';
import type { RateBookDto } from './dto/rate-book.dto';

@Injectable()
export class RatingsService {
  constructor(
    @Inject(RATING_REPO) private readonly ratings: RatingRepository,
  ) {}

  async check(bookId: string, userId: string) {
    const userRating = await this.ratings.findUserRating(bookId, userId);
    return { userRating };
  }

  async upsert(bookId: string, userId: string, dto: RateBookDto) {
    await this.ratings.upsert(bookId, userId, dto.rating);
    const avg = await this.ratings.getAvgForBook(bookId);
    return {
      avgRating: avg ? Number(Number(avg).toFixed(1)) : 0,
      userRating: dto.rating,
    };
  }
}
