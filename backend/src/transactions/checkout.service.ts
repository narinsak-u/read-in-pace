// CheckoutService — Stripe single-book and cart checkout session creation.
// Hides the inStock<=1 borrow-only rule, the pricing math, and the URL construction.
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { STRIPE } from './stripe.provider';
import { ConfigService } from '../config/config.provider';
import { DrizzleBookRepository } from '../repositories/drizzle/drizzle-book.repository';
import { applyDiscounts } from './pricing';
import type StripeConstructor from 'stripe';

type StripeClient = ReturnType<typeof StripeConstructor>;

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(STRIPE) private readonly stripe: StripeClient,
    private readonly config: ConfigService,
    private readonly books: DrizzleBookRepository,
  ) {}

  async forBook(bookId: string, userId: string): Promise<{ url: string }> {
    const [book] = await this.books.findPricingForPurchase([bookId]);
    if (!book) throw new NotFoundException('Book not found');
    if (book.inStock <= 1) {
      throw new BadRequestException(
        'Only one copy left — this book is borrow-only',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: book.title },
            unit_amount: Math.round(Number(book.price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { bookId, userId },
      success_url: `${this.config.frontend.url}/dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.frontend.url}/book/${bookId}`,
    });

    return { url: session.url ?? '' };
  }

  async forCart(bookIds: string[], userId: string): Promise<{ url: string }> {
    if (!bookIds || bookIds.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const books = await this.books.findPricingForPurchase(bookIds);
    if (books.length !== bookIds.length) {
      throw new NotFoundException('One or more books not found');
    }

    const badBooks = books.filter((b) => b.inStock <= 1);
    if (badBooks.length > 0) {
      throw new BadRequestException(
        `Some books are no longer available for purchase: ${badBooks.map((b) => b.title).join(', ')}`,
      );
    }

    const discount = applyDiscounts(
      books.map((b) => ({ price: b.price, category: b.category })),
    );

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Read in Peace — ${bookIds.length} book${bookIds.length > 1 ? 's' : ''}`,
            },
            unit_amount: discount.total,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        bc: String(bookIds.length),
        ...Object.fromEntries(bookIds.map((id, i) => [`b${i}`, id])),
      },
      success_url: `${this.config.frontend.url}/dashboard?tab=purchased&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.frontend.url}/feed`,
    });

    return { url: session.url ?? '' };
  }
}
