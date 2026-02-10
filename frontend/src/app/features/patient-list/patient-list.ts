import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api } from '../../core/api';
import { CardModule } from 'primeng/card';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  contactEmail?: string;
  primaryDoctorId?: { name: string };
  isPrivatePatient: boolean;
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
  visibilityFilter: 'all' | 'public' | 'private' = 'all';
  loading = false;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.load();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.limit = event.rows ?? 10;
    this.page = this.limit > 0 ? Math.floor(this.first / this.limit) + 1 : 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number | boolean> = { page: this.page, limit: this.limit };
    if (this.search) params['search'] = this.search;
    if (this.visibilityFilter !== 'all') params['visibility'] = this.visibilityFilter;
    this.api.get<{ data: Patient[]; total: number }>('/patients', params).subscribe({
      next: (res) => {
        this.patients = res.data;
        this.total = res.total;
        this.totalRecords = res.total;
        this.last = this.total === 0 ? 0 : Math.min(this.first + this.patients.length, this.total);
      },
      error: () => {},
      complete: () => {
        this.loading = false;
      },
    });
  }

  onSearch(): void {
    this.first = 0;
    this.page = 1;
    this.load();
  }

  onVisibilityChange(): void {
    this.first = 0;
    this.page = 1;
    this.load();
  }
}
