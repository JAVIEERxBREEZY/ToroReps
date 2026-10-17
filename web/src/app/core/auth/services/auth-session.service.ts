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

  readonly state = this.sessionState.asReadonly();

  readonly status = computed( () => this.state().status );
  readonly user = computed( () => this.state().user );

  readonly isAuthenticated = computed( () => this.status() === 'authenticated' );

  restoreSession(): Promise<void> {
    if (!this.restorationRequest) {
      this.restorationRequest = this.loadSession().finally(() => {
        this.restorationRequest = undefined;
      });
    }

    return this.restorationRequest;
  }

  async login(credentials: LoginCredentials) {
    await this.restorationRequest;

    const user = await firstValueFrom( this.authApi.login(credentials) );

    this.sessionState.set({ status : 'authenticated', user });
  }

  private async loadSession(): Promise<void> {
    this.sessionState.set({
      status: 'loading',
      user: null,
    });

    try {
      const user = await firstValueFrom(
        this.authApi.getCurrentUser(),
      );

      this.sessionState.set({
        status: 'authenticated',
        user,
      });
    } catch (error: unknown) {
      const isUnauthorized =
        error instanceof HttpErrorResponse && error.status === 401;

      this.sessionState.set({
        status: isUnauthorized ? 'anonymous' : 'unavailable',
        user: null,
      });
    }
  }
}
