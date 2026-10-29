import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma/prisma.module.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { ExercisesController } from './exercises.controller.js';
import { CloudinaryUrlService } from './services/cloudinary-url.service.js';
import { ExercisesService } from './services/exercises.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ExercisesController],
  providers: [AdminGuard, CloudinaryUrlService, ExercisesService],
})
export class ExercisesModule {}
