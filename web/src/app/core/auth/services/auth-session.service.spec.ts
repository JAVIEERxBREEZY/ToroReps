import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../models/interfaces/auth-user.interface';
import { REQUIRES_AUTH } from '../http/requires-auth.token';
import { sessionExpiredInterceptor } from '../interceptors/session-expired.interceptor';
import { AuthSessionService } from './auth-session.service';

const user: AuthUser = {
  id: 'user-1',
  displayName: 'Javier',
  role: 'USER',
  timezone: 'Europe/Madrid',
  createdAt: '2026-01-01T00:00:00Z'
};

const credentials = { email: 'test@example.com', password: 'example-password' };

describe('Auth session and private HTTP requests', () => {
  let session: AuthSessionService;
  let http: HttpTestingController;
  let client: HttpClient;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([sessionExpiredInterceptor]),
        ),
        provideHttpClientTesting(),
      ],
    });

    session = TestBed.inject(AuthSessionService);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  async function authenticate(): Promise<void> {
    const task = session.restoreSession();

    await Promise.resolve();

    http.expectOne('/api/auth/me').flush(user);

    await task;
  }

  function privateRequest(
    url = '/api/private-example',
  ): Promise<unknown> {
    return firstValueFrom(
      client.get(url, {
        context: new HttpContext().set(REQUIRES_AUTH, true),
      }),
    ).catch((error: unknown) => error);
  }

  it('shares restoration and distinguishes an absent session', async () => {
    const first = session.restoreSession();

    expect(session.restoreSession()).toBe(first);

    await Promise.resolve();

    http.expectOne('/api/auth/me').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    await first;

    expect(session.status()).toBe('anonymous');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps failed restoration retryable and does not call it anonymous', async () => {
    const first = session.restoreSession();

    await Promise.resolve();

    http.expectOne('/api/auth/me').flush(null, {
      status: 503,
      statusText: 'Unavailable',
    });

    await first;

    expect(session.status()).toBe('unavailable');

    await authenticate();

    expect(session.user()).toEqual(user);
  });

  it('waits for restoration before login and trims only the email', async () => {
    const restore = session.restoreSession();

    const login = session.login({
      email: '  test@example.com  ',
      password: ' password with spaces ',
    });

    await Promise.resolve();

    http.expectNone('/api/auth/login');

    http.expectOne('/api/auth/me').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    await restore;
    await Promise.resolve();

    const request = http.expectOne('/api/auth/login');

    expect(request.request.body).toEqual({
      email: 'test@example.com',
      password: ' password with spaces ',
    });

    request.flush(user);

    await login;

    expect(session.isAuthenticated()).toBe(true);
  });

  it('does not treat a rejected login as global session expiry', async () => {
    const task = session
      .login(credentials)
      .catch((error: unknown) => error);

    await Promise.resolve();

    http.expectOne('/api/auth/login').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await task).toBeInstanceOf(HttpErrorResponse);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shares logout and clears the user only after success', async () => {
    await authenticate();

    const task = session.logout();

    expect(session.logout()).toBe(task);

    await Promise.resolve();

    const request = http.expectOne('/api/auth/logout');

    expect(request.request.method).toBe('POST');
    expect(session.user()).toEqual(user);

    request.flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await task;

    expect(session.state()).toEqual({
      status: 'anonymous',
      user: null,
    });
  });

  it('accepts an already expired session during logout', async () => {
    await authenticate();

    const task = session.logout();

    await Promise.resolve();

    http.expectOne('/api/auth/logout').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    await task;

    expect(session.status()).toBe('anonymous');
  });

  it.each([403, 500])(
    'keeps the user when logout returns %s and permits a retry',
    async status => {
      await authenticate();

      const task = session
        .logout()
        .catch((error: unknown) => error);

      await Promise.resolve();

      http.expectOne('/api/auth/logout').flush(null, {
        status,
        statusText: 'Error',
      });

      expect(await task).toBeInstanceOf(HttpErrorResponse);
      expect(session.user()).toEqual(user);

      const retry = session.logout();

      await Promise.resolve();

      http.expectOne('/api/auth/logout').flush(null);

      await retry;

      expect(session.status()).toBe('anonymous');
    },
  );

  it('keeps the user on a network failure during logout', async () => {
    await authenticate();

    const task = session
      .logout()
      .catch((error: unknown) => error);

    await Promise.resolve();

    http.expectOne('/api/auth/logout').error(
      new ProgressEvent('error'),
    );

    await task;

    expect(session.user()).toEqual(user);
  });

  it('serializes a new login behind logout', async () => {
    await authenticate();

    const logout = session.logout();
    const login = session.login(credentials);

    await Promise.resolve();

    http.expectNone('/api/auth/login');
    http.expectOne('/api/auth/logout').flush(null);

    await logout;
    await Promise.resolve();

    http.expectOne('/api/auth/login').flush({
      ...user,
      id: 'user-2',
    });

    await login;

    expect(session.user()?.id).toBe('user-2');
  });

  it('expires private requests once and keeps the HTTP error available to the caller', async () => {
    await authenticate();

    const first = privateRequest('/api/first');
    const second = privateRequest('/api/second');

    http.expectOne('/api/first').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    http.expectOne('/api/second').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await first).toBeInstanceOf(HttpErrorResponse);

    await second;

    expect(session.status()).toBe('anonymous');

    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(
      ['/login'],
      {
        replaceUrl: true,
        queryParams: {
          reason: 'expired',
        },
      },
    );
  });

  it.each([403, 429, 500])(
    'does not expire a private request returning %s',
    async status => {
      await authenticate();

      const task = privateRequest();

      http.expectOne('/api/private-example').flush(null, {
        status,
        statusText: 'Error',
      });

      await task;

      expect(session.user()).toEqual(user);
      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it('does not expire a private request on a network failure', async () => {
    await authenticate();

    const task = privateRequest();

    http.expectOne('/api/private-example').error(
      new ProgressEvent('error'),
    );

    await task;

    expect(session.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores unmarked requests and external API errors', async () => {
    await authenticate();

    const publicRequest = firstValueFrom(
      client.get('/api/public'),
    ).catch(error => error);

    const externalRequest = privateRequest(
      'https://example.com/api/external',
    );

    http.expectOne('/api/public').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    http.expectOne('https://example.com/api/external').flush(
      null,
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );

    await Promise.all([publicRequest, externalRequest]);

    expect(session.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores a late 401 from the previous session after a new login', async () => {
    await authenticate();

    const oldRequest = privateRequest();
    const login = session.login(credentials);

    await Promise.resolve();

    http.expectOne('/api/auth/login').flush({
      ...user,
      id: 'user-2',
    });

    await login;

    http.expectOne('/api/private-example').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    await oldRequest;

    expect(session.user()?.id).toBe('user-2');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
