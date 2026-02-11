import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  contactEmail?: string;
  primaryDoctorId?: { _id: string; name: string };
  patientVisibility: 'VIS_A' | 'VIS_B';
}

interface PatientRecord {
  _id: string;
  type: string;
  visibility: string;
  title?: string;
  disease?: string;
  notes?: string;
  createdAt: string;
  createdBy?: { name: string };
}

@Component({
  selector: 'app-patient-profile',
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    CardModule,
    ButtonModule,
    MessageModule,
    TableModule,
    SelectModule,
    InputTextModule,
    DialogModule,
  ],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss',
})
export class PatientProfile implements OnInit {
  patientId = '';
  patient: Patient | null = null;
  records = signal<PatientRecord[]>([]);
  total = 0;
  page = 1;
  limit = 20;
  loadingPatient = true;
  loadingRecords = false;
  error = '';
  statusFilter: 'all' | 'VIS_A' | 'VIS_B' = 'all';
  typeFilter = '';
  fromDate = '';
  toDate = '';
  createdByFilter = '';
  showChangeStatusDialog = false;
  selectedRecord: PatientRecord | null = null;
  changeStatusNewVisibility: 'VIS_A' | 'VIS_B' = 'VIS_A';
  changeStatusReason = '';

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'VIS_A', value: 'VIS_A' },
    { label: 'VIS_B', value: 'VIS_B' },
  ];

  canChangeVisibility = computed(() => {
    const u = this.auth.currentUserValue;
    return u?.role === 'DOCTOR' || u?.role === 'SUPER_ADMIN';
  });

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    this.loadPatient();
    this.loadRecords();
  }

  loadPatient(): void {
    this.loadingPatient = true;
    this.api.get<Patient>(`/patients/${this.patientId}`).subscribe({
      next: (p) => (this.patient = p),
      error: (err) => (this.error = err.error?.message || 'Failed to load patient'),
      complete: () => (this.loadingPatient = false),
    });
  }

  loadRecords(): void {
    this.loadingRecords = true;
    const params: Record<string, string | number | boolean> = { page: this.page, limit: this.limit };
    if (this.statusFilter !== 'all') params['status'] = this.statusFilter;
    if (this.typeFilter) params['type'] = this.typeFilter;
    if (this.fromDate) params['fromDate'] = this.fromDate;
    if (this.toDate) params['toDate'] = this.toDate;
    if (this.createdByFilter) params['createdBy'] = this.createdByFilter;
    this.api.get<{ data: PatientRecord[]; total: number }>(`/patients/${this.patientId}/records`, params).subscribe({
      next: (res) => {
        this.records.set(res.data);
        this.total = res.total;
      },
      error: () => this.records.set([]),
      complete: () => (this.loadingRecords = false),
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadRecords();
  }

  openChangeStatus(r: PatientRecord): void {
    this.selectedRecord = r;
    this.changeStatusNewVisibility = r.visibility === 'VIS_A' ? 'VIS_B' : 'VIS_A';
    this.changeStatusReason = '';
    this.showChangeStatusDialog = true;
  }

  submitChangeStatus(): void {
    if (!this.selectedRecord || !this.changeStatusReason.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Reason required', detail: 'Enter a reason for the status change.' });
      return;
    }
    this.api
      .patch<PatientRecord>(`/records/${this.selectedRecord._id}/visibility`, {
        visibility: this.changeStatusNewVisibility,
        reason: this.changeStatusReason.trim(),
      })
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Status updated', detail: `Record is now ${this.changeStatusNewVisibility}.` });
          this.showChangeStatusDialog = false;
          this.selectedRecord = null;
          this.loadRecords();
        },
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Update failed',
            detail: err.error?.message || 'Failed to change status.',
          }),
      });
  }

  exportRecords(): void {
    this.api.post<{ message: string; recordCount: number }>(`/patients/${this.patientId}/export`, { format: 'PDF' }).subscribe({
      next: (res) =>
        this.messageService.add({
          severity: 'success',
          summary: 'Export complete',
          detail: `${res.message} Records: ${res.recordCount}`,
        }),
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Export failed',
          detail: err.error?.message || 'Export failed',
        }),
    });
  }
}
