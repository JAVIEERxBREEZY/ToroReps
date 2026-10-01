import type { User } from "../../../../generated/prisma/client.js";

export type UserSummary = Pick<
  User,
  'id' | 'displayName' | 'role' | 'timezone' | 'createdAt'
>;