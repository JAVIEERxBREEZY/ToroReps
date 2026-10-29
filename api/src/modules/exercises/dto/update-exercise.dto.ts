import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

import {
  ExerciseEquipmentType,
  ExerciseLoadMode,
  ExerciseMeasurementMode,
} from '../../../generated/prisma/client.js';
import { TrimString } from './catalog-validation.js';
import { ExerciseRelationsDto } from './exercise-relations.dto.js';

export class UpdateExerciseDto extends ExerciseRelationsDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ExerciseEquipmentType)
  equipmentType?: ExerciseEquipmentType;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ExerciseMeasurementMode)
  measurementMode?: ExerciseMeasurementMode;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ExerciseLoadMode)
  loadMode?: ExerciseLoadMode;

  @IsOptional()
  @IsString()
  loadNote?: string | null;
}
