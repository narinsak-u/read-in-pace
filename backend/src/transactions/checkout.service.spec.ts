const mockStripeCreate = jest.fn();

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
      },
    },
  })),
}));

import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '../config/config.provider';
import { CheckoutService } from './checkout.service';
import {
  DrizzleBookRepository,
  type BookPricing,
} from '../repositories/drizzle/drizzle-book.repository';

const fakeBook = (id: string, inStock: number, price: string): BookPricing => ({
  id,
  title: `Book ${id}`,
  price,
  category: 'Fiction',
  inStock,
  isAvailable: inStock > 1,
});

const makeBookRepo = (
  books: BookPricing[],
): Partial<DrizzleBookRepository> => ({
  findById: () => Promise.resolve(null),
  findByIdOrSlug: () => Promise.resolve(null),
  findOwner: () => Promise.resolve(null),
  findPricingForPurchase: (ids) =>
    Promise.resolve(books.filter((b) => ids.includes(b.id))),
  create: () => Promise.resolve({} as never),
  update: () => Promise.resolve(null),
  delete: () => Promise.resolve(false),
  incrementStock: () => Promise.resolve(undefined),
  decrementStock: () => Promise.resolve(null),
  findFullById: () => Promise.resolve(null),
  findFullByIdOrSlug: () => Promise.resolve(null),
  findFullPaginated: () =>
    Promise.resolve({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
  findNewArrivals: () => Promise.resolve([]),
  getTrending: () => Promise.resolve([]),
  attachToBorrows: () => Promise.resolve(new Map()),
  attachToPurchases: () => Promise.resolve(new Map()),
});

const stripeConfig = {
  stripe: { secretKey: 'sk_test_mock' },
  frontend: { url: 'https://app.test' },
} as unknown as ConfigService;

describe('CheckoutService.forBook', () => {
  const buildService = (books: BookPricing[]) =>
    Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: DrizzleBookRepository, useValue: makeBookRepo(books) },
        { provide: ConfigService, useValue: stripeConfig },
      ],
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStripeCreate.mockResolvedValue({
      id: 'cs_1',
      url: 'https://stripe.test/cs_1',
    });
  });

  it('rejects a book with inStock <= 1 (borrow-only)', async () => {
    const svc = (
      await buildService([fakeBook('b1', 1, '25.00')]).compile()
    ).get(CheckoutService);
    await expect(svc.forBook('b1', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFound when the book is missing', async () => {
    const svc = (await buildService([]).compile()).get(CheckoutService);
    await expect(svc.forBook('b1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a single-book session with the configured URLs', async () => {
    const svc = (
      await buildService([fakeBook('b1', 3, '25.00')]).compile()
    ).get(CheckoutService);
    const result = await svc.forBook('b1', 'u1');
    expect(result.url).toBe('https://stripe.test/cs_1');
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { bookId: 'b1', userId: 'u1' },
        success_url: expect.stringContaining('https://app.test/dashboard'),
        cancel_url: expect.stringContaining('https://app.test/book/b1'),
      }),
    );
  });
});

describe('CheckoutService.forCart', () => {
  const buildService = (books: BookPricing[]) =>
    Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: DrizzleBookRepository, useValue: makeBookRepo(books) },
        { provide: ConfigService, useValue: stripeConfig },
      ],
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStripeCreate.mockResolvedValue({
      id: 'cs_1',
      url: 'https://stripe.test/cs_1',
    });
  });

  it('rejects an empty cart', async () => {
    const svc = (await buildService([]).compile()).get(CheckoutService);
    await expect(svc.forCart([], 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('packs book IDs into bc/bN metadata', async () => {
    const svc = (
      await buildService([
        fakeBook('b1', 3, '20.00'),
        fakeBook('b2', 3, '30.00'),
      ]).compile()
    ).get(CheckoutService);
    await svc.forCart(['b1', 'b2'], 'u1');
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ bc: '2', b0: 'b1', b1: 'b2' }),
      }),
    );
  });
});
