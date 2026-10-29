import { Prisma } from '../../../../generated/prisma/client.js';

export const EXERCISE_INCLUDE = {
  muscles: {
    orderBy: [{ role: 'asc' }, { muscleGroupId: 'asc' }],
    include: { muscleGroup: { select: { id: true, name: true, slug: true } } },
  },
  media: { orderBy: { position: 'asc' } },
} satisfies Prisma.ExerciseInclude;

export const DISCOVER_EXERCISE_LIMIT = 5;
