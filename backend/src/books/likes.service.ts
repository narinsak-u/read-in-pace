// Business logic for book likes: check and toggle with count return.
import { Inject, Injectable } from '@nestjs/common';
import { LIKE_REPO, type LikeRepository } from '../repositories/tokens';

@Injectable()
export class LikesService {
  constructor(@Inject(LIKE_REPO) private readonly likes: LikeRepository) {}

  async check(bookId: string, userId: string) {
    const liked = await this.likes.isLikedBy(bookId, userId);
    return { liked };
  }

  toggle(bookId: string, userId: string) {
    return this.likes.toggle(bookId, userId);
  }
}
