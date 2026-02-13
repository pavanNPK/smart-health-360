import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
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
  selector: 'app-doctor-patient-list',
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
  templateUrl: './doctor-patient-list.html',
  styleUrl: './doctor-patient-list.scss',
})
export class DoctorPatientList implements OnInit {
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

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'VIS_A', value: 'VIS_A' },
    { label: 'VIS_B', value: 'VIS_B' },
  ];

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private api: Api,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.limit = event.rows ?? 10;
    const rawFirst = event.first ?? 0;
    this.page = this.limit > 0 ? Math.floor(rawFirst / this.limit) + 1 : 1;
    this.first = (this.page - 1) * this.limit;
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number | boolean> = {
      assignedTo: 'me',
      page: this.page,
      limit: this.limit,
    };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.visibilityFilter !== 'all') params['visibility'] = this.visibilityFilter;
    this.api.get<{ data: Patient[]; total: number }>('/patients', params).subscribe({
      next: (res) => {
        const total = res.total;
        if (total > 0 && this.first >= total) {
          this.first = Math.max(0, (Math.ceil(total / this.limit) - 1) * this.limit);
          this.page = Math.ceil(total / this.limit);
          this.load();
          return;
        }
        this.patients = res.data;
        this.total = total;
        this.totalRecords = total;
        this.last = this.total === 0 ? 0 : Math.min(this.first + this.patients.length, this.total);
        this.hasLoadedOnce = true;
      },
      error: (err) => {
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
        this.loading = false;
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
}
