import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import type { UserRole } from '../../core/auth';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';

interface Clinic {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  specialization?: string;
  clinicId?: Clinic | string;
}

@Component({
  selector: 'app-user-management',
  imports: [
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    MessageModule,
    TooltipModule,
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit {
  users: User[] = [];
  total = 0;
  page = 1;
  limit = 10;
  first = 0;
  last = 0;
  showForm = false;
  form = { name: '', email: '', password: '', role: 'RECEPTIONIST' as UserRole, specialization: '', clinicId: '' };
  showEditForm = false;
  editingUser: User | null = null;
  editForm = { name: '', status: '', specialization: '', clinicId: '' as string | null };
  editError = '';
  editSubmitting = false;
  clinics: Clinic[] = [];
  error = '';
  loading = false;
  formSubmitting = false;
  successMessage = '';

  roleOptions = [
    { label: 'Receptionist', value: 'RECEPTIONIST' },
    { label: 'Doctor', value: 'DOCTOR' },
    { label: 'Super Admin', value: 'SUPER_ADMIN' },
  ];

  statusOptions = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Pending verification', value: 'PENDING_VERIFICATION' },
  ];

  constructor(
    private api: Api,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.api.get<{ data: Clinic[] }>('/clinics').subscribe({ next: (res) => (this.clinics = res.data) });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.limit = event.rows ?? 10;
    this.page = this.limit > 0 ? Math.floor(this.first / this.limit) + 1 : 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: User[]; total: number }>('/users', { page: this.page, limit: this.limit }).subscribe({
      next: (res) => {
        this.users = res.data;
        this.total = res.total;
        this.last = this.total === 0 ? 0 : Math.min(this.first + this.users.length, this.total);
      },
      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: err?.error?.message || 'Failed to load users. Check backend and network.',
        });
      },
      complete: () => (this.loading = false),
    });
  }

  openForm(): void {
    this.showForm = true;
    this.form = { name: '', email: '', password: '', role: 'RECEPTIONIST', specialization: '', clinicId: '' };
    this.error = '';
  }

  openEditForm(u: User): void {
    this.editingUser = u;
    const clinicId = typeof u.clinicId === 'object' ? (u.clinicId as Clinic)?._id : (u.clinicId as string) ?? '';
    this.editForm = {
      name: u.name,
      status: u.status,
      specialization: u.specialization ?? '',
      clinicId: clinicId || null,
    };
    this.editError = '';
    this.showEditForm = true;
  }

  updateUser(): void {
    if (!this.editingUser) return;
    this.editError = '';
    this.editSubmitting = true;
    const payload: Record<string, unknown> = {
      name: this.editForm.name,
      status: this.editForm.status,
      specialization: this.editForm.specialization || undefined,
    };
    if (this.editingUser.role === 'DOCTOR' || this.editingUser.role === 'RECEPTIONIST') {
      payload['clinicId'] = this.editForm.clinicId || null;
    }
    this.api.patch<User>(`/users/${this.editingUser._id}`, payload).subscribe({
      next: () => {
        this.editSubmitting = false;
        this.showEditForm = false;
        this.editingUser = null;
        this.load();
        this.messageService.add({ severity: 'success', summary: 'User updated', detail: this.editForm.name });
      },
      error: (err) => {
        this.editSubmitting = false;
        this.editError = (err?.error?.message as string) || 'Failed to update user.';
      },
    });
  }

  getClinicName(u: User): string {
    const c = u.clinicId;
    return typeof c === 'object' && c?.name ? c.name : '—';
  }

  createUser(): void {
    this.error = '';
    this.formSubmitting = true;
    const payload: Record<string, unknown> = {
      name: this.form.name,
      email: this.form.email,
      role: this.form.role,
      specialization: this.form.specialization || undefined,
      sendVerificationOtp: !this.form.password,
    };
    if (this.form.password) payload['password'] = this.form.password;
    if ((this.form.role === 'DOCTOR' || this.form.role === 'RECEPTIONIST') && this.form.clinicId) {
      payload['clinicId'] = this.form.clinicId;
    }
    this.api.post<User & { message?: string }>('/users', payload).subscribe({
      next: (res) => {
        this.formSubmitting = false;
        const msg = res.message || 'User created.';
        this.successMessage = msg;
        this.showForm = false;
        this.load();
        this.messageService.add({
          severity: 'success',
          summary: 'User created',
          detail:
            msg +
            (res.message?.includes('OTP')
              ? ' Set-password email sent. They must verify email and set password to log in.'
              : ' They can log in with the password you set.'),
          life: 7000,
        });
        setTimeout(() => (this.successMessage = ''), 5000);
      },
      error: (err) => {
        this.formSubmitting = false;
        const detail =
          (err?.error?.message as string) || (err?.message as string) || 'Failed to create user. Check connection and try again.';
        this.error = detail;
        this.messageService.add({
          severity: 'error',
          summary: 'Create user failed',
          detail,
          life: 6000,
        });
      },
    });
  }

  resendOtp(email: string): void {
    this.api.post<{ message: string }>('/auth/send-otp', { email }).subscribe({
      next: () =>
        this.messageService.add({
          severity: 'success',
          summary: 'OTP sent',
          detail: `OTP sent to ${email}.`,
        }),
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Resend OTP failed',
          detail: err.error?.message || 'Failed to send OTP',
        }),
    });
  }

  confirmDelete(u: User): void {
    this.confirmationService.confirm({
      message: `Delete user "${u.name}" (${u.email})? This cannot be undone.`,
      header: 'Delete User',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteUser(u),
    });
  }

  deleteUser(u: User): void {
    this.api.delete<void>(`/users/${u._id}`).subscribe({
      next: () => {
        this.load();
        this.messageService.add({ severity: 'success', summary: 'User deleted', detail: u.name });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: err.error?.message || 'Failed to delete user.',
        });
      },
    });
  }
}
