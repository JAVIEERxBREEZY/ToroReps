import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import { ExerciseEquipmentType } from '../../../generated/prisma/client.js';
import { TrimString } from './catalog-validation.js';

export class ListExercisesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotEmpty()
  search?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  muscleGroupId?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ExerciseEquipmentType)
  equipmentType?: ExerciseEquipmentType;
}
