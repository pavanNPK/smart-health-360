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
}

interface Stats {
  total: number;
  publicCount: number;
  privateCount: number;
}

interface ReceptionistUser {
  _id: string;
  name: string;
  email: string;
}

interface AttendanceRecord {
  _id: string;
  userId: { _id: string; name: string; email: string };
  date: string;
  status: 'PRESENT' | 'ABSENT';
  notes?: string;
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
  receptionists: ReceptionistUser[] = [];
  attendance: AttendanceRecord[] = [];
  loading = false;
  clinicId: string | undefined;

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {
    this.clinicId = this.auth.currentUserValue?.clinicId;
  }

  ngOnInit(): void {
    this.load();
    if (this.clinicId) {
      this.loadStats();
      this.loadReceptionists();
      this.loadAttendance();
    }
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

  loadReceptionists(): void {
    if (!this.clinicId) return;
    this.api.get<{ data: ReceptionistUser[] }>(`/clinics/${this.clinicId}/receptionists`).subscribe({
      next: (res) => (this.receptionists = res.data),
    });
  }

  loadAttendance(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.api.get<{ data: AttendanceRecord[] }>('/attendance', { date: today }).subscribe({
      next: (res) => (this.attendance = res.data),
    });
  }

  getAttendanceForUser(userId: string): AttendanceRecord | undefined {
    return this.attendance.find((a) => (a.userId as { _id: string })._id === userId);
  }
}
