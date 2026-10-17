import { HttpErrorResponse } from '@angular/common/http';

export function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  }

  switch (error.status) {
    case 0:
      return 'No hemos podido conectar con el servidor. Inténtalo de nuevo.';

    case 400:
      return 'Revisa el email y la contraseña introducidos.';

    case 401:
      return 'El email o la contraseña no son correctos.';

    case 403:
      return 'No se ha podido validar la solicitud. Recarga la página e inténtalo de nuevo.';

    case 429: {
      const seconds = Number(error.headers.get('Retry-After'));

      if (Number.isFinite(seconds) && seconds > 0) {
        return `Demasiados intentos. Espera ${Math.ceil(seconds)} segundos antes de volver a intentarlo.`;
      }

      return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
    }

    default:
      return 'No hemos podido iniciar sesión. Inténtalo de nuevo más tarde.';
  }
}
