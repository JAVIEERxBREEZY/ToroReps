import type { User } from "../../../../generated/prisma/client.js";

export type UserSummary = Pick<
  User,
  'id' | 'displayName' | 'role' | 'timezone' | 'createdAt'
>;

export type UserWithCredentials = UserSummary &
  Pick<User, 'passwordHash'>;