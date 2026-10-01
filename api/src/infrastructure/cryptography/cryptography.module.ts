import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailProtectionService } from './services/email-protection.service.js';
import { PasswordHasherService } from './services/password-hasher.service.js';

@Module({
  imports : [
    ConfigModule
  ],
  providers: [
    PasswordHasherService,
    EmailProtectionService
  ],
  exports: [
    PasswordHasherService,
    EmailProtectionService
  ]
})
export class CryptographyModule {}