import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path       : '',
    pathMatch  : 'full',
    redirectTo : 'login'
  },
  {
    path          : 'login',
    title         : 'Acceso | ToroReps',
    loadComponent : () => import('./features/auth/pages/login/login').then(module => module.Login)
  },
  {
    path       : '**',
    redirectTo : 'login'
  }
];
