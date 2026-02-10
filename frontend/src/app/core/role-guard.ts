import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Auth } from './auth';
import type { UserRole } from './auth';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] as UserRole[]) || [];
  const user = auth.currentUserValue;
  if (!user || !allowedRoles.includes(user.role)) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
