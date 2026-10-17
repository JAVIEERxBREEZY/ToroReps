import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, provideAppInitializer  } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/services/auth-session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAppInitializer(() =>
      inject(AuthSessionService).restoreSession(),
    )
  ]
};
