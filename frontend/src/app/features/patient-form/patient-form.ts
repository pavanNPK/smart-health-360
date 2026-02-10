import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-patient-form',
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    MessageModule,
  ],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.scss',
})
export class PatientForm {
  firstName = '';
  lastName = '';
  dob = '';
  gender: 'M' | 'F' | 'O' | '' = '';
  contactEmail = '';
  contactPhone = '';
  address = '';
  isPrivatePatient = false;
  error = '';
  loading = false;

  genderOptions = [
    { label: '—', value: '' },
    { label: 'M', value: 'M' },
    { label: 'F', value: 'F' },
    { label: 'O', value: 'O' },
  ];

  constructor(
    private api: Api,
    private router: Router,
    private messageService: MessageService
  ) {}

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
        isPrivatePatient: this.isPrivatePatient,
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
