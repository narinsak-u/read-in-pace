import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { MembershipRow } from '../domain/membership.entity';
import type { MembershipRepository } from '../domain/membership.repository';

@Injectable()
export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUserId(userId: string): Promise<MembershipRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, userId))
      .limit(1);
    return (row as MembershipRow) ?? null;
  }

  async upsert(
    userId: string,
    data: Partial<Omit<MembershipRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<MembershipRow> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [row] = await this.db
        .update(schema.memberships)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.memberships.id, existing.id))
        .returning();
      return row as MembershipRow;
    }
    const [row] = await this.db
      .insert(schema.memberships)
      .values({ userId, ...data } as any)
      .returning();
    return row as MembershipRow;
  }
}
