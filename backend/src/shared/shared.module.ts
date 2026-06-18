import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import { AppLoggerModule } from './logger/logger.module';

@Global()
@Module({
  imports: [
    AppLoggerModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: { headers?: Record<string, string | string[]> }) => {
          const headerId = req.headers?.['x-request-id'];
          if (typeof headerId === 'string' && headerId.length > 0) {
            return headerId;
          }
          if (Array.isArray(headerId) && headerId[0]) {
            return headerId[0];
          }
          return randomUUID();
        },
        setup: (
          cls,
          req: { method?: string; originalUrl?: string; url?: string },
        ) => {
          cls.set('requestId', cls.getId());
          cls.set('method', req.method ?? 'UNKNOWN');
          cls.set('path', req.originalUrl ?? req.url ?? 'UNKNOWN');
        },
      },
    }),
  ],
  exports: [AppLoggerModule, ClsModule],
})
export class SharedModule {}
