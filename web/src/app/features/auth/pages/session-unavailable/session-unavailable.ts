import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';

@Component({
  imports         : [],
  selector        : 'toro-session-unavailable',
  styleUrl        : './session-unavailable.scss',
  templateUrl     : './session-unavailable.html',
  changeDetection : ChangeDetectionStrategy.OnPush
})
export class SessionUnavailable {

  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly retrying = signal(false);

  protected readonly message = signal(
    'Comprueba tu conexión y vuelve a intentarlo.',
  );

  protected async onRetry(): Promise<void> {
    if (this.retrying()) return;

    this.retrying.set(true);
    this.message.set('Estamos comprobando tu sesión…');

    try {
      await this.session.restoreSession();

      if (this.session.status() === 'unavailable') {
        this.message.set(
          'Seguimos sin poder conectar. Puedes volver a intentarlo en un momento.',
        );

        return;
      }

      await this.router.navigateByUrl(
        this.session.isAuthenticated() ? '/main' : '/login',
        {
          replaceUrl: true,
        },
      );
    } catch {
      this.message.set(
        'No hemos podido continuar. Vuelve a intentarlo.',
      );
    } finally {
      this.retrying.set(false);
    }
  }

}
