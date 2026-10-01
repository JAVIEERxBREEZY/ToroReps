import { Module } from '@nestjs/common';
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
    AuthSessionService
  ]
})
export class AuthModule {}