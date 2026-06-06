// Global module that provides the Drizzle ORM instance to the entire application.
// Re-exports the DRIZZLE injection token so other modules can inject the database client.
import { Global, Module } from '@nestjs/common';
import { drizzleProvider, DRIZZLE } from './db.provider';

@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DRIZZLE],
})
export class DbModule {}

export { DRIZZLE };
