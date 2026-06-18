// Provider that creates a Stripe client from STRIPE_SECRET_KEY in typed ConfigService.
// Throws if the key is missing — guaranteed by zod validation at boot.
import { Provider } from '@nestjs/common';
import StripeConstructor from 'stripe';
import { ConfigService } from '../config/config.provider';

export const STRIPE = Symbol('STRIPE');

export const stripeProvider: Provider = {
  provide: STRIPE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new StripeConstructor(config.stripe.secretKey),
};
