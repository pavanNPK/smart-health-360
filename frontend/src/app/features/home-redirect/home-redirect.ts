import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';

@Component({
  selector: 'app-home-redirect',
  template: '<p>Redirecting…</p>',
})
export class HomeRedirect implements OnInit {
  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUserValue;
    if (user?.role === 'SUPER_ADMIN') this.router.navigate(['/admin/users']);
    else if (user?.role === 'DOCTOR') this.router.navigate(['/doctor/dashboard']);
    else this.router.navigate(['/reception/patients']);
  }
}
