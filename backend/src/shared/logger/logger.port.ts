export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export const LOGGER_PORT = Symbol('LOGGER_PORT');

export interface LoggerPort {
  log(message: string, context?: LogContext): void;
  error(message: string, trace?: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  verbose(message: string, context?: LogContext): void;
}
