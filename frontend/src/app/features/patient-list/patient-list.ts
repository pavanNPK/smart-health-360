import { Component, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  contactEmail?: string;
  primaryDoctorId?: { name: string };
  patientVisibility: 'VIS_A' | 'VIS_B';
  createdBy?: { name: string; email: string };
  visACount?: number;
  visBCount?: number;
}

@Component({
  selector: 'app-patient-list',
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
  ],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.scss',
})
export class PatientList implements OnInit {
  patients: Patient[] = [];
  total = 0;
  totalRecords = 0;
  first = 0;
  last = 0;
  page = 1;
  limit = 10;
  search = '';
  visibilityFilter: 'all' | 'VIS_A' | 'VIS_B' = 'all';
  loading = false;
  hasLoadedOnce = false;
  private loadId = 0;

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'VIS_A', value: 'VIS_A' },
    { label: 'VIS_B', value: 'VIS_B' },
  ];

  isReceptionist = computed(() => this.auth.currentUserValue?.role === 'RECEPTIONIST');
  /** Base path for patient routes: SA uses /admin/patients, Receptionist uses /reception/patients */
  patientsBase = computed(() => (this.auth.currentUserValue?.role === 'SUPER_ADMIN' ? '/admin/patients' : '/reception/patients'));

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private api: Api,
    private auth: Auth,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.loading) return;
    this.limit = event.rows ?? 10;
    const rawFirst = event.first ?? 0;
    this.page = this.limit > 0 ? Math.floor(rawFirst / this.limit) + 1 : 1;
    this.first = (this.page - 1) * this.limit;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadId += 1;
    const currentLoadId = this.loadId;
    const requestPage = this.page;
    const requestLimit = this.limit;
    const params: Record<string, string | number | boolean> = { page: requestPage, limit: requestLimit };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.visibilityFilter !== 'all') params['visibility'] = this.visibilityFilter;
    this.api.get<{ data: Patient[]; total: number }>('/patients', params).subscribe({
      next: (res) => {
        if (currentLoadId !== this.loadId) return;
        const total = res.total;
        if (total > 0 && (requestPage - 1) * requestLimit >= total) {
          this.page = Math.max(1, Math.ceil(total / requestLimit));
          this.first = (this.page - 1) * requestLimit;
          this.load();
          return;
        }
        this.patients = res.data;
        this.total = total;
        this.totalRecords = total;
        this.first = (requestPage - 1) * requestLimit;
        this.page = requestPage;
        this.last = this.total === 0 ? 0 : Math.min(this.first + this.patients.length, this.total);
        this.hasLoadedOnce = true;
      },
      error: (err) => {
        if (currentLoadId !== this.loadId) return;
        this.loading = false;
        this.patients = [];
        this.total = 0;
        this.hasLoadedOnce = true;
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: err?.error?.message || 'Failed to load patients. Check backend and network.',
        });
      },
      complete: () => {
        if (currentLoadId === this.loadId) this.loading = false;
      },
    });
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.first = 0;
      this.page = 1;
      this.load();
      this.searchDebounceTimer = null;
    }, 300);
  }

  onVisibilityFilterChange(): void {
    this.first = 0;
    this.page = 1;
    this.load();
  }

  confirmDelete(row: Patient): void {
    this.confirmationService.confirm({
      message: `Delete patient ${row.firstName} ${row.lastName}? This cannot be undone.`,
      header: 'Delete Patient',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deletePatient(row._id),
    });
  }

  deletePatient(id: string): void {
    this.api.delete(`/patients/${id}`).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Patient deleted' });
        this.load();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: err.error?.message || 'Failed to delete patient.',
        });
      },
    });
  }
}
