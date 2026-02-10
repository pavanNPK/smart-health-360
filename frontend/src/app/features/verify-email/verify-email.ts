import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Auth, type User } from '../../core/auth';

@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, RouterLink],
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
    private route: ActivatedRoute
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
      return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }
    const otpDigits = this.otp.replace(/\D/g, '');
    if (otpDigits.length !== 6) {
      this.error = 'OTP must be exactly 6 digits (numbers only)';
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
          const user = res.user;
          if (user.role === 'SUPER_ADMIN') this.router.navigate(['/admin/users']);
          else if (user.role === 'DOCTOR') this.router.navigate(['/doctor/dashboard']);
          else this.router.navigate(['/reception/patients']);
        },
        error: (err) => {
          this.error = err.error?.message || 'Verification failed. Check OTP and try again.';
          this.loading = false;
        },
        complete: () => (this.loading = false),
      });
  }

  resendOtp(): void {
    if (!this.email.trim()) {
      this.error = 'Enter your email first';
      return;
    }
    this.error = '';
    this.success = '';
    this.resendLoading = true;
    this.http.post<{ message: string }>(`${environment.apiUrl}/auth/send-otp`, { email: this.email.trim().toLowerCase() }).subscribe({
      next: () => (this.success = 'OTP sent. Check your email.'),
      error: (err) => (this.error = err.error?.message || 'Failed to send OTP'),
      complete: () => (this.resendLoading = false),
    });
  }
}
