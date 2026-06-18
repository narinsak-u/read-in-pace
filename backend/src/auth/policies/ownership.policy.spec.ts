import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OwnershipPolicy } from './ownership.policy';
import { DrizzleBookRepository } from '../../repositories/drizzle/drizzle-book.repository';
import { DrizzleCommentRepository } from '../../repositories/drizzle/drizzle-comment.repository';

const alice = {
  id: 'alice',
  name: 'A',
  email: 'a@x',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const bob = { ...alice, id: 'bob' };

const makeBookRepo = (createdBy: string | null) =>
  ({
    findById: async () => null,
    findByIdOrSlug: async () => null,
    findOwner: async () => createdBy,
    findPricingForPurchase: async () => [],
    create: async () => ({}) as never,
    update: async () => null,
    delete: async () => false,
    incrementStock: async () => undefined,
    decrementStock: async () => null,
    findFullById: async () => null,
    findFullByIdOrSlug: async () => null,
    findFullPaginated: async () => ({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
    findNewArrivals: async () => [],
    getTrending: async () => [],
    attachToBorrows: async () => new Map(),
    attachToPurchases: async () => new Map(),
  }) as unknown as DrizzleBookRepository;

const makeCommentRepo = (userId: string | null) =>
  ({
    findByBook: async () => [],
    findById: async () => null,
    findRaw: async () =>
      userId
        ? {
            id: 'c1',
            bookId: 'b1',
            userId,
            parentId: null,
            text: 't',
            rating: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    create: async () => ({}) as never,
    delete: async () => undefined,
    countLikesFor: async () => new Map(),
    likedSetFor: async () => new Map(),
    like: async () => ({ liked: true, likeCount: 0 }),
    unlike: async () => ({ liked: false, likeCount: 0 }),
  }) as unknown as DrizzleCommentRepository;

describe('OwnershipPolicy', () => {
  it('allows the owner to edit a book', async () => {
    const policy = new OwnershipPolicy(
      makeBookRepo('alice'),
      makeCommentRepo(null),
      'edit_book',
    );
    await expect(
      policy.check({ user: alice, params: { id: 'b1' }, body: undefined }),
    ).resolves.toBe(true);
  });

  it('forbids a non-owner from editing a book', async () => {
    const policy = new OwnershipPolicy(
      makeBookRepo('alice'),
      makeCommentRepo(null),
      'edit_book',
    );
    await expect(
      policy.check({ user: bob, params: { id: 'b1' }, body: undefined }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFound when the book does not exist', async () => {
    const policy = new OwnershipPolicy(
      makeBookRepo(null),
      makeCommentRepo(null),
      'edit_book',
    );
    await expect(
      policy.check({ user: alice, params: { id: 'missing' }, body: undefined }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows the owner to delete a comment', async () => {
    const policy = new OwnershipPolicy(
      makeBookRepo(null),
      makeCommentRepo('alice'),
      'delete_comment',
    );
    await expect(
      policy.check({
        user: alice,
        params: { commentId: 'c1' },
        body: undefined,
      }),
    ).resolves.toBe(true);
  });

  it('forbids a non-owner from deleting a comment', async () => {
    const policy = new OwnershipPolicy(
      makeBookRepo(null),
      makeCommentRepo('alice'),
      'delete_comment',
    );
    await expect(
      policy.check({ user: bob, params: { commentId: 'c1' }, body: undefined }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws on an unknown action', async () => {
    const policy = new OwnershipPolicy(
      makeBookRepo(null),
      makeCommentRepo(null),
      'fly_to_mars',
    );
    await expect(
      policy.check({ user: alice, params: { id: 'b1' }, body: undefined }),
    ).rejects.toThrow(/Unknown ownership action/);
  });
});
