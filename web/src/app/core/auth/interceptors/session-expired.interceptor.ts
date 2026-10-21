import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';

import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { REQUIRES_AUTH } from '../http/requires-auth.token';
import { AuthSessionService } from '../services/auth-session.service';

export const sessionExpiredInterceptor: HttpInterceptorFn = ( request, next) => {

  // Login, restauración y logout interpretan sus propios errores.
  if ( !request.url.startsWith('/api/') || !request.context.get(REQUIRES_AUTH) ) {
    return next(request);
  }

  const session = inject(AuthSessionService);
  const router = inject(Router);
  const version = session.version;

  return next(request).pipe(
    tap({
      error: (error: unknown) => {
        if ( error instanceof HttpErrorResponse && error.status === 401 && session.expireSession(version) ) {
          void router.navigate(['/login'], {
            replaceUrl: true,
            queryParams: { reason: 'expired' }
          });
        }
      },
    }),
  );
};
