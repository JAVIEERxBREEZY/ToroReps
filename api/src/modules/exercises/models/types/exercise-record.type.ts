import type { Prisma } from '../../../../generated/prisma/client.js';
import type { EXERCISE_INCLUDE } from '../constants/exercise-query.constants.js';

export type ExerciseRecord = Prisma.ExerciseGetPayload<{
  include: typeof EXERCISE_INCLUDE;
}>;
