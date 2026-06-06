// NestJS param decorator that extracts the authenticated user from the request.
// Used in route handlers after AuthGuard populates request.user.
// Usage: @CurrentUser() user: User
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
