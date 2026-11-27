import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { LawyerWorkflowMailService } from '../mail/lawyer-workflow-mail.service.js';
import { AuditLogsService } from './audit-logs.service.js';
import { UsersService } from './users.service.js';
import {
  memberships,
  payments,
  users,
  type PaymentStatus,
} from '../database/schema.js';

export type NewAnnualMembership = {
  lawyerUserId: string;
  method: typeof payments.$inferInsert.method;
};

const ANNUAL_MEMBERSHIP_AMOUNT = '100.00';
const paymentMethodLabels = {
  bank_transfer: 'Virement bancaire',
  paypal: 'PayPal',
  cryptocurrency: 'Cryptomonnaie',
};

const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['pending', 'succeeded', 'failed', 'cancelled'],
  succeeded: ['succeeded', 'refunded'],
  failed: ['failed'],
  cancelled: ['cancelled'],
  refunded: ['refunded'],
};

@Injectable()
export class MembershipsService {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
    private readonly auditLogsService: AuditLogsService,
    private readonly usersService: UsersService,
    private readonly workflowMail: LawyerWorkflowMailService,
  ) {}

  async findLatestForLawyer(lawyerUserId: string) {
    const [membership] = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.lawyerUserId, lawyerUserId))
      .orderBy(desc(memberships.createdAt), desc(memberships.id))
      .limit(1);

    if (
      membership?.status === 'active' &&
      membership.endsAt &&
      membership.endsAt <= new Date()
    ) {
      return { ...membership, status: 'expired' as const };
    }

    return membership ?? null;
  }

  async createAnnualMembership(input: NewAnnualMembership) {
    const result = await this.db.transaction(async (tx) => {
      const [lawyer] = await tx
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.id, input.lawyerUserId), eq(users.role, 'lawyer'), eq(users.status, 'active')))
        .for('update');

      if (!lawyer) {
        throw new NotFoundException('Compte avocat actif introuvable.');
      }

      const now = new Date();
      const [existing] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.lawyerUserId, input.lawyerUserId),
            eq(memberships.status, 'active'),
            gt(memberships.endsAt, now),
          ),
        )
        .for('update');

      if (existing) {
        throw new ConflictException('An active membership already exists.');
      }

      const [membership] = await tx
        .insert(memberships)
        .values({
          lawyerUserId: input.lawyerUserId,
          amount: ANNUAL_MEMBERSHIP_AMOUNT,
          currency: 'EUR',
          status: 'active',
          startsAt: now,
          endsAt: sql`(${now.toISOString()}::timestamptz AT TIME ZONE 'UTC' + interval '1 year') AT TIME ZONE 'UTC'`,
          createdAt: now,
        })
        .returning();

      const [payment] = await tx
        .insert(payments)
        .values({
          membershipId: membership.id,
          method: input.method,
          amount: membership.amount,
          currency: membership.currency,
          status: 'succeeded',
          provider: 'simulation',
          paidAt: now,
        })
        .returning();

      await this.auditLogsService.record({
        actorUserId: input.lawyerUserId,
        action: 'membership.created',
        entityType: 'membership',
        entityId: membership.id,
      }, tx);
      await this.auditLogsService.record({
        actorUserId: input.lawyerUserId,
        action: 'payment.simulated_succeeded',
        entityType: 'payment',
        entityId: payment.id,
        metadata: { method: payment.method },
      }, tx);

      return { membership, payment, email: lawyer.email };
    });

    const { membership, payment, email } = result;
    const details = {
      email,
      reference: payment.id,
      amount: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: payment.currency }).format(Number(payment.amount)),
      method: paymentMethodLabels[payment.method],
      endsAt: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(membership.endsAt!),
    };
    const proformaSent = await this.workflowMail.send('proforma', email, details);
    const [confirmationSent, adminNotified] = await Promise.all([
      this.workflowMail.send('payment', email, details),
      this.usersService.activeAdminEmails().then(admins => this.workflowMail.send('member', admins, details)),
    ]);
    return { membership, payment, proformaSent, confirmationSent, adminNotified };
  }

  async recordPaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    providerReference?: string,
  ) {
    const updatedPayment = await this.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update');

      if (!payment) {
        throw new NotFoundException('Payment not found.');
      }

      if (!paymentTransitions[payment.status].includes(status)) {
        throw new ConflictException(
          `Payment cannot transition from ${payment.status} to ${status}.`,
        );
      }

      const now = new Date();
      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status,
          providerReference: providerReference ?? payment.providerReference,
          paidAt:
            status === 'succeeded' ? (payment.paidAt ?? now) : payment.paidAt,
          updatedAt: now,
        })
        .where(eq(payments.id, paymentId))
        .returning();

      if (payment.status !== 'succeeded' && status === 'succeeded') {
        const endsAt = new Date(now);
        endsAt.setFullYear(endsAt.getFullYear() + 1);
        await tx
          .update(memberships)
          .set({
            status: 'active',
            startsAt: now,
            endsAt,
            updatedAt: now,
          })
          .where(
            and(
              eq(memberships.id, payment.membershipId),
              eq(memberships.status, 'pending_payment'),
            ),
          );
      } else if (payment.status === 'succeeded' && status === 'refunded') {
        await tx
          .update(memberships)
          .set({ status: 'cancelled', updatedAt: now })
          .where(eq(memberships.id, payment.membershipId));
      }

      return updatedPayment;
    });

    await this.auditLogsService.record({
      actorUserId: null,
      action: `payment.${status}`,
      entityType: 'payment',
      entityId: paymentId,
    });

    return updatedPayment;
  }
}
