import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

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
    TooltipModule,
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
  first = 0;
  recordsLast = 0;
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

  canEditPatient = computed(() => {
    const u = this.auth.currentUserValue;
    return u?.role === 'RECEPTIONIST' || u?.role === 'SUPER_ADMIN';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api,
    private auth: Auth,
    private messageService: MessageService
  ) {}

  /** Back-to-list URL based on current route so we don't send doctor/admin to /reception (which can redirect to login). */
  get backToListUrl(): string {
    const url = this.router.url;
    if (url.startsWith('/doctor')) return '/doctor/patients';
    if (url.startsWith('/admin')) return '/admin/dashboard';
    return '/reception/patients';
  }

  /** Edit patient link (reception/edit route; SA and receptionist only). */
  get editPatientLink(): string[] {
    return ['/reception/patients', this.patientId, 'edit'];
  }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    this.loadPatient();
    // Records load on first p-table onLazyLoad (table stays in DOM; [loading] shows overlay)
  }

  loadPatient(): void {
    this.loadingPatient = true;
    this.api.get<Patient>(`/patients/${this.patientId}`).subscribe({
      next: (p) => {
        this.patient = p;
        this.loadRecords(); // first load when patient is ready (table may not fire onLazyLoad yet)
      },
      error: (err) => {
        this.loadingPatient = false;
        this.error = err?.error?.message || 'Failed to load patient. Check backend and network.';
      },
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
        this.recordsLast = this.total === 0 ? 0 : Math.min(this.first + res.data.length, this.total);
      },
      error: (err) => {
        this.loadingRecords = false;
        this.records.set([]);
        this.total = 0;
        this.messageService.add({
          severity: 'error',
          summary: 'Records load failed',
          detail: err?.error?.message || 'Failed to load records. Check backend and network.',
        });
      },
      complete: () => (this.loadingRecords = false),
    });
  }

  onRecordsLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.limit = event.rows ?? 20;
    this.page = this.limit > 0 ? Math.floor(this.first / this.limit) + 1 : 1;
    this.loadRecords();
  }

  onFilterChange(): void {
    this.first = 0;
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
