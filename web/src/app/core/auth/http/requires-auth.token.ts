import { HttpContextToken } from '@angular/common/http';

// Activar en cada petición privada nueva.
export const REQUIRES_AUTH = new HttpContextToken<boolean>( () => false );
