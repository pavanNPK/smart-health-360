import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';

interface Doctor {
  _id: string;
  name: string;
  email?: string;
}

@Component({
  selector: 'app-patient-form',
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MessageModule,
  ],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.scss',
})
export class PatientForm implements OnInit {
  patientId: string | null = null;
  firstName = '';
  lastName = '';
  dob = '';
  gender: 'M' | 'F' | 'O' | '' = '';
  contactEmail = '';
  contactPhone = '';
  address = '';
  patientVisibility: 'VIS_A' | 'VIS_B' = 'VIS_A';
  primaryDoctorId = '';
  doctors: Doctor[] = [];
  error = '';
  loadingPatient = false;
  loading = false;
  recordSummary: { visACount: number; visBCount: number; byType: Record<string, number> } | null = null;

  visibilityOptions = [
    { label: 'VIS_A', value: 'VIS_A' },
    { label: 'VIS_B', value: 'VIS_B' },
  ];

  genderOptions = [
    { label: '—', value: '' },
    { label: 'M', value: 'M' },
    { label: 'F', value: 'F' },
    { label: 'O', value: 'O' },
  ];

  constructor(
    private api: Api,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const clinicId = this.auth.currentUserValue?.clinicId;
    if (clinicId) {
      this.api.get<{ data: Doctor[] }>(`/clinics/${clinicId}/doctors`).subscribe({
        next: (res) => (this.doctors = res.data),
      });
    }
    if (id) {
      this.patientId = id;
      this.loadingPatient = true;
      this.api.get<{
        firstName: string;
        lastName: string;
        dob: string;
        gender?: 'M' | 'F' | 'O';
        contactEmail?: string;
        contactPhone?: string;
        address?: string;
        patientVisibility: 'VIS_A' | 'VIS_B';
        primaryDoctorId?: { _id: string };
      }>(`/patients/${id}`).subscribe({
        next: (p) => {
          this.firstName = p.firstName;
          this.lastName = p.lastName;
          this.dob = typeof p.dob === 'string' ? p.dob.slice(0, 10) : new Date(p.dob).toISOString().slice(0, 10);
          this.gender = p.gender ?? '';
          this.contactEmail = p.contactEmail ?? '';
          this.contactPhone = p.contactPhone ?? '';
          this.address = p.address ?? '';
          this.patientVisibility = p.patientVisibility;
          this.primaryDoctorId = (p.primaryDoctorId as { _id: string })?._id ?? '';
          this.loadingPatient = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to load patient';
          this.loadingPatient = false;
        },
      });
      this.loadRecordSummary(id);
    }
  }

  loadRecordSummary(patientId: string): void {
    this.api.get<{ visACount: number; visBCount: number; byType: Record<string, number> }>(`/patients/${patientId}/records/summary`).subscribe({
      next: (res) => (this.recordSummary = res),
      error: () => (this.recordSummary = null),
    });
  }

  get isEditMode(): boolean {
    return this.patientId != null;
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    const payload = {
      firstName: this.firstName,
      lastName: this.lastName,
      dob: this.dob,
      gender: this.gender || undefined,
      contactEmail: this.contactEmail || undefined,
      contactPhone: this.contactPhone || undefined,
      address: this.address || undefined,
      patientVisibility: this.patientVisibility,
      primaryDoctorId: this.primaryDoctorId?.trim() || '',
    };
    if (this.isEditMode) {
      this.api.patch<{ _id: string }>(`/patients/${this.patientId}`, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Patient updated', detail: 'Details saved.' });
          this.router.navigate(['/reception/patients', this.patientId]);
        },
        error: (err) => {
          const msg = err.error?.message || err.message || 'Failed to update patient';
          const detail = err.status === 404
            ? (err.error?.message || 'Patient not found. It may have been deleted.')
            : msg;
          this.error = detail;
          this.messageService.add({ severity: 'error', summary: 'Update failed', detail });
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
    } else {
      this.api
        .post<{ _id: string }>('/patients', payload)
        .subscribe({
          next: (res) => {
            this.messageService.add({ severity: 'success', summary: 'Patient registered', detail: 'Redirecting to profile…' });
            this.router.navigate(['/reception/patients', res._id]);
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to create patient';
            this.messageService.add({ severity: 'error', summary: 'Registration failed', detail: this.error });
            this.loading = false;
          },
          complete: () => {
            this.loading = false;
          },
        });
    }
  }
}
