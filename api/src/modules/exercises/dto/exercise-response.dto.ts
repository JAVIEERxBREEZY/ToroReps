import type {
  CloudinaryDeliveryType,
  ExerciseEquipmentType,
  ExerciseLoadMode,
  ExerciseMeasurementMode,
  ExerciseMediaType,
  ExerciseMuscleRole,
} from '../../../generated/prisma/client.js';

export class ExerciseMediaResponseDto {
  id!: string;
  type!: ExerciseMediaType;
  cloudinaryCloudName!: string;
  cloudinaryPublicId!: string;
  cloudinaryDeliveryType!: CloudinaryDeliveryType;
  cloudinaryVersion!: string | null;
  cloudinaryFormat!: string | null;
  position!: number;
  altText!: string | null;
  url!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class ExerciseResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  equipmentType!: ExerciseEquipmentType;
  measurementMode!: ExerciseMeasurementMode;
  loadMode!: ExerciseLoadMode;
  loadNote!: string | null;
  archivedAt!: string | null;
  createdAt!: string;
  updatedAt!: string;
  muscles!: {
    muscleGroupId: string;
    role: ExerciseMuscleRole;
    muscleGroup: { id: string; name: string; slug: string };
  }[];
  media!: ExerciseMediaResponseDto[];
}

export class ExercisePageResponseDto {
  items!: ExerciseResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
}
