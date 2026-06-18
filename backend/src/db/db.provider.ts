// NestJS factory provider that creates a Drizzle ORM instance backed by a pg Pool.
// Reads DATABASE_URL from typed ConfigService and registers the full schema.
import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { ConfigService } from '../config/config.provider';

export const DRIZZLE = Symbol('DRIZZLE');

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const pool = new Pool({ connectionString: config.db.url });
    return drizzle(pool, { schema });
  },
};
