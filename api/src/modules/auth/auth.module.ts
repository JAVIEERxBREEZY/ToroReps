import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

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
    ThrottlerModule.forRoot({
      throttlers: [{
        name: 'default',
        ttl: minutes(1),
        limit: 5,
        blockDuration: minutes(1)
      }],
      errorMessage: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.'
    })
  ],
  controllers: [
    AuthController 
  ],
  providers: [ 
    AuthService,
    AuthSessionService,
    ThrottlerGuard,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard
    }
  ]
})
export class AuthModule {}