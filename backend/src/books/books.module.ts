// Registers books, likes, comments, and ratings controllers and services.
// Exports BooksService and CommentsService for cross-module use (e.g. purchases, admin).
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  controllers: [
    BooksController,
    LikesController,
    CommentsController,
    RatingsController,
  ],
  providers: [BooksService, LikesService, CommentsService, RatingsService],
  exports: [BooksService, CommentsService],
})
export class BooksModule {}
