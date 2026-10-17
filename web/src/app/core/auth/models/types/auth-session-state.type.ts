import type { AuthUser } from '../interfaces/auth-user.interface';

export type AuthSessionState =
  | {
      readonly status: 'unknown' | 'loading' | 'anonymous' | 'unavailable';
      readonly user: null;
    }
  | {
      readonly status: 'authenticated';
      readonly user: AuthUser;
    };
