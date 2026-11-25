import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHasher, TokenService } from '@nestjs/authentication';
import { AuditLogsService } from '../services/audit-logs.service.js';
import type { NewClientAccountProfile } from '../services/clients.service.js';
import { ClientsService } from '../services/clients.service.js';
import type { NewLawyerAccountProfile } from '../services/lawyers.service.js';
import { LawyersService } from '../services/lawyers.service.js';
import { UsersService } from '../services/users.service.js';
import { EmailVerificationService } from './email-verification.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly lawyersService: LawyersService,
    private readonly clientsService: ClientsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async registerLawyer(
    email: string,
    password: string,
    profile: NewLawyerAccountProfile,
  ) {
    const normalizedEmail = normalizeEmail(email);
    await this.ensureEmailAvailable(normalizedEmail);
    const passwordHash = await this.passwordHasher.hash(password);
    let result: Awaited<ReturnType<LawyersService['createAccount']>>;
    try {
      result = await this.lawyersService.createAccount(
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
      metadata: { role: 'lawyer' },
    });

    const verificationEmailSent =
      await this.emailVerification.send(normalizedEmail);
    return {
      user: withoutPasswordHash(result.user),
      profile: result.profile,
      verificationEmailSent,
    };
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

    await this.auditLogsService.record({
      actorUserId: account.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: account.id,
    });

    const user = await this.usersService.findById(account.id);
    if (user?.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.tokenService.issue(account.id, {
      method: 'password',
    });

    return { ...tokens, user };
  }

  async resendVerificationEmail(email: string) {
    await this.emailVerification.send(normalizeEmail(email));
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
