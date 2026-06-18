import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { POLICIES_KEY } from './policies.decorator';
import { Policy, PolicyContext, User } from './policy.types';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tokens = this.reflector.getAllAndOverride<string[]>(POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!tokens || tokens.length === 0) return true;

    const request = context.switchToHttp().getRequest<{
      user?: User;
      params: Record<string, string>;
      body: unknown;
    }>();
    if (!request.user) throw new UnauthorizedException();

    const ctx: PolicyContext = {
      user: request.user,
      params: request.params ?? {},
      body: request.body,
    };

    for (const token of tokens) {
      const policy = await this.moduleRef.resolve<Policy>(token, undefined, {
        strict: false,
      });
      await policy.check(ctx);
    }
    return true;
  }
}
