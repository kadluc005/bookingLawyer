import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHasher, TokenService } from '@nestjs/authentication';
import { AuditLogsService } from '../services/audit-logs.service.js';
import type { NewClientAccountProfile } from '../services/clients.service.js';
import { ClientsService } from '../services/clients.service.js';
import { LawyerWorkflowMailService } from '../mail/lawyer-workflow-mail.service.js';
import { UsersService } from '../services/users.service.js';
import { EmailVerificationService } from './email-verification.service.js';

const TEMPORARY_PASSWORD_LIFETIME = 24 * 60 * 60 * 1000;
const RESEND_DELAY = 60_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly clientsService: ClientsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly emailVerification: EmailVerificationService,
    private readonly workflowMail: LawyerWorkflowMailService,
  ) {}

  async registerLawyer(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const password = randomBytes(20).toString('base64url');
    const hash = await this.passwordHasher.hash(password);
    const expiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_LIFETIME);
    const user = await this.usersService.createLawyerLogin(normalizedEmail, hash, expiresAt);
    if (!user) return;

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'account.registered',
      entityType: 'user',
      entityId: user.id,
      metadata: { role: 'lawyer' },
    });
    await this.sendTemporaryPassword(user.id, normalizedEmail, password, hash);
  }

  async registerClient(
    email: string,
    password: string,
    profile: NewClientAccountProfile,
  ) {
    const normalizedEmail = normalizeEmail(email);
    await this.ensureEmailAvailable(normalizedEmail);
    const passwordHash = await this.passwordHasher.hash(password);
    let result: Awaited<ReturnType<ClientsService['createAccount']>>;
    try {
      result = await this.clientsService.createAccount(
        { email: normalizedEmail, passwordHash },
        profile,
      );
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new ConflictException('Email is already registered.');
      }
      throw error;
    }

    await this.auditLogsService.record({
      actorUserId: result.user.id,
      action: 'account.registered',
      entityType: 'user',
      entityId: result.user.id,
      metadata: { role: 'client' },
    });

    return {
      user: withoutPasswordHash(result.user),
      profile: result.profile,
    };
  }

  async signIn(email: string, password: string) {
    const account = await this.usersService.findCredentialsByEmail(
      normalizeEmail(email),
    );
    const passwordMatches = await this.passwordHasher.verify(
      password,
      account?.passwordHash,
    );

    if (!account || !passwordMatches || account.status === 'suspended') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (account.status === 'pending_email_verification') {
      if (account.temporaryPasswordExpiresAt) {
        if (account.temporaryPasswordExpiresAt <= new Date()) {
          throw new ForbiddenException('Le mot de passe temporaire a expiré. Demandez de nouveaux identifiants.');
        }
        return { passwordChangeRequired: true as const };
      }
      throw new ForbiddenException(
        'Confirmez votre adresse e-mail avant de vous connecter.',
      );
    }

    if (this.passwordHasher.needsRehash(account.passwordHash)) {
      await this.usersService.updatePasswordHash(
        account.id,
        await this.passwordHasher.hash(password),
      );
    }

    return this.issueSession(account.id);
  }

  async changeTemporaryPassword(email: string, password: string, newPassword: string) {
    const account = await this.usersService.findCredentialsByEmail(normalizeEmail(email));
    const passwordMatches = await this.passwordHasher.verify(password, account?.passwordHash);
    if (
      !account ||
      !passwordMatches ||
      account.role !== 'lawyer' ||
      account.status !== 'pending_email_verification' ||
      !account.temporaryPasswordExpiresAt ||
      account.temporaryPasswordExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Identifiants temporaires invalides ou expirés.');
    }
    if (newPassword === password) {
      throw new BadRequestException('Choisissez un mot de passe différent du mot de passe temporaire.');
    }
    const hash = await this.passwordHasher.hash(newPassword);
    const changed = await this.usersService.completeTemporaryLogin(account, hash);
    if (!changed) throw new UnauthorizedException('Identifiants temporaires invalides ou expirés.');
    return this.issueSession(changed.id);
  }

  private async issueSession(userId: string) {
    const user = await this.usersService.findById(userId);
    if (user?.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    await this.auditLogsService.record({
      actorUserId: userId,
      action: 'auth.login',
      entityType: 'user',
      entityId: userId,
    });
    const tokens = await this.tokenService.issue(userId, { method: 'password' });
    return { ...tokens, user };
  }

  async resendVerificationEmail(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const account = await this.usersService.findCredentialsByEmail(normalizedEmail);
    if (!account || account.role !== 'lawyer' || account.status !== 'pending_email_verification') return;
    if (!account.temporaryPasswordExpiresAt) {
      await this.emailVerification.send(normalizedEmail);
      return;
    }
    const now = Date.now();
    if (account.temporaryPasswordExpiresAt.getTime() > now + TEMPORARY_PASSWORD_LIFETIME - RESEND_DELAY) return;
    const password = randomBytes(20).toString('base64url');
    const hash = await this.passwordHasher.hash(password);
    const rotated = await this.usersService.rotateTemporaryPassword(
      account, hash, new Date(now + TEMPORARY_PASSWORD_LIFETIME),
    );
    if (rotated) await this.sendTemporaryPassword(rotated.id, normalizedEmail, password, hash);
  }

  private async sendTemporaryPassword(id: string, email: string, password: string, hash: string) {
    const sent = await this.workflowMail.send('credentials', email, { email, password });
    if (!sent) await this.usersService.expireTemporaryPassword(id, hash);
  }

  private async ensureEmailAvailable(email: string) {
    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('Email is already registered.');
    }
  }
}

function normalizeEmail(email: string) {
  return email.trim().normalize('NFC').toLowerCase();
}

function isEmailUniqueViolation(
  error: unknown,
): error is Error & { code: string; constraint: string } {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'users_email_lower_unique'
  );
}

function withoutPasswordHash<T extends { passwordHash: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}
