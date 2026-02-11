import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  loading = false;

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
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const clinicId = this.auth.currentUserValue?.clinicId;
    if (clinicId) {
      this.api.get<{ data: Doctor[] }>(`/clinics/${clinicId}/doctors`).subscribe({
        next: (res) => (this.doctors = res.data),
      });
    }
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;
    this.api
      .post<{ _id: string }>('/patients', {
        firstName: this.firstName,
        lastName: this.lastName,
        dob: this.dob,
        gender: this.gender || undefined,
        contactEmail: this.contactEmail || undefined,
        contactPhone: this.contactPhone || undefined,
        address: this.address || undefined,
        patientVisibility: this.patientVisibility,
        primaryDoctorId: this.primaryDoctorId,
      })
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
