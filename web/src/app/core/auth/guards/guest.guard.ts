import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthSessionService } from '../services/auth-session.service';

export const guestGuard: CanActivateFn = async () => {

  const session = inject(AuthSessionService);
  const router = inject(Router);

  await session.ensureSession();

  if (session.isAuthenticated()) return router.createUrlTree(['/main']);

  if (session.status() === 'anonymous') return true;

  return router.createUrlTree(['/session-unavailable']);
};
