import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { CryptographyModule } from '../../infrastructure/cryptography/cryptography.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module.js';
import { AuthSessionService } from './services/auth-session.service.js';

@Module({
  imports: [ 
    CryptographyModule,
    PrismaModule, 
    UsersModule,
  ],
  controllers: [
    AuthController 
  ],
  providers: [ 
    AuthService,
    AuthSessionService,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard
    }
  ]
})
export class AuthModule {}