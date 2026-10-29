import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  CloudinaryDeliveryType,
  ExerciseMediaType,
  ExerciseMuscleRole,
} from '../../../generated/prisma/client.js';
import {
  IsCloudinaryPublicId,
  IsCloudinaryVersion,
} from './catalog-validation.js';

export class ExerciseMuscleInputDto {
  @IsUUID()
  muscleGroupId!: string;

  @IsEnum(ExerciseMuscleRole)
  role!: ExerciseMuscleRole;
}

export class ExerciseMediaInputDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  id?: string;

  @IsEnum(ExerciseMediaType)
  type!: ExerciseMediaType;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  cloudinaryCloudName!: string;

  @IsCloudinaryPublicId()
  cloudinaryPublicId!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(CloudinaryDeliveryType)
  cloudinaryDeliveryType?: CloudinaryDeliveryType;

  @IsOptional()
  @IsCloudinaryVersion()
  cloudinaryVersion?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]+$/)
  cloudinaryFormat?: string | null;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  position!: number;

  @IsOptional()
  @IsString()
  altText?: string | null;
}

export class ExerciseRelationsDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique((muscle: ExerciseMuscleInputDto) => muscle?.muscleGroupId)
  @ValidateNested({ each: true })
  @Type(() => ExerciseMuscleInputDto)
  muscles?: ExerciseMuscleInputDto[];

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique((media: ExerciseMediaInputDto) => media?.position)
  @ValidateNested({ each: true })
  @Type(() => ExerciseMediaInputDto)
  media?: ExerciseMediaInputDto[];
}
