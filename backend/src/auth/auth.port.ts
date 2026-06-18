import type * as schema from '../db/schema';

export type AuthUser = typeof schema.user.$inferSelect;

export interface AuthSession {
  user: AuthUser;
  session: { id: string; userId: string; expiresAt: Date };
}

export const AUTH_PORT = Symbol('AUTH_PORT');

export interface AuthPort {
  getSession(headers: Record<string, unknown>): Promise<AuthSession | null>;
}
