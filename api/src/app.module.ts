import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './infrastructure/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ExercisesModule } from './modules/exercises/exercises.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal : true }), // cargamos api/.env
    AuthModule,
    ExercisesModule,
    HealthModule,
    PrismaModule
  ],
  controllers: [ 
    AppController 
  ],
  providers: [ 
    AppService 
  ]
})
export class AppModule {}
