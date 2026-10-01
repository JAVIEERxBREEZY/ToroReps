import { Body, Controller, Header, Post, Cookies, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import type { UserSummary } from '../users/models/types/user.types.js';
import { AuthService } from './services/auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from './models/constants/session.constants.js';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly adapterHost: HttpAdapterHost
  ) {}


  @Post('register')
  @Header('Cache-Control', 'no-store')
  register(@Body() input: RegisterDto): Promise<UserSummary> {
    return this.auth.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: unknown
  ): Promise<UserSummary> {

    const result = await this.auth.login(input);

    this.adapterHost.httpAdapter.setCookie(
      response,
      SESSION_COOKIE_NAME,
      result.sessionToken,
      {
        httpOnly: true,
        secure: this.isProduction(),
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_SECONDS
      }
    );

    return result.user;
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  getCurrentUser(
    @Cookies(SESSION_COOKIE_NAME) sessionToken?: string
  ): Promise<UserSummary> {
    return this.auth.getCurrentUser(sessionToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  async logout(
    @Cookies(SESSION_COOKIE_NAME) sessionToken: string | undefined,
    @Res({ passthrough: true }) response: unknown
  ): Promise<void> {

    await this.auth.logout(sessionToken);

    this.adapterHost.httpAdapter.clearCookie(
      response,
      SESSION_COOKIE_NAME,
      {
        httpOnly: true,
        secure: this.isProduction(),
        sameSite: 'lax',
        path: '/'
      }
    );
  }



  //#region PRIVATE METHODS 
  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
  //#endregion
}