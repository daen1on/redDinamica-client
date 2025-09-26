import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpClient,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserService } from './services/user.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isTokenExpiredPopupDisplayed = false;

  constructor(
    private _router: Router,
    private _http: HttpClient,
    private _userService: UserService
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
      // Obtén el token de autorización del almacenamiento local
      const authToken = localStorage.getItem('token');

      // Solo añadir token si es válido y la request no tiene ya Authorization header
      if (authToken && authToken.trim() !== '' && !request.headers.get('Authorization')) {
        request = request.clone({
          setHeaders: {
            Authorization: authToken
          }
        });
      }

    return next.handle(request).pipe(
      catchError((err) => {
        console.log('🚨 AuthInterceptor: Error', err.status, 'on', request.url);
        
        // Detectar errores de autenticación (incluyendo cuando status es undefined/null)
        const isAuthError = err.status === 401 || 
                           (err.error && err.error.message && 
                            (err.error.message.includes('authorization header') || 
                             err.error.message.includes('Authorization') ||
                             err.error.message.includes('null'))) ||
                           (!err.status && err.message && err.message.includes('null')) ||
                           (err.message && err.message.includes('No hay token de autenticación')) ||
                           (typeof err === 'string' && err.includes('No hay token de autenticación'));
        
        // Considerar 403 como error de autenticación solo si viene con códigos explícitos de token
        const isForcedAuth403 = err.status === 403 && (
          (err.error && (err.error.code === 'TOKEN_INVALIDATED' || err.error.code === 'TOKEN_OUTDATED')) ||
          (err.error && err.error.message && (err.error.message.toLowerCase().includes('token') || err.error.message.toLowerCase().includes('authorization')))
        );

        if (isAuthError || isForcedAuth403) {
          if (!this.isTokenExpiredPopupDisplayed) {
            this.isTokenExpiredPopupDisplayed = true;

            // Verificar el tipo de error de autenticación
            let message = 'La sesión ha expirado, por favor iniciar sesión de nuevo.';
            
            if (err.error && err.error.message) {
              if (err.error.message.includes("hasn't got authorization header")) {
                message = 'Sesión no válida. Por favor, inicie sesión nuevamente.';
              } else if (err.error.message.includes('expired')) {
                message = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
              } else if (err.error.message.includes('invalid')) {
                message = 'Token de sesión inválido. Por favor, inicie sesión nuevamente.';
              } else if (err.error.message.includes('null')) {
                message = 'Sesión no válida. Por favor, inicie sesión nuevamente.';
              }
            }
            
            if (err.error && err.error.code === 'TOKEN_INVALIDATED') {
              message = 'Su cuenta fue actualizada por un administrador. Por favor, inicie sesión nuevamente.';
            } else if (err.error && err.error.code === 'TOKEN_OUTDATED') {
              message = 'Su cuenta fue actualizada. Por favor, inicie sesión nuevamente para ver los cambios.';
            }

            // Limpiar datos de sesión inmediatamente
            this._userService.clearIdentityAndToken();
            sessionStorage.clear();
            localStorage.clear();

            // Forzar actualización de la UI
            setTimeout(() => {
              this._userService.identityChanged.next(null);
            }, 50);

            // Display a simple warning message using the browser's native alert
            alert(message);

            // Forzar navegación y recarga
            this._router.navigate(['/login']).then(() => {
              window.location.reload();
            });

            this.isTokenExpiredPopupDisplayed = false;
          }
        }
        
        // Manejar correctamente el error cuando err.error es undefined
        const error = (err.error && err.error.message) ? err.error.message : 
                     (err.message ? err.message : 
                     (err.statusText ? err.statusText : 'Error desconocido'));
        
        return throwError(() => error);
      })
    );
  }
}

