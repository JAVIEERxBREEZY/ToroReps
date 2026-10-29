import {
  BadRequestException, Body, Controller, Get, Header,
  HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards
} from '@nestjs/common';

import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CreateExerciseDto } from './dto/create-exercise.dto.js';
import { ListExercisesQueryDto } from './dto/list-exercises-query.dto.js';
import { UpdateExerciseDto } from './dto/update-exercise.dto.js';
import { ExercisesService } from './services/exercises.service.js';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  findAll(@Query() query: ListExercisesQueryDto) {
    return this.exercises.findAll(query);
  }

  @Get('discover')
  @Header('Cache-Control', 'no-store')
  discover(@Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) {
      throw new BadRequestException(
        'Discover no admite paginación ni filtros.',
      );
    }

    return this.exercises.discover();
  }

  @Get('options')
  @Header('Cache-Control', 'no-store')
  options() {
    return this.exercises.options();
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercises.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Body() input: CreateExerciseDto) {
    return this.exercises.create(input);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateExerciseDto,
  ) {
    return this.exercises.update(id, input);
  }

  @UseGuards(AdminGuard)
  @Post(':id/archive')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercises.archive(id);
  }
}
