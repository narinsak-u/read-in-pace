import type * as schema from '../../db/schema';

export type ReadingGoalRow = typeof schema.readingGoals.$inferSelect;

export interface ReadingGoalRepository {
  getForYear(userId: string, year: number): Promise<ReadingGoalRow | null>;
  setGoal(userId: string, year: number, goal: number): Promise<ReadingGoalRow>;
  countCompletedBorrowsInYear(userId: string, year: number): Promise<number>;
  countPurchasesInYear(userId: string, year: number): Promise<number>;
}
