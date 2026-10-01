import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma, UserRole } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { UserSummary, UserWithCredentials } from './models/types/user.types.js';
import { CreateUserInput } from './models/interfaces/create-user-input.interface.js';

@Injectable()
export class UsersService {

  constructor(private readonly prisma: PrismaService) { }

  async create(input: CreateUserInput): Promise<UserSummary> {
    try {
      return await this.prisma.user.create({
        data: {
          emailEncrypted: input.emailEncrypted,
          emailLookupHash: input.emailLookupHash,
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          role: UserRole.USER
        },
        select: {
          id: true,
          displayName: true,
          role: true,
          timezone: true,
          createdAt: true
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un usuario con esos datos.',
        );
      }

      throw error;
    }
  }

  findForAuthentication(
    emailLookupHash: string,
  ): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({
      where: {
        emailLookupHash
      },
      select: {
        id: true,
        displayName: true,
        role: true,
        timezone: true,
        createdAt: true,
        passwordHash: true
      }
    });
  }

}