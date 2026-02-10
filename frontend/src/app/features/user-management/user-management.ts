import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import type { UserRole } from '../../core/auth';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  specialization?: string;
}

@Component({
  selector: 'app-user-management',
  imports: [FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit {
  users: User[] = [];
  total = 0;
  page = 1;
  limit = 10;
  showForm = false;
  form = { name: '', email: '', password: '', role: 'RECEPTIONIST' as UserRole, specialization: '' };
  error = '';
  loading = false;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: User[]; total: number }>('/users', { page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.users = res.data;
        this.total = res.total;
      },
      error: () => {},
      complete: () => (this.loading = false),
    });
  }

  openForm(): void {
    this.showForm = true;
    this.form = { name: '', email: '', password: '', role: 'RECEPTIONIST', specialization: '' };
    this.error = '';
  }

  createUser(): void {
    this.error = '';
    const payload: Record<string, unknown> = {
      name: this.form.name,
      email: this.form.email,
      role: this.form.role,
      specialization: this.form.specialization || undefined,
      sendVerificationOtp: !this.form.password,
    };
    if (this.form.password) payload['password'] = this.form.password;
    this.api.post<User & { message?: string }>('/users', payload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'User created.';
        this.showForm = false;
        this.load();
        setTimeout(() => (this.successMessage = ''), 5000);
      },
      error: (err) => (this.error = err.error?.message || 'Failed to create user'),
    });
  }

  successMessage = '';

  resendOtp(email: string): void {
    this.api.post<{ message: string }>('/auth/send-otp', { email }).subscribe({
      next: () => alert('OTP sent to ' + email),
      error: (err) => alert(err.error?.message || 'Failed to send OTP'),
    });
  }
}
