// NestJS param decorator that optionally extracts the authenticated user.
// Returns undefined when no user is attached (no session or not authenticated).
// Usage: @OptionalUser() user?: { id: string }
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import * as schema from '../db/schema';

type DatabaseUser = typeof schema.user.$inferSelect;

export const OptionalUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DatabaseUser }>();
    return request.user;
  },
);
