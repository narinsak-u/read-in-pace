// NestJS guard that validates requests via the AuthPort (Better Auth adapter).
// Resolves the session from incoming headers and attaches the user to the request.
import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_PORT, type AuthPort } from './auth.port';
import type * as schema from '../db/schema';

type DatabaseUser = typeof schema.user.$inferSelect;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH_PORT) private readonly port: AuthPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DatabaseUser }>();

    const result = await this.port.getSession(request.headers);

    if (!result) {
      throw new UnauthorizedException();
    }

    request.user = result.user;
    return true;
  }
}
