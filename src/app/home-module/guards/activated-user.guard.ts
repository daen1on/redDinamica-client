import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from 'src/app/services/user.service';

/**
 * Guard para proteger rutas que solo deben ser accesibles por usuarios activados
 * Cumplimiento GDPR: Usuarios no activados no pueden acceder a datos personales de otros usuarios
 */
export const activatedUserGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userService = inject(UserService);

  const identity = userService.getIdentity();
  const token = userService.getToken();

  // Verificar que el usuario esté autenticado
  if (!identity || !token) {
    return router.parseUrl('/');
  }

  // Verificar que el usuario esté activado
  if (!identity.actived) {
    // Redirigir a la página principal con un mensaje
    alert('Tu cuenta aún no ha sido activada por un administrador. Acceso limitado a recursos y lecciones por protección de datos (GDPR).');
    return router.parseUrl('/inicio');
  }

  return true;
};

