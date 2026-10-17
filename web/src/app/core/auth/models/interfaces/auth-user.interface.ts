import type { UserRole } from '../types/user-role.type';

export interface AuthUser {
  readonly id          : string;
  readonly displayName : string;
  readonly role        : UserRole;
  readonly timezone    : string;
  readonly createdAt   : string;
}
