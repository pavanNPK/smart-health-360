import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

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

interface ReceptionistUser {
  _id: string;
  name: string;
  email: string;
  patientCount?: number;
}

interface AttendanceRecord {
  _id: string;
  userId: { _id: string; name: string; email: string };
  date: string;
  status: 'PRESENT' | 'ABSENT';
  notes?: string;
}

@Component({
  selector: 'app-doctor-staff',
  imports: [RouterLink, DatePipe, CardModule, TableModule, ButtonModule, DialogModule, TooltipModule],
  templateUrl: './doctor-staff.html',
  styleUrl: './doctor-staff.scss',
})
export class DoctorStaff implements OnInit, OnDestroy {
  receptionists: ReceptionistUser[] = [];
  attendance: AttendanceRecord[] = [];
  loadingReceptionists = false;
  receptionistsError = '';
  clinicId: string | undefined;
  showPatientsByReceptionist = false;
  selectedReceptionist: ReceptionistUser | null = null;
  patientsByReceptionist: Patient[] = [];
  loadingPatientsByReceptionist = false;
  private destroy$ = new Subject<void>();

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {
    this.clinicId = this.auth.currentUserValue?.clinicId;
  }

  ngOnInit(): void {
    if (this.clinicId) {
      this.loadReceptionists();
      this.loadAttendance();
    } else {
      // User may be refreshed from API (GET /auth/me) with clinicId after layout loads
      this.auth.currentUser$
        .pipe(
          filter((u) => !!(u?.clinicId)),
          takeUntil(this.destroy$)
        )
        .subscribe((u) => {
          if (u?.clinicId) {
            this.clinicId = u.clinicId;
            this.loadReceptionists();
            this.loadAttendance();
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReceptionists(): void {
    if (!this.clinicId) return;
    this.loadingReceptionists = true;
    this.receptionistsError = '';
    this.api.get<{ data: ReceptionistUser[] }>(`/clinics/${this.clinicId}/receptionists-with-stats`).subscribe({
      next: (res) => {
        this.receptionists = res.data;
        this.loadingReceptionists = false;
      },
      error: (err) => {
        this.receptionistsError = err.error?.message || 'Failed to load receptionists';
        this.receptionists = [];
        this.loadingReceptionists = false;
      },
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

  openPatientsByReceptionist(r: ReceptionistUser): void {
    this.selectedReceptionist = r;
    this.showPatientsByReceptionist = true;
    this.patientsByReceptionist = [];
    this.loadingPatientsByReceptionist = true;
    this.api
      .get<{ data: Patient[] }>('/patients', { assignedTo: 'me', createdBy: r._id, limit: 100 })
      .subscribe({
        next: (res) => {
          this.patientsByReceptionist = res.data;
          this.loadingPatientsByReceptionist = false;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Failed to load patients' });
          this.loadingPatientsByReceptionist = false;
        },
      });
  }

  closePatientsByReceptionist(): void {
    this.showPatientsByReceptionist = false;
    this.selectedReceptionist = null;
    this.patientsByReceptionist = [];
  }
}
