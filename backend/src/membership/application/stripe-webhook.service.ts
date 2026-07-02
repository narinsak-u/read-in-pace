import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import { STRIPE, type StripeClient } from '../../transactions/infrastructure/stripe.provider';
import type { MembershipRepository } from '../domain/membership.repository';
import { MEMBERSHIP_REPOSITORY } from '../domain/membership.repository';
import { PLAN_CONFIG, type Plan } from '../domain/plans';

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly repo: MembershipRepository,
    @Inject(STRIPE) private readonly stripe: StripeClient,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async handleEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
    }
  }

  private async findMembershipBySubId(subId: string) {
    const [row] = await this.db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.stripeSubscriptionId, subId))
      .limit(1);
    return row ?? null;
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (!userId || !plan) return;

    let subData: Record<string, any> = {};
    if (session.subscription) {
      const sub = await this.stripe.subscriptions.retrieve(session.subscription);
      subData = {
        stripeSubscriptionId: (sub as any).id as string,
        stripePriceId: (sub as any).items.data[0]?.price?.id ?? null,
        currentPeriodStart: (sub as any).current_period_start
          ? new Date(((sub as any).current_period_start as number) * 1000)
          : undefined,
        currentPeriodEnd: (sub as any).current_period_end
          ? new Date(((sub as any).current_period_end as number) * 1000)
          : undefined,
        status: 'active',
      };
    }

    const config = PLAN_CONFIG[plan as Plan];
    await this.repo.upsert(userId, {
      plan,
      itemLimit: config?.itemLimit ?? 15,
      ...subData,
    });
  }

  private async handleInvoicePaid(invoice: any): Promise<void> {
    if (!invoice.subscription) return;
    const membership = await this.findMembershipBySubId(invoice.subscription);
    if (!membership) return;
    const sub = await this.stripe.subscriptions.retrieve(invoice.subscription);
    await this.repo.upsert(membership.userId, {
      currentPeriodStart: (sub as any).current_period_start
        ? new Date(((sub as any).current_period_start as number) * 1000)
        : undefined,
      currentPeriodEnd: (sub as any).current_period_end
        ? new Date(((sub as any).current_period_end as number) * 1000)
        : undefined,
      status: 'active',
    });
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const membership = await this.findMembershipBySubId((subscription as any).id as string);
    if (!membership) return;
    await this.repo.upsert(membership.userId, {
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end ?? false,
      currentPeriodEnd: (subscription as any).current_period_end
        ? new Date(((subscription as any).current_period_end as number) * 1000)
        : undefined,
      status: (subscription as any).status === 'active' ? 'active' : 'past_due',
    });
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const membership = await this.findMembershipBySubId((subscription as any).id as string);
    if (!membership) return;
    await this.repo.upsert(membership.userId, {
      plan: 'free',
      itemLimit: 15,
      status: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }
}
