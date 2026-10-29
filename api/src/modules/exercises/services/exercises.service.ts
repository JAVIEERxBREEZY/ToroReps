import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  CloudinaryDeliveryType,
  ExerciseEquipmentType,
  ExerciseLoadMode,
  ExerciseMeasurementMode,
  ExerciseMediaType,
  ExerciseMuscleRole,
  Prisma,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { CreateExerciseDto } from '../dto/create-exercise.dto.js';
import type {
  ExerciseMediaInputDto,
  ExerciseMuscleInputDto,
} from '../dto/exercise-relations.dto.js';
import type {
  ExercisePageResponseDto,
  ExerciseResponseDto,
} from '../dto/exercise-response.dto.js';
import type { ListExercisesQueryDto } from '../dto/list-exercises-query.dto.js';
import type { UpdateExerciseDto } from '../dto/update-exercise.dto.js';
import {
  DISCOVER_EXERCISE_LIMIT,
  EXERCISE_INCLUDE,
} from '../models/constants/exercise-query.constants.js';
import type { ExerciseRecord } from '../models/types/exercise-record.type.js';
import { CloudinaryUrlService } from './cloudinary-url.service.js';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryUrls: CloudinaryUrlService,
  ) {}

  // #region Consultas

  findAll(query: ListExercisesQueryDto): Promise<ExercisePageResponseDto> {
    return this.execute(async () => {
      const { page, limit, search, muscleGroupId, equipmentType } = query;
      const skip = (page - 1) * limit;
      if (!Number.isSafeInteger(skip) || skip > 2_147_483_647) {
        throw new BadRequestException(
          'La página solicitada excede el rango permitido.',
        );
      }

      const where: Prisma.ExerciseWhereInput = {
        archivedAt: null,
        equipmentType,
        name: search
          ? { contains: search.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' }
          : undefined,
        muscles: muscleGroupId ? { some: { muscleGroupId } } : undefined,
      };

      const result = await this.prisma.$transaction(
        async (tx) => {
          const items = await tx.exercise.findMany({
            where,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip,
            take: limit,
            include: EXERCISE_INCLUDE,
          });
          const total = await tx.exercise.count({ where });

          return { items, total };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );

      return {
        items: result.items.map((item) => this.toResponse(item)),
        page,
        limit,
        total: result.total,
      };
    });
  }

  discover(): Promise<ExerciseResponseDto[]> {
    return this.execute(async () => {
      const records = await this.prisma.$transaction(
        async (tx) => {
          // Se sortean identidades antes de cargar las relaciones, sin multiplicar las filas.
          const selected = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "exercises"
          WHERE "archived_at" IS NULL
          ORDER BY random()
          LIMIT ${DISCOVER_EXERCISE_LIMIT}
        `;
          if (!selected.length) return [];

          const exercises = await tx.exercise.findMany({
            where: {
              id: { in: selected.map((item) => item.id) },
              archivedAt: null,
            },
            include: EXERCISE_INCLUDE,
          });
          const byId = new Map(
            exercises.map((exercise) => [exercise.id, exercise]),
          );

          return selected.flatMap((item) => {
            const exercise = byId.get(item.id);
            return exercise ? [exercise] : [];
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );

      return records.map((record) => this.toResponse(record));
    });
  }

  findOne(id: string): Promise<ExerciseResponseDto> {
    return this.execute(async () => {
      const exercise = await this.prisma.exercise.findFirst({
        where: { id, archivedAt: null },
        include: EXERCISE_INCLUDE,
      });
      if (!exercise) throw new NotFoundException('Ejercicio no encontrado.');

      return this.toResponse(exercise);
    });
  }

  options() {
    return this.execute(async () => ({
      muscleGroups: await this.prisma.muscleGroup.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      equipmentTypes: Object.values(ExerciseEquipmentType),
      measurementModes: Object.values(ExerciseMeasurementMode),
      loadModes: Object.values(ExerciseLoadMode),
      muscleRoles: Object.values(ExerciseMuscleRole),
      mediaTypes: Object.values(ExerciseMediaType),
      cloudinaryDeliveryTypes: Object.values(CloudinaryDeliveryType),
    }));
  }

  // #endregion

  // #region Escrituras

  create(input: CreateExerciseDto): Promise<ExerciseResponseDto> {
    return this.execute(async () => {
      if (input.media?.some((media) => media.id !== undefined)) {
        throw new BadRequestException(
          'No se admite id multimedia al crear un ejercicio.',
        );
      }

      const exercise = await this.prisma.$transaction(async (tx) => {
        await this.validateMuscles(tx, input.muscles);

        return tx.exercise.create({
          data: {
            name: input.name,
            description: input.description,
            equipmentType: input.equipmentType,
            measurementMode: input.measurementMode,
            loadMode: input.loadMode,
            loadNote: input.loadNote,
            muscles: { create: input.muscles ?? [] },
            media: {
              create: (input.media ?? []).map((media) => this.mediaData(media)),
            },
          },
          include: EXERCISE_INCLUDE,
        });
      });

      return this.toResponse(exercise);
    });
  }

  update(id: string, input: UpdateExerciseDto): Promise<ExerciseResponseDto> {
    return this.execute(async () => {
      const exercise = await this.prisma.$transaction(async (tx) => {
        // Actualizar primero bloquea la fila y serializa cambios de galería y archivado.
        await tx.exercise.update({
          where: { id, archivedAt: null },
          data: {
            name: input.name,
            description: input.description,
            equipmentType: input.equipmentType,
            measurementMode: input.measurementMode,
            loadMode: input.loadMode,
            loadNote: input.loadNote,
            updatedAt: new Date(),
          },
          select: { id: true },
        });

        if (input.muscles !== undefined) {
          await this.validateMuscles(tx, input.muscles);
          await tx.exerciseMuscle.deleteMany({ where: { exerciseId: id } });
          await tx.exerciseMuscle.createMany({
            data: input.muscles.map((muscle) => ({
              exerciseId: id,
              muscleGroupId: muscle.muscleGroupId,
              role: muscle.role,
            })),
          });
        }

        if (input.media !== undefined)
          await this.replaceMedia(tx, id, input.media);

        return tx.exercise.findUniqueOrThrow({
          where: { id },
          include: EXERCISE_INCLUDE,
        });
      });

      return this.toResponse(exercise);
    });
  }

  archive(id: string): Promise<ExerciseResponseDto> {
    return this.execute(async () => {
      const exercise = await this.prisma.$transaction(async (tx) => {
        // Es idempotente: no cambia la primera fecha de archivado.
        await tx.exercise.updateMany({
          where: { id, archivedAt: null },
          data: { archivedAt: new Date() },
        });
        return tx.exercise.findUniqueOrThrow({
          where: { id },
          include: EXERCISE_INCLUDE,
        });
      });

      return this.toResponse(exercise);
    });
  }

  // #endregion

  // #region Relaciones y respuesta

  private async validateMuscles(
    tx: Prisma.TransactionClient,
    muscles?: ExerciseMuscleInputDto[],
  ): Promise<void> {
    if (!muscles?.length) return;

    const ids = muscles.map((muscle) => muscle.muscleGroupId);
    const count = await tx.muscleGroup.count({ where: { id: { in: ids } } });
    if (new Set(ids).size !== ids.length || count !== ids.length) {
      throw new BadRequestException(
        'Los grupos musculares deben existir y no repetirse.',
      );
    }
  }

  private async replaceMedia(
    tx: Prisma.TransactionClient,
    exerciseId: string,
    incoming: ExerciseMediaInputDto[],
  ): Promise<void> {
    const current = await tx.exerciseMedia.findMany({
      where: { exerciseId },
      select: { id: true, position: true },
    });
    const currentIds = new Set(current.map((media) => media.id));
    const retainedIds = incoming.flatMap((media) =>
      media.id ? [media.id] : [],
    );

    if (
      new Set(retainedIds).size !== retainedIds.length ||
      retainedIds.some((id) => !currentIds.has(id))
    ) {
      throw new BadRequestException(
        'Los id multimedia deben ser únicos y pertenecer al ejercicio.',
      );
    }
    if (
      new Set(incoming.map((media) => media.position)).size !== incoming.length
    ) {
      throw new BadRequestException(
        'Las posiciones multimedia no pueden repetirse.',
      );
    }

    await tx.exerciseMedia.deleteMany({
      where: { exerciseId, id: { notIn: retainedIds } },
    });

    // Posiciones temporales libres y no negativas permiten intercambiar las definitivas
    // sin perder los id ni infringir UNIQUE(exercise_id, position) o el CHECK de posición.
    const reserved = new Set([
      ...current.map((media) => media.position),
      ...incoming.map((media) => media.position),
    ]);
    let temporaryPosition = 0;

    for (const id of retainedIds) {
      while (reserved.has(temporaryPosition)) temporaryPosition += 1;
      await tx.exerciseMedia.update({
        where: { id, exerciseId },
        data: { position: temporaryPosition },
      });
      reserved.add(temporaryPosition);
    }

    for (const media of incoming) {
      const data = this.mediaData(media);
      if (media.id) {
        await tx.exerciseMedia.update({
          where: { id: media.id, exerciseId },
          data,
        });
      } else {
        await tx.exerciseMedia.create({ data: { exerciseId, ...data } });
      }
    }
  }

  private mediaData(media: ExerciseMediaInputDto) {
    return {
      type: media.type,
      cloudinaryCloudName: media.cloudinaryCloudName,
      cloudinaryPublicId: media.cloudinaryPublicId,
      cloudinaryDeliveryType:
        media.cloudinaryDeliveryType ?? CloudinaryDeliveryType.UPLOAD,
      cloudinaryVersion: media.cloudinaryVersion
        ? BigInt(media.cloudinaryVersion)
        : null,
      cloudinaryFormat: media.cloudinaryFormat ?? null,
      position: media.position,
      altText: media.altText ?? null,
    };
  }

  private toResponse(exercise: ExerciseRecord): ExerciseResponseDto {
    return {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      equipmentType: exercise.equipmentType,
      measurementMode: exercise.measurementMode,
      loadMode: exercise.loadMode,
      loadNote: exercise.loadNote,
      archivedAt: exercise.archivedAt?.toISOString() ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
      muscles: exercise.muscles.map((muscle) => ({
        muscleGroupId: muscle.muscleGroupId,
        role: muscle.role,
        muscleGroup: muscle.muscleGroup,
      })),
      media: exercise.media.map((media) => ({
        id: media.id,
        type: media.type,
        cloudinaryCloudName: media.cloudinaryCloudName,
        cloudinaryPublicId: media.cloudinaryPublicId,
        cloudinaryDeliveryType: media.cloudinaryDeliveryType,
        cloudinaryVersion: media.cloudinaryVersion?.toString() ?? null,
        cloudinaryFormat: media.cloudinaryFormat,
        position: media.position,
        altText: media.altText,
        url: this.cloudinaryUrls.resolve(media),
        createdAt: media.createdAt.toISOString(),
        updatedAt: media.updatedAt.toISOString(),
      })),
    };
  }

  // #endregion

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // El adaptador pg de Prisma 7 conserva algunos SQLSTATE dentro de P2039.
        // Se inspecciona el código estructurado, nunca el texto del error de SQL.
        if (error.code === 'P2039') {
          const code = this.postgresCode(error);
          if (['23505', '23001', '40001', '40P01'].includes(code ?? '')) {
            throw new ConflictException(
              'La operación entra en conflicto con los datos actuales.',
            );
          }
          if (
            ['23514', '23503', '23502', '22P02', '22003', '22021'].includes(
              code ?? '',
            )
          ) {
            throw new BadRequestException(
              'Las referencias o los datos del ejercicio no son válidos.',
            );
          }
        }
        switch (error.code) {
          case 'P2025':
            throw new NotFoundException('Ejercicio no encontrado.');
          case 'P2002':
            throw new ConflictException(
              'Los datos entran en conflicto con un registro existente.',
            );
          case 'P2003':
          case 'P2004':
            throw new BadRequestException(
              'Las referencias o los datos del ejercicio no son válidos.',
            );
          case 'P2034':
            throw new ConflictException(
              'El ejercicio cambió durante la operación. Vuelve a intentarlo.',
            );
          case 'P2024':
            throw new ServiceUnavailableException(
              'El catálogo no está disponible temporalmente.',
            );
        }
      }
      if (error instanceof Prisma.PrismaClientInitializationError) {
        throw new ServiceUnavailableException(
          'El catálogo no está disponible temporalmente.',
        );
      }

      throw error;
    }
  }

  private postgresCode(
    error: Prisma.PrismaClientKnownRequestError,
  ): string | undefined {
    const adapterError = error.meta?.['driverAdapterError'];
    if (
      !adapterError ||
      typeof adapterError !== 'object' ||
      !('cause' in adapterError)
    )
      return;

    const cause = adapterError.cause;
    if (
      cause &&
      typeof cause === 'object' &&
      'originalCode' in cause &&
      typeof cause.originalCode === 'string'
    ) {
      return cause.originalCode;
    }
  }
}
