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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isTokenExpiredPopupDisplayed = false;

  constructor(
    private _router: Router,
    private _http: HttpClient
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
      // Obtén el token de autorización del almacenamiento local
      const authToken = localStorage.getItem('authToken');

      // Si el token de autorización existe, clona la solicitud y añade el token de autorización a las cabeceras
      if (authToken) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${authToken}`
          }
        });

    return next.handle(request).pipe(
      catchError((err) => {
        if (err.status === 401 || err.status === 403) {
          if (!this.isTokenExpiredPopupDisplayed) {
            this.isTokenExpiredPopupDisplayed = true;

            // Display a simple warning message using the browser's native alert
            alert('La sesión ha expirado, por favor iniciar sesión de nuevo.');

            sessionStorage.removeItem('token');
            localStorage.clear();
            this._router.navigate(['/login']);

            this.isTokenExpiredPopupDisplayed = false;
          }
        }
        const error = err.error.message || err.statusText;
        return throwError(error);
      })
    );
  }
}
