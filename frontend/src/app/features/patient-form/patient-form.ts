import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';

@Component({
  selector: 'app-patient-form',
  imports: [RouterLink, FormsModule],
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

  constructor(
    private api: Api,
    private router: Router
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
        next: (res) => this.router.navigate(['/reception/patients', res._id]),
        error: (err) => {
          this.error = err.error?.message || 'Failed to create patient';
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }
}
