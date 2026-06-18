// Business logic for books: CRUD, paginated listing, stock management, and trending.
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DrizzleBookRepository,
  type NewBook,
} from '../repositories/drizzle/drizzle-book.repository';
import { DrizzleLikeRepository } from '../repositories/drizzle/drizzle-like.repository';
import { DrizzleRatingRepository } from '../repositories/drizzle/drizzle-rating.repository';
import type { CreateBookDto } from './dto/create-book.dto';
import type { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(
    private readonly books: DrizzleBookRepository,
    private readonly likes: DrizzleLikeRepository,
    private readonly ratings: DrizzleRatingRepository,
  ) {}

  findAll(page: number, limit: number, category?: string) {
    return this.books.findFullPaginated(page, limit, category);
  }

  async findOne(idOrSlug: string) {
    const book = await this.books.findFullByIdOrSlug(idOrSlug);
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  findNewArrivals() {
    return this.books.findNewArrivals(4);
  }

  getTrending() {
    return this.books.getTrending(3);
  }

  async create(data: CreateBookDto, userId: string) {
    return this.books.create(data as NewBook, userId);
  }

  async update(id: string, data: UpdateBookDto, userId: string) {
    const updated = await this.books.update(id, data);
    if (!updated) throw new NotFoundException('Book not found');
    return updated;
  }

  async remove(id: string, userId: string) {
    const deleted = await this.books.delete(id);
    if (!deleted) throw new NotFoundException('Book not found');
  }

  isLiked(bookId: string, userId: string) {
    return this.likes.isLikedBy(bookId, userId);
  }

  async toggleLike(bookId: string, userId: string) {
    const liked = await this.likes.toggle(bookId, userId);
    return { liked };
  }

  getUserRating(bookId: string, userId: string) {
    return this.ratings.findUserRating(bookId, userId);
  }

  async rateBook(bookId: string, userId: string, rating: number) {
    return this.ratings.upsert(bookId, userId, rating);
  }
}
