// NestJS module that wires the Better Auth provider (low-level instance) and the
// AuthPort adapter (testable seam), plus the PoliciesModule for ownership checks.
import { Global, Module } from '@nestjs/common';
import { authProvider } from './better-auth';
import { authPortProvider, BetterAuthAdapter } from './better-auth.adapter';
import { PoliciesModule } from './policies/policies.module';

@Global()
@Module({
  imports: [PoliciesModule],
  providers: [authProvider, BetterAuthAdapter, authPortProvider],
  exports: [authProvider, authPortProvider, PoliciesModule],
})
export class AuthModule {}
