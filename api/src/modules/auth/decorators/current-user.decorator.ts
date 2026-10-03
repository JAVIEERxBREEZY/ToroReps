import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { UserSummary } from '../../users/models/types/user.types.js';
import type { AuthRequest } from '../models/types/auth-request.type.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserSummary => {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    if (!request.user) throw new UnauthorizedException();

    return request.user;
  }
);