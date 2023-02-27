import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router, private modalService: NgbModal) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && error.headers.get('WWW-Authenticate') === 'Bearer realm="Token has expired"') {
          // Show a modal dialog asking the user to log in again
          // ...

          // Redirect the user to the login page
          handleTokenExpiration() {
            const modalRef = this.modalService.open(LoginModalComponent);
          }
          this.router.navigate(['/login']);
        }
        return throwError(error);
      })
    );
  }
}
 