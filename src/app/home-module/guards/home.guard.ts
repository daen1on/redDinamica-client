import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { UserService } from 'src/app/services/user.service';

export const homeGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userService = inject(UserService);

  let identity = userService.getIdentity();
  let token = userService.getToken();
  if (identity && token) {
    return true;
  } else {
    return router.parseUrl('/');
  }
};
