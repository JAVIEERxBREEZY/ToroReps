import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/services/auth-session.service';

describe('Login', () => {
  it('shows validation errors without attempting authentication', async () => {
    const login = vi.fn();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: AuthSessionService,
          useValue: {
            user: signal(null),
            status: signal('anonymous'),
            isAuthenticated: signal(false),
            ensureSession: vi.fn().mockResolvedValue(undefined),
            login,
          }
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await TestBed.inject(Router).navigateByUrl('/login');
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    const form = element.querySelector('form');

    expect(form).not.toBeNull();

    form!.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );

    await fixture.whenStable();

    expect(login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Introduce tu email.');
    expect(element.textContent).toContain('Introduce tu contraseña.');
  });
});
