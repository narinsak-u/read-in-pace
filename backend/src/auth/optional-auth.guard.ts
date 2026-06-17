// NestJS guard that optionally authenticates the user.
// Unlike AuthGuard, this does NOT throw when no session exists — it simply
// leaves request.user undefined. Use with OptionalUser decorator.
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { auth } from './better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import * as schema from '../db/schema';

type DatabaseUser = typeof schema.user.$inferSelect;

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DatabaseUser }>();
    const headers = fromNodeHeaders(request.headers);

    const result = await auth.api.getSession({
      headers,
    });

    if (result) {
      request.user = result.user as DatabaseUser;
    }

    return true;
  }
}
