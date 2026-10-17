import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import type { Observable } from 'rxjs';

import type { AuthUser } from '../models/interfaces/auth-user.interface';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  getCurrentUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>('/api/auth/me', {
      timeout: 5_000,
      cache: 'no-store',
    });
  }
}
