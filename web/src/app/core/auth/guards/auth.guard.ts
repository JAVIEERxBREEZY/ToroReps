import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthSessionService } from '../services/auth-session.service';

export const authGuard: CanActivateFn = async () => {

  const session = inject(AuthSessionService);
  const router = inject(Router);

  await session.ensureSession();

  if ( session.isAuthenticated() ) return true;

  return router.createUrlTree([
    session.status() === 'anonymous'
      ? '/login'
      : '/session-unavailable'
  ]);
};
