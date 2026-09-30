import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { TerminusModule } from '@nestjs/terminus';
import { HealthUnavailableFilter } from './health-unavailable.filter.js';

@Module({
  imports : [PrismaModule, TerminusModule],
  providers: [HealthService, HealthUnavailableFilter],
  controllers: [HealthController]
})
export class HealthModule {}
