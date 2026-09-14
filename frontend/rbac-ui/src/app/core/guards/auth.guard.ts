import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (authService.isAuthenticated() || tokenService.hasToken()) {
    if (authService.mustChangePassword()) {
      router.navigate(['/set-password']);
      return false;
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const setPasswordGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!authService.isAuthenticated() && !tokenService.hasToken()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
