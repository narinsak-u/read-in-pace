// NestJS guard that optionally authenticates the user.
// Unlike AuthGuard, this does NOT throw when no session exists — it simply
// leaves request.user undefined. Use with OptionalUser decorator.
import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_PORT, type AuthPort } from './auth.port';
import type * as schema from '../db/schema';

type DatabaseUser = typeof schema.user.$inferSelect;

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_PORT) private readonly port: AuthPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DatabaseUser }>();

    const result = await this.port.getSession(request.headers);

    if (result) {
      request.user = result.user;
    }

    return true;
  }
}
