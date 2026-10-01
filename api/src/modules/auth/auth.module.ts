import { Module } from '@nestjs/common';
import { CryptographyModule } from '../../infrastructure/cryptography/cryptography.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [ 
    UsersModule, CryptographyModule 
  ],
  controllers: [ 
    AuthController 
  ],
  providers: [ 
    AuthService
  ]
})
export class AuthModule {}