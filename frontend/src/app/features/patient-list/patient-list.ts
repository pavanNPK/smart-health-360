import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Api } from '../../core/api';

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
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.scss',
})
export class PatientList implements OnInit {
  patients: Patient[] = [];
  total = 0;
  page = 1;
  limit = 10;
  search = '';
  loading = false;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Record<string, string | number | boolean> = { page: this.page, limit: this.limit };
    if (this.search) params['search'] = this.search;
    this.api.get<{ data: Patient[]; total: number }>('/patients', params).subscribe({
      next: (res) => {
        this.patients = res.data;
        this.total = res.total;
      },
      error: () => {},
      complete: () => {
        this.loading = false;
      },
    });
  }

  onSearch(): void {
    this.page = 1;
    this.load();
  }
}
