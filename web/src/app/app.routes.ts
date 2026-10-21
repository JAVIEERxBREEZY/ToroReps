import type { Routes } from '@angular/router';

import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'main',
  },
  {
    path: 'login',
    title: 'Acceso | ToroReps',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login').then( module => module.Login ),
  },
  // {
  //   path: 'main',
  //   title: 'Inicio | ToroReps',
  //   canActivate: [authGuard],
  //   loadComponent: () =>
  //     import('./features/main/pages/main/main').then(
  //       module => module.Main,
  //     ),
  // },
  // {
  //   path: 'session-unavailable',
  //   title: 'Conexión | ToroReps',
  //   loadComponent: () =>
  //     import(
  //       './features/auth/pages/session-unavailable/session-unavailable'
  //     ).then(module => module.SessionUnavailable),
  // },
  {
    path: '**',
    redirectTo: 'main',
  },
];
