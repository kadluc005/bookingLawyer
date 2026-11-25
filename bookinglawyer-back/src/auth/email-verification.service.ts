import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Mailer } from '@nestjs/mail';
import { and, eq, gt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { emailVerifications, users } from '../database/schema.js';
import { getFrontendOrigin } from '../mail/frontend-origin.js';

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_DELAY_MS = 60_000;
const PENDING = 'pending_email_verification';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly frontendOrigin: string;

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly mailer: Mailer,
    config: ConfigService,
  ) {
    this.frontendOrigin = getFrontendOrigin(config);
  }

  async send(email: string): Promise<boolean> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const recipient = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(
          and(
            eq(users.role, 'lawyer'),
            eq(users.status, PENDING),
            sql`lower(${users.email}) = ${email}`,
          ),
        )
        .for('update');
      if (!user) return null;

      const now = Date.now();
      const [existing] = await tx
        .select({ expiresAt: emailVerifications.expiresAt })
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, user.id));
      if (
        existing &&
        existing.expiresAt.getTime() > now + TOKEN_LIFETIME_MS - RESEND_DELAY_MS
      ) {
        return null;
      }

      const expiresAt = new Date(now + TOKEN_LIFETIME_MS);
      await tx
        .insert(emailVerifications)
        .values({ userId: user.id, tokenHash, expiresAt })
        .onConflictDoUpdate({
          target: emailVerifications.userId,
          set: { tokenHash, expiresAt },
        });
      return user;
    });
    if (!recipient) return false;

    const link = new URL('/verification-email', this.frontendOrigin);
    link.hash = token;
    try {
      await this.mailer.send({
        to: recipient.email,
        subject: 'Confirmez votre adresse e-mail BookingLawyer',
        template: 'confirmation-email',
        context: {
          title: 'Confirmez votre adresse e-mail',
          preheader: 'Activez votre compte avocat BookingLawyer. Le lien est valable 24 heures.',
          actionUrl: link.href,
          actionLabel: 'Confirmer mon adresse e-mail',
        },
      });
      return true;
    } catch {
      this.logger.warn('Verification email delivery failed.');
      await this.db
        .delete(emailVerifications)
        .where(eq(emailVerifications.tokenHash, tokenHash));
      return false;
    }
  }

  async confirm(token: string) {
    const tokenHash = hashToken(token);
    await this.db.transaction(async (tx) => {
      const [verification] = await tx
        .select({ userId: users.id })
        .from(emailVerifications)
        .innerJoin(users, eq(users.id, emailVerifications.userId))
        .where(
          and(
            eq(emailVerifications.tokenHash, tokenHash),
            eq(users.status, PENDING),
          ),
        )
        .for('update', { of: users });
      if (!verification) throw invalidToken();

      const now = new Date();
      const [consumed] = await tx
        .delete(emailVerifications)
        .where(
          and(
            eq(emailVerifications.tokenHash, tokenHash),
            gt(emailVerifications.expiresAt, now),
          ),
        )
        .returning({ userId: emailVerifications.userId });
      if (!consumed) throw invalidToken();

      await tx
        .update(users)
        .set({ status: 'active', emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, verification.userId));
    });
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function invalidToken() {
  return new BadRequestException(
    'Ce lien de confirmation est invalide ou a expiré.',
  );
}
