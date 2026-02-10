import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth';
import type { User, UserRole } from '../../core/auth';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ButtonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  user: User | null = null;

  constructor(
    private auth: Auth,
    private router: Router
  ) {
    this.user = this.auth.currentUserValue;
    this.auth.currentUser$.subscribe((u) => (this.user = u));
  }

  ngOnInit(): void {
    const url = this.router.url;
    if (url === '/' || url === '') {
      const u = this.auth.currentUserValue;
      if (u?.role === 'SUPER_ADMIN') this.router.navigate(['/admin/users']);
      else if (u?.role === 'DOCTOR') this.router.navigate(['/doctor/dashboard']);
      else this.router.navigate(['/reception/patients']);
    }
  }

  logout(): void {
    this.auth.logout();
  }

  canAccess(role: UserRole): boolean {
    return this.user?.role === role || this.user?.role === 'SUPER_ADMIN';
  }

  canAccessAudit(): boolean {
    return this.user?.role === 'SUPER_ADMIN' || this.user?.role === 'DOCTOR' || this.user?.role === 'RECEPTIONIST';
  }
}
