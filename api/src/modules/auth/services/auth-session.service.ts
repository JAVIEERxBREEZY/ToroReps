import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { UserSummary } from '../../users/models/types/user.types.js';
import { SESSION_TTL_SECONDS, SESSION_COOKIE_NAME } from '../models/constants/session.constants.js';
import { CreatedSession } from '../models/interfaces/created-session.interface.js';

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class AuthSessionService {
    
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<CreatedSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_SECONDS * 1_000,
    );

    await this.prisma.authSession.create({
      data: {
        tokenHash: this.hashToken(token),
        userId,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
    };
  }

  async findUser(token: string): Promise<UserSummary | null> {
    if (!SESSION_TOKEN_PATTERN.test(token)) {
      return null;
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            role: true,
            timezone: true,
            createdAt: true,
          },
        },
      },
    });

    return session?.user ?? null;
  }

  async revoke(token: string): Promise<void> {
    if (!SESSION_TOKEN_PATTERN.test(token)) {
      return;
    }

    await this.prisma.authSession.deleteMany({
      where: {
        tokenHash: this.hashToken(token),
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

}