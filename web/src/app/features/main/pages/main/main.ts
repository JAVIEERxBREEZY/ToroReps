import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';

@Component({
  selector        : 'toro-main',
  templateUrl     : './main.html',
  styleUrl        : './main.scss',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class Main {
  protected readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly loggingOut = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected async onLogout(): Promise<void> {
    if ( this.loggingOut() ) return;

    this.loggingOut.set(true);
    this.errorMessage.set(null);

    try {
      await this.session.logout();

      await this.router.navigateByUrl('/login', { replaceUrl: true });

    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse && error.status === 403
          ? 'No se ha podido validar la solicitud. Recarga la página e inténtalo de nuevo.'
          : 'No hemos podido confirmar el cierre de sesión. Inténtalo de nuevo.',
      );
    } finally {
      this.loggingOut.set(false);
    }
  }
}
