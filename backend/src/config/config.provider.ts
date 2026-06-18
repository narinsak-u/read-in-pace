import { Injectable } from '@nestjs/common';
import { envSchema } from './env.schema';
import type {
  AppConfig,
  AuthConfig,
  DbConfig,
  FrontendConfig,
  ServerConfig,
  StripeConfig,
} from './config.types';

@Injectable()
export class ConfigService implements AppConfig {
  readonly db: DbConfig;
  readonly auth: AuthConfig;
  readonly stripe: StripeConfig;
  readonly server: ServerConfig;
  readonly frontend: FrontendConfig;

  constructor(raw: NodeJS.ProcessEnv) {
    const parsed = envSchema.parse(raw);

    const fallbackBaseUrl = 'http://localhost:3000';
    const baseUrl = parsed.BETTER_AUTH_URL ?? fallbackBaseUrl;

    this.db = { url: parsed.DATABASE_URL };
    this.auth = {
      baseUrl,
      trustedOrigins: [baseUrl],
      secret: parsed.AUTH_SECRET,
    };
    this.stripe = { secretKey: parsed.STRIPE_SECRET_KEY };
    this.server = {
      port: parsed.PORT,
      corsOrigins: (parsed.CORS_ORIGINS ?? fallbackBaseUrl)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      nodeEnv: parsed.NODE_ENV,
      logLevel: parsed.LOG_LEVEL,
    };
    this.frontend = {
      url: parsed.FRONTEND_URL ?? parsed.BETTER_AUTH_URL ?? fallbackBaseUrl,
    };
  }
}
