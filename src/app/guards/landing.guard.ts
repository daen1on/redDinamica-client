import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { CanActivateFn } from '@angular/router';

export const landingGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const userService = inject(UserService);

  let identity = userService.getIdentity();
  let token = userService.getToken();

  if (identity && token) {
    router.navigate(['/inicio']);
    return false;
  } else {
    return true;
  }
};
