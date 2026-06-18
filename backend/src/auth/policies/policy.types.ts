import type * as schema from '../../db/schema';

export type User = typeof schema.user.$inferSelect;
export type Book = typeof schema.books.$inferSelect;
export type Comment = typeof schema.comments.$inferSelect;

export interface PolicyContext {
  user: User;
  params: Record<string, string>;
  body: unknown;
}

export interface Policy {
  readonly action: string;
  check(ctx: PolicyContext): Promise<boolean>;
}

export const CAN_EDIT_BOOK = 'CAN_EDIT_BOOK';
export const CAN_DELETE_BOOK = 'CAN_DELETE_BOOK';
export const CAN_DELETE_COMMENT = 'CAN_DELETE_COMMENT';
