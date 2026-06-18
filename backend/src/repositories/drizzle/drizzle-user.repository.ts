import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  type UserRepository,
  type UserRow,
} from '../interfaces/user.repository';
import { USER_REPO } from '../tokens';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, id));
    return row ?? null;
  }
}

export const userRepoProvider = {
  provide: USER_REPO,
  useExisting: DrizzleUserRepository,
};
