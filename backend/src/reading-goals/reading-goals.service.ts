import { Inject, Injectable } from '@nestjs/common';
import { GOAL_REPO, type ReadingGoalRepository } from '../repositories/tokens';

@Injectable()
export class ReadingGoalsService {
  constructor(
    @Inject(GOAL_REPO) private readonly goals: ReadingGoalRepository,
  ) {}

  async getGoal(userId: string) {
    const year = new Date().getFullYear();
    const goal = await this.goals.getForYear(userId, year);
    const completed = await this.goals.countCompletedBorrowsInYear(
      userId,
      year,
    );
    const purchased = await this.goals.countPurchasesInYear(userId, year);
    return {
      year,
      goal: goal?.goal ?? 0,
      current: completed + purchased,
      updatedAt: goal?.updatedAt ?? null,
    };
  }

  setGoal(userId: string, goal: number) {
    const year = new Date().getFullYear();
    return this.goals.setGoal(userId, year, goal);
  }
}
