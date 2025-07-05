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
      const authToken = localStorage.getItem('token'); // Cambiado de 'authToken' a 'token'

      // Si el token de autorización existe, clona la solicitud y añade el token de autorización a las cabeceras
      if (authToken) {
        request = request.clone({
          setHeaders: {
            Authorization: authToken // Removido 'Bearer ' ya que el backend no lo espera
          }
        });
      }

    return next.handle(request).pipe(
      catchError((err) => {
        if (err.status === 401 || err.status === 403) {
          if (!this.isTokenExpiredPopupDisplayed) {
            this.isTokenExpiredPopupDisplayed = true;

            // Verificar si es un token invalidado/desactualizado
            let message = 'La sesión ha expirado, por favor iniciar sesión de nuevo.';
            if (err.error && err.error.code === 'TOKEN_INVALIDATED') {
              message = 'Su cuenta fue actualizada por un administrador. Por favor, inicie sesión nuevamente.';
            } else if (err.error && err.error.code === 'TOKEN_OUTDATED') {
              message = 'Su cuenta fue actualizada. Por favor, inicie sesión nuevamente para ver los cambios.';
            }

            // Limpiar datos de sesión inmediatamente
            this._userService.clearIdentityAndToken();
            sessionStorage.clear();
            localStorage.clear();

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
        
        return throwError(error);
      })
    );
  }
}

