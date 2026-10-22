import { HttpBackend, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { type ApplicationRef, ErrorHandler } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { appConfig } from './app.config';
import type { AuthUser } from './core/auth/models/interfaces/auth-user.interface';
import { AuthSessionService } from './core/auth/services/auth-session.service';

const user: AuthUser = {
  id: 'user-1',
  displayName: 'Javier',
  role: 'USER',
  timezone: 'Europe/Madrid',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('Arranque con la configuración real', () => {
  let application: ApplicationRef | undefined;
  let host: HTMLElement | undefined;

  afterEach(() => {
    application?.destroy();
    host?.remove();
    window.history.replaceState(null, '', '/');
  });

  it.each([
    {
      initialUrl: '/',
      status: 401,
      expectedStatus: 'anonymous',
      expectedUrl: '/login',
      selector: 'toro-login',
    },
    {
      initialUrl: '/',
      status: 500,
      expectedStatus: 'unavailable',
      expectedUrl: '/session-unavailable',
      selector: 'toro-session-unavailable',
    },
    {
      initialUrl: '/',
      status: 0,
      expectedStatus: 'unavailable',
      expectedUrl: '/session-unavailable',
      selector: 'toro-session-unavailable',
    },
    {
      initialUrl: '/',
      status: 200,
      expectedStatus: 'authenticated',
      expectedUrl: '/main',
      selector: 'toro-main',
    },
    {
      initialUrl: '/login',
      status: 200,
      expectedStatus: 'authenticated',
      expectedUrl: '/main',
      selector: 'toro-main',
    },
  ])(
    'muestra $expectedUrl desde $initialUrl cuando la sesión devuelve $status',
    async ({ initialUrl, status, expectedStatus, expectedUrl, selector }) => {
      const errors: unknown[] = [];
      const backend = {
        handle: vi
          .fn()
          .mockReturnValue(
            status === 200
              ? of(new HttpResponse({ body: user }))
              : throwError(() => new HttpErrorResponse({ status })),
          ),
      };

      window.history.replaceState(null, '', initialUrl);
      host = document.createElement('app-root');
      document.body.append(host);

      // Conserva el inicializador, los guards, el interceptor y las rutas de producción.
      application = await bootstrapApplication(App, {
        providers: [
          ...appConfig.providers,
          { provide: HttpBackend, useValue: backend },
          {
            provide: ErrorHandler,
            useValue: { handleError: (error: unknown) => errors.push(error) },
          },
        ],
      });

      await application.whenStable();

      expect(backend.handle).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ method: 'GET', url: '/api/auth/me' }),
      );
      expect(application.injector.get(AuthSessionService).status()).toBe(expectedStatus);
      expect(errors).toEqual([]);
      expect(application.injector.get(Router).url).toBe(expectedUrl);
      expect(host.querySelector(selector)).not.toBeNull();
      expect(host.querySelector('h1')?.textContent?.trim()).toBeTruthy();
    },
  );
});
