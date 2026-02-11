import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

interface AdminStats {
  doctors: number;
  receptionists: number;
  clinics: number;
  reports: number;
  patients: number;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, CardModule, ButtonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  stats: AdminStats | null = null;
  loading = true;
  error = '';

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.api.get<AdminStats>('/admin/stats').subscribe({
      next: (res) => (this.stats = res),
      error: (err) => (this.error = err.error?.message || 'Failed to load stats'),
      complete: () => (this.loading = false),
    });
  }
}
