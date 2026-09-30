import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports : [PrismaModule],
  providers: [HealthService],
  controllers: [HealthController]
})
export class HealthModule {}
