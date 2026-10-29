import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { CloudinaryUrlService } from './cloudinary-url.service.js';
import { ExercisesService } from './exercises.service.js';

describe('Errores del catálogo', () => {
  it.each([
    ['23514', BadRequestException],
    ['23503', BadRequestException],
    ['23505', ConflictException],
  ] as const)(
    'traduce SQLSTATE %s conservado en P2039',
    async (originalCode, exception) => {
      const failure = new Prisma.PrismaClientKnownRequestError(
        'Datos internos de PostgreSQL',
        {
          code: 'P2039',
          clientVersion: '7.10.1',
          meta: { driverAdapterError: { cause: { originalCode } } },
        },
      );
      const prisma = {
        exercise: { findFirst: vi.fn().mockRejectedValue(failure) },
      } as unknown as PrismaService;
      const service = new ExercisesService(prisma, new CloudinaryUrlService());

      await expect(
        service.findOne('d2a01b71-94f4-480c-82d8-f4fa8129935a'),
      ).rejects.toBeInstanceOf(exception);
    },
  );

  it.each([
    ['P2002', ConflictException],
    ['P2003', BadRequestException],
    ['P2004', BadRequestException],
    ['P2025', NotFoundException],
    ['P2034', ConflictException],
    ['P2024', ServiceUnavailableException],
  ] as const)(
    'traduce %s sin revelar el error interno',
    async (code, exception) => {
      const failure = new Prisma.PrismaClientKnownRequestError(
        'SQL interno confidencial',
        { code, clientVersion: '7.10.1' },
      );
      const prisma = {
        exercise: { findFirst: vi.fn().mockRejectedValue(failure) },
      } as unknown as PrismaService;
      const service = new ExercisesService(prisma, new CloudinaryUrlService());

      try {
        await service.findOne('d2a01b71-94f4-480c-82d8-f4fa8129935a');
        expect.unreachable('Debía traducir el error');
      } catch (error) {
        expect(error).toBeInstanceOf(exception);
        expect(String(error)).not.toContain('SQL interno');
        expect(String(error)).not.toContain(code);
      }
    },
  );
});
