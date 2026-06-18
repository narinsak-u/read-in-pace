import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '../../config/config.provider';
import { PinoLoggerAdapter, loggerPortProvider } from './pino-logger.adapter';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.server.logLevel,
          transport:
            config.server.nodeEnv === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
  ],
  providers: [PinoLoggerAdapter, loggerPortProvider],
  exports: [loggerPortProvider, LoggerModule],
})
export class AppLoggerModule {}
