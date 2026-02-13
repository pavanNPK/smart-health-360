import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Auth, type User } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-verify-email',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit {
  email = '';
  otp = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;
  resendLoading = false;

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) this.email = emailParam;
  }

  onSubmit(): void {
    this.error = '';
    this.success = '';
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: this.error });
      return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: this.error });
      return;
    }
    const otpDigits = this.otp.replace(/\D/g, '');
    if (otpDigits.length !== 6) {
      this.error = 'OTP must be exactly 6 digits (numbers only)';
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: this.error });
      return;
    }
    this.loading = true;
    this.http
      .post<{ accessToken: string; refreshToken: string; user: User }>(
        `${environment.apiUrl}/auth/verify-otp`,
        { email: this.email.trim().toLowerCase(), otp: otpDigits, password: this.password }
      )
      .subscribe({
        next: (res) => {
          this.auth.setSession(res.accessToken, res.refreshToken, res.user);
          this.messageService.add({
            severity: 'success',
            summary: 'Welcome!',
            detail: 'Your account is active. A welcome email has been sent. Redirecting…',
            life: 5000,
          });
          const user = res.user;
          if (user.role === 'SUPER_ADMIN') this.router.navigate(['/admin/dashboard']);
          else if (user.role === 'DOCTOR') this.router.navigate(['/doctor/dashboard']);
          else this.router.navigate(['/reception/patients']);
        },
        error: (err) => {
          this.error = err.error?.message || 'Invalid or expired OTP. Request a new code or check the 6-digit code.';
          this.messageService.add({
            severity: 'error',
            summary: 'Verification failed',
            detail: this.error,
            life: 6000,
          });
          this.loading = false;
        },
        complete: () => (this.loading = false),
      });
  }

  resendOtp(): void {
    if (!this.email.trim()) {
      this.error = 'Enter your email first';
      this.messageService.add({ severity: 'warn', summary: 'Email required', detail: this.error });
      return;
    }
    this.error = '';
    this.success = '';
    this.resendLoading = true;
    this.http.post<{ message: string }>(`${environment.apiUrl}/auth/send-otp`, { email: this.email.trim().toLowerCase() }).subscribe({
      next: () => {
        this.success = 'Set-password link and OTP sent to your email. Check your inbox (and spam).';
        this.messageService.add({
          severity: 'success',
          summary: 'Email sent',
          detail: this.success,
          life: 6000,
        });
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send OTP. Check email and try again.';
        this.messageService.add({ severity: 'error', summary: 'Resend failed', detail: this.error, life: 6000 });
      },
      complete: () => (this.resendLoading = false),
    });
  }
}
