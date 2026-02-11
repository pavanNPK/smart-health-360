import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  error = '';
  showVerifyLink = false;
  loading = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private messageService: MessageService
  ) {}

  onSubmit(): void {
    this.error = '';
    this.showVerifyLink = false;
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Signed in', detail: 'Redirecting…' });
        const user = this.auth.currentUserValue;
        if (!user) return;
        if (user.role === 'SUPER_ADMIN') this.router.navigate(['/admin/dashboard']);
        else if (user.role === 'DOCTOR') this.router.navigate(['/doctor/dashboard']);
        else this.router.navigate(['/reception/patients']);
      },
      error: (err: { error?: { message?: string; code?: string } }) => {
        if (err.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.error = 'Your account is pending. Check your email for the OTP and the link to set your password.';
          this.showVerifyLink = true;
          this.messageService.add({ severity: 'warn', summary: 'Verify email', detail: this.error });
        } else {
          this.error = err.error?.message || 'Invalid email or password';
          this.messageService.add({ severity: 'error', summary: 'Sign in failed', detail: this.error });
        }
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
