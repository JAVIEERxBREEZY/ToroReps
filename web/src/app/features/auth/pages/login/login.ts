import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { email,form, FormField, maxLength, required, submit } from '@angular/forms/signals';

import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { getLoginErrorMessage } from './login-error-message';

@Component({
  selector        : 'app-login',
  imports         : [ FormField ],
  templateUrl     : './login.html',
  styleUrl        : './login.scss',
  changeDetection : ChangeDetectionStrategy.OnPush,
})
export class Login {

  protected readonly session = inject(AuthSessionService);

  private readonly loginModel = signal({
    email: '',
    password: ''
  });

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly loginForm = form(this.loginModel, (fields) => {
    required(fields.email, {
      message: 'Introduce tu email.',
    });

    email(fields.email, {
      message: 'Introduce un email válido.',
    });

    maxLength(fields.email, 254, {
      message: 'El email no puede superar los 254 caracteres.',
    });

    required(fields.password, {
      message: 'Introduce tu contraseña.',
    });

    maxLength(fields.password, 128, {
      message: 'La contraseña no puede superar los 128 caracteres.',
    });
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.loginForm().submitting()) return;

    this.errorMessage.set(null);

    try {
      const success = await submit(this.loginForm, async (fields) => {
        await this.session.login(fields().value());
      });

      if (success) {
        this.loginModel.set({
          email: '',
          password: '',
        });
      }
    } catch (error: unknown) {
      this.errorMessage.set(getLoginErrorMessage(error));
    }
  }
}
