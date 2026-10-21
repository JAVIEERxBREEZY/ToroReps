import { type ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';

import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/services/auth-session.service';
import { sessionExpiredInterceptor } from './core/auth/interceptors/session-expired.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHttpClient(
      withInterceptors([sessionExpiredInterceptor]),
    ),

    provideAppInitializer(() =>
      inject(AuthSessionService).restoreSession(),
    )
  ],
};
