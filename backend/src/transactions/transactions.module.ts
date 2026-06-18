// Module for borrow/purchase transactions. The work is split across three cohesive
// services: BorrowsService, CheckoutService, PurchaseConfirmationService.
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { BorrowsService } from './borrows.service';
import { CheckoutService } from './checkout.service';
import { PurchaseConfirmationService } from './purchase-confirmation.service';
import { stripeProvider } from './stripe.provider';

@Module({
  controllers: [TransactionsController],
  providers: [
    BorrowsService,
    CheckoutService,
    PurchaseConfirmationService,
    stripeProvider,
  ],
})
export class TransactionsModule {}
