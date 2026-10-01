import { Injectable } from '@nestjs/common';
import { PasswordHasherService } from '../../infrastructure/cryptography/services/password-hasher.service.js';
import { EmailProtectionService } from '../../infrastructure/cryptography/services/email-protection.service.js';
import { UsersService } from '../users/users.service.js';
import type { UserSummary } from '../users/models/types/user-summary.type.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {

  constructor(
    private readonly users: UsersService,
    private readonly emailProtection: EmailProtectionService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

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
  
}