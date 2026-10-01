import { Body, Controller, Header, Post } from '@nestjs/common';
import type { UserSummary } from '../users/models/types/user-summary.type.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {

  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Header('Cache-Control', 'no-store')
  register(@Body() input: RegisterDto): Promise<UserSummary> {
    return this.auth.register(input);
  }
  
}