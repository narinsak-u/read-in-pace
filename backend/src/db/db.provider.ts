// NestJS factory provider that creates a Drizzle ORM instance backed by a pg Pool.
// Reads DATABASE_URL from environment and registers the full schema for typed queries.
import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE';

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    return drizzle(pool, { schema });
  },
};
