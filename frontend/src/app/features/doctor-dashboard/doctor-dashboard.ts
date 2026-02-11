import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  contactEmail?: string;
  primaryDoctorId?: { name: string };
  createdBy?: { name: string; email: string };
  visACount?: number;
  visBCount?: number;
}

interface Stats {
  total: number;
  visACount: number;
  visBCount: number;
}

@Component({
  selector: 'app-doctor-dashboard',
  imports: [RouterLink, DatePipe, CardModule, TableModule],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.scss',
})
export class DoctorDashboard implements OnInit {
  patients: Patient[] = [];
  stats: Stats | null = null;
  loading = false;

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStats();
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: Patient[] }>('/patients', { assignedTo: 'me' }).subscribe({
      next: (res) => (this.patients = res.data),
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: err.error?.message || 'Failed to load patients.',
        });
      },
      complete: () => (this.loading = false),
    });
  }

  loadStats(): void {
    this.api.get<Stats>('/patients/stats', { assignedTo: 'me' }).subscribe({
      next: (res) => (this.stats = res),
    });
  }
}
