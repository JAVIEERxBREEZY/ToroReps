import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { UserRole } from '../../../generated/prisma/client.js';
import type { AuthRequest } from '../models/types/auth-request.type.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<AuthRequest>();

    if (!user) throw new UnauthorizedException();
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Se requiere el rol ADMIN.');
    }

    return true;
  }
}
