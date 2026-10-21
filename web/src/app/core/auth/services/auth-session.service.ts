import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { AuthSessionState } from '../models/types/auth-session-state.type';
import type { LoginCredentials } from '../models/interfaces/login-credentials.interface';
import { AuthApiService } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthApiService);

  private readonly sessionState = signal<AuthSessionState>({
    status: 'unknown',
    user: null
  });

  private restorationRequest: Promise<void> | undefined;
  private logoutRequest: Promise<void> | undefined;
  private operationQueue: Promise<void> = Promise.resolve();
  private sessionVersion = 0;

  readonly state = this.sessionState.asReadonly();
  readonly status = computed(() => this.state().status);
  readonly user = computed(() => this.state().user);

  readonly isAuthenticated = computed(
    () => this.status() === 'authenticated',
  );

  // Identifica el estado con el que salió una petición privada.
  get version(): number {
    return this.sessionVersion;
  }

  ensureSession(): Promise<void> {
    if (this.restorationRequest) return this.restorationRequest;

    return this.status() === 'unknown'
      ? this.restoreSession()
      : Promise.resolve();
  }

  restoreSession(): Promise<void> {
    if (!this.restorationRequest) {
      this.restorationRequest = this.enqueue(
        () => this.loadSession(),
      ).finally(() => {
        this.restorationRequest = undefined;
      });
    }

    return this.restorationRequest;
  }

  login(credentials: LoginCredentials): Promise<void> {
    const submittedCredentials = { ...credentials };

    return this.enqueue(async () => {
      const user = await firstValueFrom(
        this.authApi.login(submittedCredentials)
      );

      this.setState({
        status: 'authenticated',
        user
      });
    });
  }

  logout(): Promise<void> {
    if (!this.logoutRequest) {
      this.logoutRequest = this.enqueue(async () => {
        try {
          await firstValueFrom(this.authApi.logout());
        } catch (error: unknown) {
          // Un 401 confirma que ya no hay sesión válida.
          // Otros errores se propagan.
          if (
            !(error instanceof HttpErrorResponse) ||
            error.status !== 401
          ) {
            throw error;
          }
        }

        this.setState({
          status: 'anonymous',
          user: null,
        });
      }).finally(() => {
        this.logoutRequest = undefined;
      });
    }

    return this.logoutRequest;
  }

  expireSession(expectedVersion: number): boolean {

    if ( expectedVersion !== this.version || !this.isAuthenticated() ) return false;

    this.setState({
      status: 'anonymous',
      user: null
    });

    return true;
  }

  // Serializa restauración, login y logout para no aplicar
  // respuestas fuera de orden.
  private enqueue(operation: () => Promise<void>): Promise<void> {
    const request = this.operationQueue.then(operation);

    this.operationQueue = request.catch(() => undefined);

    return request;
  }

  private setState(state: AuthSessionState): void {
    this.sessionVersion += 1;
    this.sessionState.set(state);
  }

  private async loadSession(): Promise<void> {
    this.setState({
      status: 'loading',
      user: null,
    });

    try {
      const user = await firstValueFrom( this.authApi.getCurrentUser() );

      this.setState({
        status: 'authenticated',
        user
      });

    } catch (error: unknown) {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

      this.setState({
        status: isUnauthorized ? 'anonymous' : 'unavailable',
        user: null
      });
    }
  }
}
