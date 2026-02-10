import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

interface Area {
  _id: string;
  name: string;
  code?: string;
}

interface Clinic {
  _id: string;
  name: string;
  areaId: Area | string;
  code?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  specialization?: string;
  status?: string;
}

@Component({
  selector: 'app-admin-hierarchy',
  standalone: true,
  imports: [CardModule, ButtonModule],
  templateUrl: './admin-hierarchy.html',
  styleUrl: './admin-hierarchy.scss',
})
export class AdminHierarchy implements OnInit {
  areas: Area[] = [];
  areaClinics: Record<string, Clinic[]> = {};
  clinicDoctors: Record<string, User[]> = {};
  clinicReceptionists: Record<string, User[]> = {};
  loading = true;
  expandedAreas: Set<string> = new Set();
  expandedClinics: Set<string> = new Set();

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.get<{ data: Area[] }>('/areas').subscribe({
      next: (res) => {
        this.areas = res.data;
        this.areaClinics = {};
        this.expandedAreas = new Set();
        this.expandedClinics = new Set();
      },
      error: () => {},
      complete: () => (this.loading = false),
    });
  }

  toggleArea(areaId: string): void {
    if (this.expandedAreas.has(areaId)) {
      this.expandedAreas.delete(areaId);
    } else {
      this.expandedAreas.add(areaId);
      if (!this.areaClinics[areaId]) {
        this.api.get<{ data: Clinic[] }>('/clinics', { areaId }).subscribe({
          next: (res) => (this.areaClinics[areaId] = res.data),
        });
      }
    }
  }

  toggleClinic(clinicId: string): void {
    if (this.expandedClinics.has(clinicId)) {
      this.expandedClinics.delete(clinicId);
    } else {
      this.expandedClinics.add(clinicId);
      if (!this.clinicDoctors[clinicId]) {
        this.api.get<{ data: User[] }>(`/clinics/${clinicId}/doctors`).subscribe({
          next: (res) => (this.clinicDoctors[clinicId] = res.data),
        });
      }
      if (!this.clinicReceptionists[clinicId]) {
        this.api.get<{ data: User[] }>(`/clinics/${clinicId}/receptionists`).subscribe({
          next: (res) => (this.clinicReceptionists[clinicId] = res.data),
        });
      }
    }
  }

  isAreaExpanded(areaId: string): boolean {
    return this.expandedAreas.has(areaId);
  }

  isClinicExpanded(clinicId: string): boolean {
    return this.expandedClinics.has(clinicId);
  }

  getClinics(areaId: string): Clinic[] {
    return this.areaClinics[areaId] || [];
  }

  getDoctors(clinicId: string): User[] {
    return this.clinicDoctors[clinicId] || [];
  }

  getReceptionists(clinicId: string): User[] {
    return this.clinicReceptionists[clinicId] || [];
  }
}
