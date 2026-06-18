// Better Auth server instance, created by a Nest factory provider that depends on
// ConfigService and the shared Drizzle instance. Provides email/password
// authentication and session management.
import { Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import type { ConfigService } from '../config/config.provider';
import { DRIZZLE } from '../db/db.module';

export const AUTH = Symbol('AUTH');

export const authProvider: Provider = {
  provide: AUTH,
  inject: [DRIZZLE, 'ConfigService'],
  useFactory: (db: NodePgDatabase<typeof schema>, config: ConfigService) => {
    return betterAuth({
      database: drizzleAdapter(db, { provider: 'pg', schema }),
      emailAndPassword: { enabled: true },
      trustedOrigins: [...config.auth.trustedOrigins],
      baseURL: config.auth.baseUrl,
    });
  },
};
