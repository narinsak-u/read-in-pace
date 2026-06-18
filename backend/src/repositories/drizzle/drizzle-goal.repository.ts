import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  type ReadingGoalRepository,
  type ReadingGoalRow,
} from '../interfaces/goal.repository';
import { GOAL_REPO } from '../tokens';

@Injectable()
export class DrizzleGoalRepository implements ReadingGoalRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getForYear(
    userId: string,
    year: number,
  ): Promise<ReadingGoalRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.readingGoals)
      .where(
        and(
          eq(schema.readingGoals.userId, userId),
          eq(schema.readingGoals.year, year),
        ),
      );
    return row ?? null;
  }

  async setGoal(
    userId: string,
    year: number,
    goal: number,
  ): Promise<ReadingGoalRow> {
    const existing = await this.getForYear(userId, year);
    if (existing) {
      const [updated] = await this.db
        .update(schema.readingGoals)
        .set({ goal, updatedAt: new Date() })
        .where(eq(schema.readingGoals.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(schema.readingGoals)
      .values({ userId, year, goal })
      .returning();
    return created;
  }

  async countCompletedBorrowsInYear(
    userId: string,
    year: number,
  ): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.borrows)
      .where(
        and(
          eq(schema.borrows.userId, userId),
          sql`${schema.borrows.returnedAt} IS NOT NULL`,
          sql`EXTRACT(YEAR FROM ${schema.borrows.returnedAt}) = ${year}`,
        ),
      );
    return Number(row?.count ?? 0);
  }

  async countPurchasesInYear(userId: string, year: number): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.purchases)
      .where(
        and(
          eq(schema.purchases.userId, userId),
          sql`EXTRACT(YEAR FROM ${schema.purchases.purchasedAt}) = ${year}`,
        ),
      );
    return Number(row?.count ?? 0);
  }
}

export const goalRepoProvider = {
  provide: GOAL_REPO,
  useExisting: DrizzleGoalRepository,
};
