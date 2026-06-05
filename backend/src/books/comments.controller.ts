import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll(@Param('id') id: string) {
    return this.commentsService.findByBook(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Param('id') id: string,
    @Body('text') text: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.create(id, user.id, text);
  }

  @Delete(':commentId')
  @UseGuards(AuthGuard)
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.remove(commentId, user.id);
  }
}
