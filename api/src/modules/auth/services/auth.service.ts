import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailProtectionService } from '../../../infrastructure/cryptography/services/email-protection.service.js';
import { PasswordHasherService } from '../../../infrastructure/cryptography/services/password-hasher.service.js';
import { UsersService } from '../../users/users.service.js';
import { AuthSessionService } from './auth-session.service.js';
import type { UserSummary, UserWithCredentials } from '../../users/models/types/user.types.js';
import type { RegisterDto } from '../dto/register.dto.js';
import type { LoginDto } from '../dto/login.dto.js';
import { LoginResult } from '../models/interfaces/login-result.interface.js';

@Injectable()
export class AuthService {

  constructor(
    private readonly users: UsersService,
    private readonly emailProtection: EmailProtectionService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessions: AuthSessionService
  ) { }

  async register(input: RegisterDto): Promise<UserSummary> {
    const protectedEmail = this.emailProtection.protect(input.email);
    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.users.create({
      emailEncrypted: protectedEmail.emailEncrypted,
      emailLookupHash: protectedEmail.emailLookupHash,
      passwordHash,
      displayName: input.displayName,
    });
  }

  async login(input: LoginDto): Promise<LoginResult> {

    const emailLookupHash = this.emailProtection.createLookupHash(input.email);

    const user = await this.users.findForAuthentication(emailLookupHash);

    if (!user) {
      await this.passwordHasher.hash(input.password);
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      input.password
    );

    if (!passwordMatches) throw new UnauthorizedException('Credenciales inválidas.');

    const session = await this.sessions.create(user.id);

    return {
      user: this.toUserSummary(user),
      sessionToken: session.token,
    };
  }

  async getCurrentUser(
    sessionToken: string | undefined,
  ): Promise<UserSummary> {
    if (!sessionToken) {
      throw new UnauthorizedException();
    }

    const user = await this.sessions.findUser(sessionToken);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (sessionToken) {
      await this.sessions.revoke(sessionToken);
    }
  }

  private toUserSummary(user: UserWithCredentials): UserSummary {
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }

}