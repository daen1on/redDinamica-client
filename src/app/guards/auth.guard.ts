import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userService = inject(UserService);

  const identity = userService.getIdentity();
  const token = userService.getToken();

  if (identity && token) {
    return true;
  } else {
    // Redirigir a la página de inicio (landing) cuando no hay usuario autenticado
    console.log('Usuario no autenticado, redirigiendo a home');
    return router.parseUrl('/');
  }
}; 