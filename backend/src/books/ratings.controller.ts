import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RateBookDto } from './dto/rate-book.dto';

@Controller('api/books/:id/rate')
@UseGuards(AuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get()
  check(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.ratingsService.check(id, user.id);
  }

  @Post()
  rate(
    @Param('id') id: string,
    @Body() dto: RateBookDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ratingsService.upsert(id, user.id, dto);
  }
}
