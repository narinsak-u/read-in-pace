import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LOGGER_PORT, type LogContext, type LoggerPort } from './logger.port';

@Injectable()
export class PinoLoggerAdapter implements LoggerPort {
  constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {}

  log(message: string, context?: LogContext): void {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.trace({ context }, message);
  }
}

export const loggerPortProvider = {
  provide: LOGGER_PORT,
  useExisting: PinoLoggerAdapter,
};
