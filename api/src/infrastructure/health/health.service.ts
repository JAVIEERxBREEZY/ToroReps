import { Injectable } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

const DATABASE_CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly database: PrismaHealthIndicator,
        private readonly healthCheck: HealthCheckService
    ) {}

    checkReadiness(): Promise<HealthCheckResult> {
    return this.healthCheck.check([
      () =>
        this.database
          .pingCheck('database', this.prisma)
          .withTimeout(DATABASE_CHECK_TIMEOUT_MS),
    ]);
  }

}
