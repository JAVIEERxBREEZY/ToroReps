import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import {
  ExerciseEquipmentType,
  ExerciseLoadMode,
  ExerciseMeasurementMode,
} from '../../../generated/prisma/client.js';
import { TrimString } from './catalog-validation.js';
import { ExerciseRelationsDto } from './exercise-relations.dto.js';

export class CreateExerciseDto extends ExerciseRelationsDto {
  @TrimString()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(ExerciseEquipmentType)
  equipmentType!: ExerciseEquipmentType;

  @IsEnum(ExerciseMeasurementMode)
  measurementMode!: ExerciseMeasurementMode;

  @IsEnum(ExerciseLoadMode)
  loadMode!: ExerciseLoadMode;

  @IsOptional()
  @IsString()
  loadNote?: string | null;
}
