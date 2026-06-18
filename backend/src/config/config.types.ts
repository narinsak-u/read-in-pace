export interface DbConfig {
  readonly url: string;
}

export interface AuthConfig {
  readonly baseUrl: string;
  readonly trustedOrigins: readonly string[];
  readonly secret: string | undefined;
}

export interface StripeConfig {
  readonly secretKey: string;
}

export interface ServerConfig {
  readonly port: number;
  readonly corsOrigins: readonly string[];
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly logLevel:
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace'
    | 'silent';
}

export interface FrontendConfig {
  readonly url: string;
}

export interface AppConfig {
  readonly db: DbConfig;
  readonly auth: AuthConfig;
  readonly stripe: StripeConfig;
  readonly server: ServerConfig;
  readonly frontend: FrontendConfig;
}
