// NestJS module that registers and exports AuthGuard for use across the application.
// Import this module wherever route protection via @UseGuards(AuthGuard) is needed.
import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
