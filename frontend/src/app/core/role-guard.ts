import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Auth } from './auth';
import type { UserRole } from './auth';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const allowedRoles = (route.data['roles'] as UserRole[]) || [];
  const user = auth.currentUserValue;
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  if (!allowedRoles.includes(user.role)) {
    // SA must not use reception routes; send to admin patients instead
    if (user.role === 'SUPER_ADMIN' && route.pathFromRoot.some((r) => r.routeConfig?.path === 'reception')) {
      router.navigate(['/admin/patients']);
      return false;
    }
    router.navigate(['/login']);
    return false;
  }
  return true;
};
