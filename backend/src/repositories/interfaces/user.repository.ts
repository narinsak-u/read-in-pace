import type * as schema from '../../db/schema';

export type UserRow = typeof schema.user.$inferSelect;

export interface UserRepository {
  findById(id: string): Promise<UserRow | null>;
}
