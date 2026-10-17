import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import type { Observable } from 'rxjs';

import type { AuthUser } from '../models/interfaces/auth-user.interface';
import type { LoginCredentials } from '../models/interfaces/login-credentials.interface';
import { email } from '@angular/forms/signals';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  getCurrentUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/auth/me', {
      timeout: 5_000,
      cache: 'no-store',
    });
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {

    return this.http.post<AuthUser>(
      '/api/auth/login',
      {
        email    : credentials.email.trim(),
        password : credentials.password
      },
      {
        timeout : 10_000,
        cache   : 'no-store'
      }
    );

  }
}
