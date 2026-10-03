import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { parseCookie } from 'cookie';

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { SESSION_COOKIE_NAME } from '../models/constants/session.constants.js';
import { AuthService } from '../services/auth.service.js';
import type { AuthRequest } from '../models/types/auth-request.type.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const cookies = parseCookie(request.headers.cookie ?? '');
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    request.user = await this.auth.getCurrentUser(sessionToken);

    return true;
  }
}